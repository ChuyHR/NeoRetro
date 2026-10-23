// Perfiles de imagen para RetroArch (docs/visual-profiles.md), con los valores que ganaron en el
// laboratorio (docs/visual-enhancement-testing.md). Antes de abrir un juego se elige su perfil (por
// juego, por sistema o el predeterminado), se escribe en un .cfg aparte y se agrega al comando con
// --appendconfig y --set-shader: el retroarch.cfg del usuario no se toca.
// La mejora nunca impide jugar: un perfil que no existe, una clave inválida o un shader que no está
// dejan el comando como era, y el motivo queda en el registro.
import { constants } from 'node:fs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { expandirRuta } from '../configuracion.js';

const CLAVE = /^[a-z0-9_]+$/;
// Estos drivers de video de RetroArch cargan shaders slang; gl carga GLSL. Con el que no le toca,
// RetroArch ignora el shader y usa el de fábrica (visual-enhancement-testing.md, compatibilidad).
const CON_SLANG = new Set(['vulkan', 'glcore', 'd3d10', 'd3d11', 'd3d12', 'metal']);
const existe = (ruta) => access(ruta, constants.R_OK).then(() => true, () => false);

// El video_driver del retroarch.cfg del usuario, o null si no se sabe (RetroArch usará gl).
export async function driverDeVideo(emulador) {
  if (!emulador?.archivoConfiguracion) return null;
  const texto = await readFile(expandirRuta(emulador.archivoConfiguracion), 'utf8').catch(() => '');
  return texto.match(/^video_driver = "(.*)"$/m)?.[1] ?? null;
}

// El perfil que le toca a un juego: el suyo, el de su sistema o el predeterminado. null si la mejora
// está apagada o no hay configuración.
export function elegirPerfil(visual, sistemaId, juegoId) {
  if (!visual?.activo) return null;
  return visual.porJuego?.[juegoId] ?? visual.porSistema?.[sistemaId] ?? visual.predeterminado ?? null;
}

// Los ajustes del perfil como líneas de un .cfg de RetroArch. null si alguno no es válido: una clave
// con otros caracteres o un valor con comillas o saltos de línea podría meter otras claves.
export function lineasCfg(ajustes) {
  const lineas = [];
  for (const [clave, valor] of Object.entries(ajustes ?? {})) {
    if (!CLAVE.test(clave)) return null;
    if (!['string', 'number', 'boolean'].includes(typeof valor)) return null;
    const texto = String(valor);
    if (/["\n\r]/.test(texto)) return null;
    lineas.push(`${clave} = "${texto}"`);
  }
  return lineas;
}

// Busca el shader del perfil en las carpetas del equipo donde está el de RetroArch (en Flatpak, dentro
// de la app). Devuelve la ruta como la ve RetroArch, o null si no está.
export async function ubicarShader(shader, emulador) {
  if (!shader || shader.split('/').includes('..') || path.isAbsolute(shader)) return null;
  const { enEmulador, enEquipo = [] } = emulador.shaders ?? {};
  if (!enEmulador) return null;
  for (const carpeta of enEquipo) {
    if (await existe(path.join(expandirRuta(carpeta), shader))) return path.posix.join(enEmulador, shader);
  }
  return null;
}

// Prepara el perfil de un juego. Devuelve { perfil, argumentos, claves, motivo }: sin argumentos, el
// juego se abre como siempre; claves son las de retroarch.cfg que el perfil cambia (hay que
// devolverlas al cerrar). carpeta es donde se escribe el .cfg del perfil (la de datos de la app).
export async function prepararVisual(visual, { sistemaId, juegoId, emulador, carpeta }) {
  const nombre = elegirPerfil(visual, sistemaId, juegoId);
  if (!nombre) return { perfil: null, argumentos: [], claves: [], motivo: 'mejora visual apagada' };
  if (!emulador?.perfilesVisuales) return { perfil: nombre, argumentos: [], claves: [], motivo: 'el emulador no usa perfiles' };
  const perfil = visual.perfiles?.[nombre];
  if (!perfil) return { perfil: nombre, argumentos: [], claves: [], motivo: `no existe el perfil «${nombre}»` };
  const lineas = lineasCfg(perfil.retroarch);
  if (!lineas) return { perfil: nombre, argumentos: [], claves: [], motivo: `el perfil «${nombre}» tiene un ajuste inválido` };
  let shader = '';
  if (perfil.shader || perfil.shaderSlang) {
    const driver = await driverDeVideo(emulador);
    const buscado = CON_SLANG.has(driver) ? perfil.shaderSlang : perfil.shader;
    if (!buscado) return { perfil: nombre, argumentos: [], claves: [], motivo: `el perfil no tiene shader para el driver ${driver}` };
    shader = await ubicarShader(buscado, emulador);
    if (!shader) return { perfil: nombre, argumentos: [], claves: [], motivo: `no está el shader ${buscado}` };
  }
  if (!lineas.length && !shader) return { perfil: nombre, argumentos: [], claves: [], motivo: 'perfil sin cambios' };
  const archivo = path.join(carpeta, 'retroarch-perfil-visual.cfg');
  await mkdir(carpeta, { recursive: true });
  await writeFile(archivo, `# Perfil visual «${nombre}», escrito por Neo Arcade antes de abrir el juego.\n${lineas.join('\n')}\n`);
  // RetroArch 1.22 no carga el shader desde un .cfg; va por la línea de comandos. Vacío, apaga además
  // los presets automáticos, para que la imagen sea la del perfil.
  return { perfil: nombre, argumentos: ['--appendconfig', archivo, `--set-shader=${shader}`], claves: Object.keys(perfil.retroarch ?? {}), motivo: '' };
}

// El comando con los argumentos del perfil justo después del emulador y antes de los del sistema.
export function conArgumentos(comando, extra) {
  if (!extra.length) return comando;
  const desde = comando.emulador.comando.length - 1;
  const argumentos = [...comando.argumentos.slice(0, desde), ...extra, ...comando.argumentos.slice(desde)];
  return { ...comando, argumentos };
}
