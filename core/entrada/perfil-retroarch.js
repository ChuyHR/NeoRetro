// Perfil de mando de RetroArch (autoconfig) para un mando cuyo mapeo conoce Neo Arcade, para que el
// mando sirva igual dentro de los juegos. RetroArch numera los botones y los ejes de cada mando a su
// manera (controlador udev de RetroArch): aquí se reproduce esa numeración.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BTN_JOYSTICK = 0x120;
const ABS_MISC = 0x28;
const CRUCETAS = { 16: 0, 17: 0, 18: 1, 19: 1, 20: 2, 21: 2, 22: 3, 23: 3 }; // ABS_HAT0X…ABS_HAT3Y

// El mando de RetroArch (RetroPad) nombra los botones por posición, como el de Super Nintendo: B es el
// de abajo, A el de la derecha, Y el de la izquierda y X el de arriba. En Xbox son A, B, X y Y.
const RETROPAD = {
  a: 'b', b: 'a', x: 'y', y: 'x', lb: 'l', rb: 'r', lt: 'l2', rt: 'r2', view: 'select', menu: 'start',
  l3: 'l3', r3: 'r3', arriba: 'up', abajo: 'down', izquierda: 'left', derecha: 'right',
};

// Botones: primero los códigos desde BTN_JOYSTICK en orden, luego los menores. Ejes: del 0 a ABS_MISC
// sin las crucetas, solo los que tienen rango. Así los cuenta udev_joypad.c de RetroArch.
export function indicesRetroArch({ botones = [], ejes = {} }) {
  const altos = botones.filter((codigo) => codigo >= BTN_JOYSTICK).sort((a, b) => a - b);
  const bajos = botones.filter((codigo) => codigo < BTN_JOYSTICK).sort((a, b) => a - b);
  const conRango = Object.entries(ejes)
    .map(([codigo, rango]) => [Number(codigo), rango])
    .filter(([codigo, [minimo, maximo]]) => codigo < ABS_MISC && !(codigo in CRUCETAS) && maximo > minimo)
    .map(([codigo]) => codigo)
    .sort((a, b) => a - b);
  return {
    boton: new Map([...altos, ...bajos].map((codigo, indice) => [codigo, indice])),
    eje: new Map(conRango.map((codigo, indice) => [codigo, indice])),
  };
}

export function textoPerfil(info, perfil) {
  const { boton, eje } = indicesRetroArch(info);
  const lineas = [
    `# Escrito por Neo Arcade con el mapeo de «${info.nombre}». Se vuelve a escribir antes de cada juego.`,
    'input_driver = "udev"',
    `input_device = "${info.nombre.replaceAll('"', '')}"`,
    `input_vendor_id = "${parseInt(info.vendor || '0', 16)}"`,
    `input_product_id = "${parseInt(info.producto || '0', 16)}"`,
  ];
  for (const [codigo, control] of Object.entries(perfil.botones ?? {})) {
    const nombre = RETROPAD[control];
    if (nombre && boton.has(Number(codigo))) lineas.push(`input_${nombre}_btn = "${boton.get(Number(codigo))}"`);
  }
  for (const [codigo, [negativo, positivo]] of Object.entries(perfil.ejes ?? {})) {
    const numero = Number(codigo);
    if (numero in CRUCETAS) {
      const cruceta = `h${CRUCETAS[numero]}`;
      const [menos, mas] = numero % 2 === 0 ? ['left', 'right'] : ['up', 'down'];
      if (RETROPAD[negativo]) lineas.push(`input_${RETROPAD[negativo]}_btn = "${cruceta}${menos}"`);
      if (RETROPAD[positivo]) lineas.push(`input_${RETROPAD[positivo]}_btn = "${cruceta}${mas}"`);
    } else if (eje.has(numero)) {
      if (RETROPAD[negativo]) lineas.push(`input_${RETROPAD[negativo]}_axis = "-${eje.get(numero)}"`);
      if (RETROPAD[positivo]) lineas.push(`input_${RETROPAD[positivo]}_axis = "+${eje.get(numero)}"`);
    }
  }
  return `${lineas.join('\n')}\n`;
}

const archivoDe = (clave) => `neo-arcade-${clave.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}.cfg`;

// Pares fabricante:producto que ya tienen perfil en la carpeta, sin contar los de Neo Arcade.
async function perfilesExistentes(carpeta) {
  const pares = new Set();
  let archivos = [];
  try {
    archivos = await readdir(carpeta);
  } catch {
    return pares;
  }
  for (const archivo of archivos) {
    if (!archivo.endsWith('.cfg') || archivo.startsWith('neo-arcade-')) continue;
    const texto = await readFile(path.join(carpeta, archivo), 'utf8').catch(() => '');
    const vendor = texto.match(/^input_vendor_id\s*=\s*"?(\d+)/m)?.[1];
    const producto = texto.match(/^input_product_id\s*=\s*"?(\d+)/m)?.[1];
    if (vendor && producto) pares.add(`${vendor}:${producto}`);
  }
  return pares;
}

// Antes de abrir RetroArch: un perfil por cada mando configurado en Neo Arcade, y también para los
// mandos estándar que RetroArch no reconoce (sin perfil para su fabricante y producto).
export async function escribirPerfiles(carpetaPerfiles, conectados) {
  if (!carpetaPerfiles || !conectados.length) return [];
  const carpeta = path.join(carpetaPerfiles, 'udev');
  await mkdir(carpeta, { recursive: true });
  const existentes = await perfilesExistentes(carpeta);
  const escritos = [];
  for (const { info, clave, perfil, origen } of conectados) {
    if (!perfil) continue;
    const par = `${parseInt(info.vendor || '0', 16)}:${parseInt(info.producto || '0', 16)}`;
    if (origen === 'estandar' && existentes.has(par)) continue;
    const archivo = path.join(carpeta, archivoDe(clave));
    await writeFile(archivo, textoPerfil(info, perfil));
    escritos.push(archivo);
  }
  return escritos;
}
