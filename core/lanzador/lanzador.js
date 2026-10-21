// Arma el comando de cada juego desde systems.json y emulators.json, comprueba que el juego, el
// emulador y el núcleo existan, ejecuta el emulador y espera a que se cierre. Los mensajes de error
// los ve el usuario en la pantalla de lanzamiento: van en su lenguaje.
import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';

import { expandirRuta } from '../configuracion.js';

export class ErrorLanzamiento extends Error {}

export function rutaNucleo(emulador, nucleo) {
  return path.join(expandirRuta(emulador.carpetaNucleos), `${nucleo}_libretro.so`);
}

// {emulador} se reemplaza por el comando del emulador (varias partes), {nucleo} por la ruta del núcleo
// y {juego} por la ruta del archivo. Sin shell de por medio: los espacios del nombre no importan.
export function armarComando(sistema, rutaJuego, emuladores) {
  const emulador = emuladores[sistema.emulador];
  if (!emulador) {
    throw new ErrorLanzamiento(`${sistema.nombreLargo} usa un emulador que no está configurado.`);
  }
  const partes = sistema.comando.flatMap((parte) => {
    if (parte === '{emulador}') return emulador.comando;
    if (parte === '{nucleo}') return [rutaNucleo(emulador, sistema.nucleo)];
    return [parte.replaceAll('{juego}', rutaJuego)];
  });
  const [programa, ...argumentos] = partes;
  return { programa, argumentos, emulador };
}

const existe = (ruta, modo = constants.F_OK) => access(ruta, modo).then(() => true, () => false);

async function enRuta(programa, entorno) {
  if (programa.includes('/')) return existe(programa, constants.X_OK);
  for (const carpeta of (entorno.PATH ?? '').split(':').filter(Boolean)) {
    if (await existe(path.join(carpeta, programa), constants.X_OK)) return true;
  }
  return false;
}

// Una app de Flathub puede estar instalada para todo el sistema o solo para el usuario.
async function flatpakInstalado(id) {
  return (await existe(`/var/lib/flatpak/app/${id}/current`))
    || existe(expandirRuta(`~/.local/share/flatpak/app/${id}/current`));
}

export async function verificar({ programa, emulador }, sistema, rutaJuego, entorno = process.env) {
  if (!(await existe(rutaJuego, constants.R_OK))) {
    throw new ErrorLanzamiento('No encuentro el archivo del juego. Quizá se movió o se borró de su carpeta.');
  }
  if (!(await enRuta(programa, entorno))) {
    throw new ErrorLanzamiento(`${emulador.nombre} no está instalado en este equipo.`);
  }
  if (emulador.flatpak && !(await flatpakInstalado(emulador.flatpak))) {
    throw new ErrorLanzamiento(`${emulador.nombre} no está instalado en este equipo.`);
  }
  if (sistema.nucleo && !(await existe(rutaNucleo(emulador, sistema.nucleo)))) {
    throw new ErrorLanzamiento(`Falta el núcleo ${sistema.nombreEmulador} de ${emulador.nombre}.`);
  }
  // Sin BIOS el emulador no se cierra: deja la pantalla en negro. Por eso se revisa antes de abrirlo.
  if (sistema.bios?.length && emulador.carpetaBios) {
    const carpeta = expandirRuta(emulador.carpetaBios);
    const hallados = await Promise.all(sistema.bios.map((archivo) => existe(path.join(carpeta, archivo))));
    if (!hallados.includes(true)) {
      throw new ErrorLanzamiento(`Falta la BIOS de ${sistema.nombreLargo}. Copia ${listaLegible(sistema.bios)} en la carpeta ${emulador.carpetaBios}.`);
    }
  }
}

const listaLegible = (archivos) => (archivos.length === 1 ? archivos[0] : `${archivos.slice(0, -1).join(', ')} o ${archivos.at(-1)}`);

// Un emulador que sale con error en los primeros segundos no llegó a abrir el juego. Más tarde, un
// código distinto de cero puede ser solo la forma de cerrar de ese emulador, y no se avisa.
export const CIERRE_TEMPRANO_MS = 8000;

export function falloAlAbrir({ codigo, duracionMs }) {
  return codigo !== 0 && codigo !== null && duracionMs < CIERRE_TEMPRANO_MS;
}

// Ejecuta el emulador y espera a que se cierre. Devuelve el código de salida y cuánto duró.
export function ejecutar({ programa, argumentos }) {
  return new Promise((listo, fallo) => {
    const inicio = Date.now();
    const proceso = spawn(programa, argumentos, { stdio: 'ignore' });
    proceso.once('error', () => fallo(new ErrorLanzamiento('No se pudo abrir el emulador.')));
    proceso.once('exit', (codigo, senal) => listo({ codigo, senal, duracionMs: Date.now() - inicio }));
  });
}

// Para el registro: el comando como se escribiría en una terminal.
export function comandoLegible({ programa, argumentos }) {
  return [programa, ...argumentos].map((parte) => (/[\s"'\\$]/.test(parte) ? `'${parte.replaceAll("'", "'\\''")}'` : parte)).join(' ');
}
