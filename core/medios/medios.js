// Medios y datos de cada juego: carátula, captura, vídeo, nombre, descripción, año, desarrollador,
// género y jugadores. Salen de dos lugares, en este orden:
//   1. El gamelist.xml del sistema, en media/<sistema>/ o, como lo deja Skraper por omisión, en
//      roms/<sistema>/. Sus rutas de medios son relativas a la carpeta del propio gamelist.
//   2. Las carpetas comunes de media/<sistema>/ (covers, screenshots, videos…), buscando un archivo con el
//      mismo nombre que el juego. Así funcionan también los medios sin gamelist.
// En EmulationStation, <thumbnail> suele ser la caja y <image> la captura; si solo hay <image>, se usa
// como carátula. Cada medio se entrega como una dirección medio://, que sirve core/medios/servidor.js.
import { readdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { anioDe, leerGamelist, rutaRelativa } from './gamelist.js';

const IMAGENES = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const VIDEOS = new Set(['.mp4', '.webm', '.mkv', '.ogv', '.mov']);
const CARPETAS = {
  caratula: ['covers', 'box2dfront', 'boxart', 'box', 'thumbnails', 'images'],
  captura: ['screenshots', 'snaps', 'snap', 'titlescreens'],
  video: ['videos', 'video', 'snaps'],
};

const sinExtension = (archivo) => path.basename(archivo, path.extname(archivo)).toLowerCase();

// Dirección medio:// de un archivo, o null si queda fuera de las dos carpetas que se pueden servir.
export function direccionDe(ruta, { carpetaMedios, carpetaRoms }) {
  for (const [raiz, carpeta] of [['medios', carpetaMedios], ['roms', carpetaRoms]]) {
    const relativa = path.relative(carpeta, ruta);
    if (relativa && !relativa.startsWith('..') && !path.isAbsolute(relativa)) {
      return `medio://${raiz}/${relativa.split(path.sep).map(encodeURIComponent).join('/')}`;
    }
  }
  return null;
}

async function leerSiExiste(archivo) {
  return readFile(archivo, 'utf8').catch(() => null);
}

// Un índice por sistema: lo del gamelist por ruta de juego y los archivos de cada carpeta común por
// nombre. Se arma una vez por lectura de la biblioteca: un readdir por carpeta, no uno por juego.
export async function indiceDelSistema(sistema, configuracion) {
  const { carpetaMedios, carpetaRoms } = configuracion;
  const medios = path.join(carpetaMedios, sistema.carpeta);
  const gamelist = new Map();
  for (const carpeta of [medios, path.join(carpetaRoms, sistema.carpeta)]) {
    const xml = await leerSiExiste(path.join(carpeta, 'gamelist.xml'));
    if (xml === null) continue;
    for (const juego of leerGamelist(xml)) gamelist.set(rutaRelativa(juego.path, sistema.carpeta), { ...juego, base: carpeta });
    break; // el de media/ manda; el de roms/ solo se usa si no hay otro
  }
  const archivos = {};
  for (const subcarpeta of new Set(Object.values(CARPETAS).flat())) {
    const nombres = await readdir(path.join(medios, subcarpeta)).catch(() => []);
    archivos[subcarpeta] = new Map();
    for (const nombre of nombres) {
      const extension = path.extname(nombre).toLowerCase();
      if (IMAGENES.has(extension) || VIDEOS.has(extension)) {
        const clave = `${sinExtension(nombre)}|${VIDEOS.has(extension) ? 'video' : 'imagen'}`;
        archivos[subcarpeta].set(clave, path.join(medios, subcarpeta, nombre));
      }
    }
  }
  return { gamelist, archivos };
}

function enCarpetas(indice, tipo, archivo) {
  const clave = `${sinExtension(archivo)}|${tipo === 'video' ? 'video' : 'imagen'}`;
  for (const subcarpeta of CARPETAS[tipo]) {
    const encontrado = indice.archivos[subcarpeta]?.get(clave);
    if (encontrado) return encontrado;
  }
  return null;
}

// Lo que el gamelist y las carpetas dicen de un juego. Los medios del gamelist no se comprueban en
// disco: si alguno falta, la interfaz pone la portada de reemplazo (nunca una imagen rota).
export function datosDelJuego(indice, archivo, configuracion) {
  const entrada = indice?.gamelist.get(archivo) ?? null;
  const delGamelist = (campo) => {
    const valor = entrada?.[campo]?.replaceAll('\\', '/');
    if (!valor) return null;
    return valor.startsWith('~/') ? path.join(os.homedir(), valor.slice(2)) : path.resolve(entrada.base, valor);
  };
  const caratula = delGamelist(entrada?.thumbnail ? 'thumbnail' : 'image') ?? (indice ? enCarpetas(indice, 'caratula', archivo) : null);
  const captura = (entrada?.thumbnail ? delGamelist('image') : null) ?? (indice ? enCarpetas(indice, 'captura', archivo) : null);
  const video = delGamelist('video') ?? (indice ? enCarpetas(indice, 'video', archivo) : null);
  const direccion = (ruta) => (ruta ? direccionDe(ruta, configuracion) : null);
  return {
    titulo: entrada?.name || null,
    descripcion: entrada?.desc || '',
    anio: anioDe(entrada?.releasedate),
    desarrollador: entrada?.developer || null,
    genero: entrada?.genre || null,
    jugadores: entrada?.players || null,
    caratula: direccion(caratula),
    captura: direccion(captura),
    video: direccion(video),
  };
}

export async function leerMedios(configuracion) {
  const indices = new Map();
  await Promise.all(configuracion.sistemas.map(async (sistema) => {
    indices.set(sistema.id, await indiceDelSistema(sistema, configuracion));
  }));
  return indices;
}
