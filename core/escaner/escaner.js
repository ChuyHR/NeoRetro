// Recorre roms/<sistema>/, se queda con los archivos de las extensiones del sistema y limpia sus
// nombres. El resultado va a una caché en la carpeta de datos del usuario, y un sistema solo se vuelve
// a leer si cambió alguna de sus carpetas: agregar o quitar un archivo cambia la fecha de
// modificación de la carpeta que lo contiene.
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const VERSION_CACHE = 2; // 2: los noSonJuegos de systems.json ya no se listan
const PROFUNDIDAD = 3; // subcarpetas, para juegos de varios archivos (psx/Juego/Juego.cue)
const DISCO = /^(disc|disk|disco|cd)\s*\d/i;

// «Street_Fighter_II_(USA) [!].sfc» → «Street Fighter II». Se conserva el número de disco para que
// los juegos de varios discos no queden con el mismo nombre.
export function limpiarNombre(archivo) {
  const base = path.parse(archivo).name;
  const limpio = base
    .replace(/\s*[([]([^)\]]*)[)\]]/g, (_todo, dentro) => (DISCO.test(dentro.trim()) ? ` (${dentro.trim()})` : ''))
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return limpio || base;
}

async function recorrer(raiz, extensiones, ocultos) {
  const juegos = [];
  const carpetas = [];
  async function visitar(relativa, nivel) {
    const absoluta = path.join(raiz, relativa);
    let entradas;
    try {
      const datos = await stat(absoluta);
      carpetas.push({ ruta: absoluta, mtimeMs: datos.mtimeMs });
      entradas = await readdir(absoluta, { withFileTypes: true });
    } catch {
      if (nivel === 0) carpetas.push({ ruta: absoluta, mtimeMs: null }); // la carpeta del sistema no existe
      return;
    }
    for (const entrada of entradas) {
      if (entrada.name.startsWith('.')) continue;
      const archivo = path.posix.join(relativa.split(path.sep).join('/'), entrada.name);
      if (entrada.isDirectory()) {
        if (nivel < PROFUNDIDAD) await visitar(path.join(relativa, entrada.name), nivel + 1);
      } else if (extensiones.has(path.extname(entrada.name).toLowerCase()) && !ocultos.has(entrada.name.toLowerCase())) {
        juegos.push({ archivo, titulo: limpiarNombre(entrada.name) });
      }
    }
  }
  await visitar('', 0);
  juegos.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' }) || a.archivo.localeCompare(b.archivo));
  return { juegos, carpetas };
}

export async function escanearSistema(carpetaRoms, sistema) {
  const extensiones = new Set(sistema.extensiones.map((extension) => extension.toLowerCase()));
  const ocultos = new Set((sistema.noSonJuegos ?? []).map((nombre) => nombre.toLowerCase()));
  const { juegos, carpetas } = await recorrer(path.join(carpetaRoms, sistema.carpeta), extensiones, ocultos);
  return { extensiones: [...extensiones].sort(), carpetas, juegos };
}

async function sinCambios(carpetas) {
  for (const { ruta, mtimeMs } of carpetas) {
    try {
      if ((await stat(ruta)).mtimeMs !== mtimeMs) return false;
    } catch {
      if (mtimeMs !== null) return false;
    }
  }
  return true;
}

async function leerCache(archivo, carpetaRoms) {
  try {
    const cache = JSON.parse(await readFile(archivo, 'utf8'));
    return cache.version === VERSION_CACHE && cache.carpetaRoms === carpetaRoms ? cache : null;
  } catch {
    return null;
  }
}

const mismasExtensiones = (guardadas, sistema) =>
  guardadas.join() === [...new Set(sistema.extensiones.map((extension) => extension.toLowerCase()))].sort().join();

// Devuelve la biblioteca y cuántos sistemas tuvo que leer del disco (los demás salieron de la caché).
export async function escanearBiblioteca({ sistemas, carpetaRoms }, archivoCache) {
  const cache = await leerCache(archivoCache, carpetaRoms);
  const biblioteca = { version: VERSION_CACHE, carpetaRoms, sistemas: {} };
  let leidos = 0;
  for (const sistema of sistemas) {
    const previo = cache?.sistemas?.[sistema.id];
    if (previo && mismasExtensiones(previo.extensiones, sistema) && (await sinCambios(previo.carpetas))) {
      biblioteca.sistemas[sistema.id] = previo;
    } else {
      biblioteca.sistemas[sistema.id] = await escanearSistema(carpetaRoms, sistema);
      leidos += 1;
    }
  }
  if (leidos > 0 || !cache) {
    await mkdir(path.dirname(archivoCache), { recursive: true });
    await writeFile(archivoCache, `${JSON.stringify(biblioteca, null, 1)}\n`);
  }
  return { biblioteca, leidos };
}
