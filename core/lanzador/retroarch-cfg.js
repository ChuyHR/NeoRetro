// Ajusta claves de retroarch.cfg antes de abrir un juego: hoy, la combinación del mando para salir que
// se eligió en Configuración. Solo toca esas claves y no reescribe el archivo si ya estaban así.
// RetroArch está cerrado en ese momento (Neo Arcade no abre dos juegos a la vez), así que no las pisa.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Valores de input_quit_gamepad_combo en RetroArch.
export const COMBOS_SALIR = {
  'select-start': '4', // Start + Select
  'mantener-start': '7', // mantener Start dos segundos
  'lr-select-start': '3', // L1 + R1 + Start + Select
};

export function conClaves(texto, claves) {
  let resultado = texto;
  for (const [clave, valor] of Object.entries(claves)) {
    const linea = `${clave} = "${valor}"`;
    const patron = new RegExp(`^${clave} = .*$`, 'm');
    resultado = patron.test(resultado) ? resultado.replace(patron, linea) : `${resultado}${resultado && !resultado.endsWith('\n') ? '\n' : ''}${linea}\n`;
  }
  return resultado;
}

export async function ajustarRetroArch(archivo, claves) {
  const antes = await readFile(archivo, 'utf8').catch(() => '');
  const despues = conClaves(antes, claves);
  if (despues === antes) return false;
  await mkdir(path.dirname(archivo), { recursive: true });
  await writeFile(archivo, despues);
  return true;
}
