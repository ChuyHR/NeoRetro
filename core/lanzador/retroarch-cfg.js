// Ajusta claves de retroarch.cfg antes de abrir un juego: lo que se eligió en Configuración (la
// combinación para salir, la del menú del juego y continuar donde te quedaste). Solo toca esas claves y
// no reescribe el archivo si ya estaban así.
// RetroArch está cerrado en ese momento (Neo Arcade no abre dos juegos a la vez), así que no las pisa.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Valores de input_quit_gamepad_combo en RetroArch.
export const COMBOS_SALIR = {
  'select-start': '4', // Start + Select
  'mantener-start': '7', // mantener Start dos segundos
  'lr-select-start': '3', // L1 + R1 + Start + Select
};

// Valores de input_menu_toggle_gamepad_combo (la misma lista de RetroArch): abre su menú, que pausa el
// juego y deja guardar, cargar o reiniciar.
export const COMBOS_MENU = {
  'mantener-select': '8', // mantener Select dos segundos
  ninguno: '0',
};

// Las claves de retroarch.cfg que dependen de Configuración. Continuar donde te quedaste: al cerrar,
// RetroArch guarda un estado automático y, al volver a abrir el juego, lo carga.
export function clavesDeConfiguracion(opciones = {}) {
  const continuar = opciones.continuar === false ? 'false' : 'true';
  return {
    input_quit_gamepad_combo: COMBOS_SALIR[opciones.salir] ?? COMBOS_SALIR['select-start'],
    input_menu_toggle_gamepad_combo: COMBOS_MENU[opciones.menu] ?? COMBOS_MENU['mantener-select'],
    savestate_auto_save: continuar,
    savestate_auto_load: continuar,
    // «Cerrar contenido» del menú del juego: con 0, RetroArch se queda en su menú principal sin juego y
    // con el mando no hay cómo volver a Neo Arcade (probado en la MP80). 2 cierra RetroArch cuando el
    // juego se abrió desde la línea de comandos, que es como lo abre Neo Arcade.
    quit_on_close_content: '2',
  };
}

export function conClaves(texto, claves) {
  let resultado = texto;
  for (const [clave, valor] of Object.entries(claves)) {
    const linea = `${clave} = "${valor}"`;
    const patron = new RegExp(`^${clave} = .*$`, 'm');
    resultado = patron.test(resultado) ? resultado.replace(patron, linea) : `${resultado}${resultado && !resultado.endsWith('\n') ? '\n' : ''}${linea}\n`;
  }
  return resultado;
}

// Quita del texto las líneas de esas claves.
export function sinClaves(texto, claves) {
  return claves.reduce((resultado, clave) => resultado.replace(new RegExp(`^${clave} = .*\\n?`, 'm'), ''), texto);
}

// Lo que valen unas claves en retroarch.cfg (null si la clave no está). RetroArch guarda al cerrar lo
// que trae un --appendconfig como si fuera suyo (visual-enhancement-lab/probar-fallas.sh, caso 5): con
// esto, Neo Arcade lo devuelve después del juego.
export async function leerClaves(archivo, claves) {
  const texto = await readFile(archivo, 'utf8').catch(() => '');
  return Object.fromEntries(claves.map((clave) => [clave, texto.match(new RegExp(`^${clave} = "(.*)"$`, 'm'))?.[1] ?? null]));
}

export async function restaurarClaves(archivo, previas) {
  const antes = await readFile(archivo, 'utf8').catch(() => null);
  if (antes === null) return false;
  const presentes = Object.fromEntries(Object.entries(previas).filter(([, valor]) => valor !== null));
  const ausentes = Object.keys(previas).filter((clave) => previas[clave] === null);
  const despues = sinClaves(conClaves(antes, presentes), ausentes);
  if (despues === antes) return false;
  await writeFile(archivo, despues);
  return true;
}

export async function ajustarRetroArch(archivo, claves) {
  const antes = await readFile(archivo, 'utf8').catch(() => '');
  const despues = conClaves(antes, claves);
  if (despues === antes) return false;
  await mkdir(path.dirname(archivo), { recursive: true });
  await writeFile(archivo, despues);
  return true;
}
