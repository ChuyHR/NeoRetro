// Diagnóstico del equipo: qué emuladores hay y en qué versión, dónde tiene RetroArch de verdad sus
// núcleos y sus BIOS (leído de su retroarch.cfg, no supuesto), qué núcleos y BIOS faltan, si las
// carpetas de juegos existen y se pueden leer, si los emuladores de Flathub alcanzan esas carpetas y qué
// mandos están conectados. No instala, no borra ni mueve nada; lo único que escribe es la caché de la
// biblioteca, como la app al abrir.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { access, readdir, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { expandirRuta } from './configuracion.js';
import { escanearBiblioteca } from './escaner/escaner.js';
import { archivoDeSistema } from './lanzador/lanzador.js';
import { revisarJuegos } from './revision-juegos.js';

const ejecutar = promisify(execFile);
const existe = (ruta, modo = constants.F_OK) => access(ruta, modo).then(() => true, () => false);

// Huellas MD5 de las BIOS que reconocen los núcleos (documentación de libretro). Una BIOS con otra huella
// puede funcionar, pero conviene saberlo: suele ser una copia dañada o de otra región.
export const BIOS_CONOCIDAS = {
  'scph5500.bin': '8dd7d5296a650fac7319bce665a6a53c',
  'scph5501.bin': '490f666e1afb15b7362b406ed1cea246',
  'scph5502.bin': '32736f17079d0b2b7024407c39bd3050',
  'bios_CD_U.bin': '2efd74e3232ff260e371b99f84024f7f',
  'bios_CD_E.bin': 'e66fa1dc5820d254611fdcdba0662372',
  'bios_CD_J.bin': '278a9397d192149e84e820ac621a8edd',
};

async function huellas(ruta) {
  const datos = await readFile(ruta);
  return {
    md5: createHash('md5').update(datos).digest('hex'),
    sha256: createHash('sha256').update(datos).digest('hex'),
  };
}

// Valor de una clave de retroarch.cfg, con ~ resuelto.
export function claveDeCfg(texto, clave) {
  const valor = new RegExp(`^${clave}\\s*=\\s*"([^"]*)"`, 'm').exec(texto)?.[1];
  return valor ? expandirRuta(valor) : null;
}

async function flatpak(id) {
  try {
    const { stdout } = await ejecutar('flatpak', ['info', id]);
    const version = /^\s*(?:Version|Versión):\s*(.+)$/m.exec(stdout)?.[1]?.trim() ?? '?';
    const { stdout: permisos } = await ejecutar('flatpak', ['info', '--show-permissions', id]);
    const carpetas = /^filesystems=(.*)$/m.exec(permisos)?.[1]?.split(';').filter(Boolean) ?? [];
    return { instalado: true, version, carpetas };
  } catch {
    return { instalado: false };
  }
}

// ¿Puede la app de Flathub leer esta ruta? «host» y «home» cubren la carpeta personal; /tmp nunca.
export function flatpakAlcanza(carpetas, ruta) {
  if (ruta.startsWith('/tmp/')) return false;
  const enCasa = ruta.startsWith(os.homedir() + path.sep);
  return carpetas.some((carpeta) => {
    const limpia = carpeta.replace(/:(ro|rw|create)$/, '');
    if (limpia === 'host' || (limpia === 'home' && enCasa)) return true;
    const absoluta = limpia.startsWith('~/') ? path.join(os.homedir(), limpia.slice(2)) : limpia;
    return absoluta.startsWith('/') && ruta.startsWith(absoluta);
  });
}

// También lo usa la app al arrancar, para dejar en el registro qué emuladores encontró.
export async function detectarEmuladores(configuracion) {
  const resultado = [];
  for (const [id, emulador] of Object.entries(configuracion.emuladores)) {
    if (!emulador.comando.length) continue; // los ports se ejecutan solos
    const detalle = { id, nombre: emulador.nombre, tipo: emulador.flatpak ? 'Flathub' : 'programa' };
    if (emulador.flatpak) Object.assign(detalle, await flatpak(emulador.flatpak));
    else detalle.instalado = await existe(emulador.comando[0], constants.X_OK);
    if (id === 'retroarch' && emulador.archivoConfiguracion) {
      const archivo = expandirRuta(emulador.archivoConfiguracion);
      const texto = await readFile(archivo, 'utf8').catch(() => '');
      detalle.configuracion = texto ? archivo : null;
      detalle.nucleos = claveDeCfg(texto, 'libretro_directory') ?? expandirRuta(emulador.carpetaNucleos);
      detalle.bios = claveDeCfg(texto, 'system_directory') ?? expandirRuta(emulador.carpetaBios);
      detalle.perfilesMando = claveDeCfg(texto, 'joypad_autoconfig_dir');
    }
    resultado.push(detalle);
  }
  return resultado;
}

