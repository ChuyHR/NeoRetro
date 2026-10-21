// Lee config/systems.json, config/emulators.json, config/biblioteca.json, config/gamepad-map.json y
// config/sistema.json.
// NEO_ARCADE_CONFIG señala una carpeta de configuración propia: en la consola instalada es
// ~/NeoRetro/config, y en las pruebas una carpeta aparte. Cada archivo se busca primero ahí y, si no
// está, en la de la app; así basta con copiar ahí el que se quiera cambiar, y los demás siguen al día
// con la app. NEO_ARCADE_ROMS, NEO_ARCADE_MEDIOS y NEO_ARCADE_DATOS cambian, en desarrollo y en las
// pruebas, las carpetas de juegos, de medios y de datos sin tocar las del usuario.
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
  const deLaApp = path.join(RAIZ, 'config');
  const carpeta = entorno.NEO_ARCADE_CONFIG ? expandirRuta(entorno.NEO_ARCADE_CONFIG) : deLaApp;
  // Solo si el archivo no está: uno con un error se avisa, no se cambia en silencio por el de la app.
  const leer = (nombre) => leerJson(carpeta, nombre)
    .catch((error) => (error.code === 'ENOENT' && carpeta !== deLaApp ? leerJson(deLaApp, nombre) : Promise.reject(error)));
  const [{ sistemas }, { emuladores }, biblioteca, mapaMando, sistema] = await Promise.all([
    leer('systems.json'),
    leer('emulators.json'),
    leer('biblioteca.json'),
    leer('gamepad-map.json'),
    leer('sistema.json'),
  ]);
  return {
    sistemas,
    emuladores,
    mapaMando,
    sistema,
    carpetaRoms: expandirRuta(entorno.NEO_ARCADE_ROMS ?? biblioteca.roms),
    carpetaMedios: expandirRuta(entorno.NEO_ARCADE_MEDIOS ?? biblioteca.medios),
    // Opcionales: dónde va lo que se recuerda (datos-usuario.json, mandos.json) y el registro. Sin
    // ellas, en la carpeta de datos de la app (carpetasDelUsuario).
    carpetaDatos: biblioteca.datos ? expandirRuta(biblioteca.datos) : null,
    carpetaRegistros: biblioteca.registros ? expandirRuta(biblioteca.registros) : null,
  };
}

// Dónde se guarda lo que se recuerda y dónde va el registro. carpetaApp es la carpeta de datos de
// Electron. Con NEO_ARCADE_DATOS (las pruebas) todo va ahí, aunque la configuración diga otra cosa.
export function carpetasDelUsuario(configuracion, carpetaApp, entorno = process.env) {
  if (entorno.NEO_ARCADE_DATOS) {
    const datos = expandirRuta(entorno.NEO_ARCADE_DATOS);
    return { datos, registros: path.join(datos, 'registros') };
  }
  return {
    datos: configuracion.carpetaDatos ?? carpetaApp,
    registros: configuracion.carpetaRegistros ?? path.join(carpetaApp, 'registros'),
  };
}
