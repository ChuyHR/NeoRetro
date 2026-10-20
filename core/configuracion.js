// Lee config/systems.json, config/emulators.json y config/biblioteca.json. En desarrollo y en las
// pruebas, NEO_ARCADE_CONFIG cambia la carpeta de configuración y NEO_ARCADE_ROMS la de juegos, sin
// tocar los archivos ni la carpeta roms/ del usuario.
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Una ruta relativa se toma desde la raíz de la app; ~ es la carpeta del usuario.
export function expandirRuta(ruta, base = RAIZ) {
  if (ruta === '~' || ruta.startsWith('~/')) return path.join(os.homedir(), ruta.slice(1));
  return path.isAbsolute(ruta) ? ruta : path.join(base, ruta);
}

async function leerJson(carpeta, nombre) {
  return JSON.parse(await readFile(path.join(carpeta, nombre), 'utf8'));
}

export async function cargarConfiguracion(entorno = process.env) {
  const carpeta = entorno.NEO_ARCADE_CONFIG ? expandirRuta(entorno.NEO_ARCADE_CONFIG) : path.join(RAIZ, 'config');
  const [{ sistemas }, { emuladores }, biblioteca] = await Promise.all([
    leerJson(carpeta, 'systems.json'),
    leerJson(carpeta, 'emulators.json'),
    leerJson(carpeta, 'biblioteca.json'),
  ]);
  return {
    sistemas,
    emuladores,
    carpetaRoms: expandirRuta(entorno.NEO_ARCADE_ROMS ?? biblioteca.roms),
    carpetaMedios: expandirRuta(biblioteca.medios),
  };
}