async function nucleos(configuracion, carpetaNucleos) {
  const vistos = new Map();
  for (const sistema of configuracion.sistemas) {
    if (!sistema.nucleo || vistos.has(sistema.nucleo)) continue;
    vistos.set(sistema.nucleo, await existe(path.join(carpetaNucleos, `${sistema.nucleo}_libretro.so`)));
  }
  return [...vistos].map(([nucleo, presente]) => ({ nucleo, presente }));
}

async function bios(configuracion, carpetaBios) {
  const resultado = [];
  for (const sistema of configuracion.sistemas.filter(({ bios: lista }) => lista?.length)) {
    const archivos = [];
    for (const nombre of sistema.bios) {
      const ruta = path.join(carpetaBios, nombre);
      if (!(await existe(ruta))) {
        archivos.push({ nombre, presente: false });
        continue;
      }
      const { md5, sha256 } = await huellas(ruta);
      archivos.push({ nombre, presente: true, sha256, reconocida: BIOS_CONOCIDAS[nombre] ? BIOS_CONOCIDAS[nombre] === md5 : null });
    }
    resultado.push({ id: sistema.id, sistema: sistema.nombreLargo, carpeta: carpetaBios, archivos, lista: archivos.some(({ presente }) => presente) });
  }
  return resultado;
}

async function carpetasDeJuegos(configuracion, biblioteca, carpetaBios) {
  const resultado = [];
  for (const sistema of configuracion.sistemas) {
    const carpeta = path.join(configuracion.carpetaRoms, sistema.carpeta);
    const hay = await existe(carpeta);
    const legible = hay && await existe(carpeta, constants.R_OK | constants.X_OK);
    resultado.push({ sistema: sistema.nombreLargo, carpeta, existe: hay, legible, juegos: biblioteca.sistemas[sistema.id]?.juegos.length ?? 0 });
  }
  // Neo Geo: FBNeo necesita neogeo.zip junto a los juegos o en su carpeta de BIOS.
  const neogeo = configuracion.sistemas.find(({ id }) => id === 'neogeo');
  const neogeoZip = neogeo ? Boolean(await archivoDeSistema('neogeo.zip', path.join(configuracion.carpetaRoms, neogeo.carpeta), carpetaBios)) : null;
  return { carpetas: resultado, neogeoZip };
}

async function mandos() {
  const lista = [];
  const nodos = await readdir('/sys/class/input').catch(() => []);
  for (const nodo of nodos.filter((nombre) => nombre.startsWith('event'))) {
    const base = `/sys/class/input/${nodo}/device`;
    const teclas = (await readFile(`${base}/capabilities/key`, 'utf8').catch(() => '')).trim().split(/\s+/).reverse();
    // BTN_JOYSTICK (0x120) a BTN_THUMBR (0x13e) viven en la palabra 4 de 64 bits (bits 32 a 62).
    const palabra = BigInt(`0x${teclas[4] ?? '0'}`);
    if (!(palabra >> 32n)) continue;
    lista.push({ dispositivo: nodo, nombre: (await readFile(`${base}/name`, 'utf8')).trim() });
  }
  return lista;
}

// revisar: también revisa cada juego (core/revision-juegos.js). Lee los archivos, así que tarda más.
export async function diagnosticar(configuracion, carpetaDatos, { revisar = false } = {}) {
  const lista = await detectarEmuladores(configuracion);
  const retroarch = lista.find(({ id }) => id === 'retroarch');
  const flatpakRA = retroarch?.carpetas ?? [];
  const { biblioteca } = await escanearBiblioteca(configuracion, path.join(carpetaDatos, 'biblioteca.json'));
  const juegos = await carpetasDeJuegos(configuracion, biblioteca, retroarch?.bios);
  const listaBios = retroarch?.bios ? await bios(configuracion, retroarch.bios) : [];
  const biosPorSistema = new Map(listaBios.map(({ id, lista: hay }) => [id, hay]));
  return {
    emuladores: lista,
    nucleos: retroarch?.nucleos ? await nucleos(configuracion, retroarch.nucleos) : [],
    bios: listaBios,
    juegos,
    revision: revisar ? await revisarJuegos(configuracion, biblioteca, { biosPorSistema, carpetaBios: retroarch?.bios }) : null,
    alcanceFlatpak: retroarch?.instalado ? flatpakAlcanza(flatpakRA, configuracion.carpetaRoms) : null,
    medios: { carpeta: configuracion.carpetaMedios, existe: await existe(configuracion.carpetaMedios) },
    mandos: await mandos(),
    datos: await stat(path.join(carpetaDatos, 'datos-usuario.json')).then(() => path.join(carpetaDatos, 'datos-usuario.json'), () => null),
  };
}
