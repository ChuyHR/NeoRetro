// Genera un programa de prueba propio para Super Nintendo (no es un juego ni la copia de uno): pinta la
// pantalla del azul de Neo Arcade y la cambia a rojo mientras se mantiene pulsado cualquier botón.
// Sirve para probar de punta a punta el camino de RetroArch (pantalla completa, control y salida) sin
// depender de juegos de terceros. El código máquina del 65816 va escrito a mano y comentado.
// Uso: node scripts/juego-de-prueba-snes.mjs <carpeta de destino>
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const TAMANO = 0x8000; // 32 KB: la ROM más chica que acepta el formato LoROM
const NOMBRE = 'Prueba de control (Neo Arcade).sfc';

// Colores en el formato de la consola (5 bits por canal, azul en los bits altos), byte bajo primero.
const AZUL = [0x43, 0x7e]; // #1E90FF
const ROJO = [0x1f, 0x00]; // #FF0000

// Programa en $00:8000, que en LoROM es el inicio del archivo. Las sumas de los saltos relativos están
// calculadas a mano: cada una cuenta desde la instrucción siguiente.
const PROGRAMA = [
  0x78, //             SEI               sin interrupciones
  0x18, 0xfb, //       CLC / XCE         modo nativo
  0xe2, 0x30, //       SEP #$30          registros de 8 bits
  0xa9, 0x80, 0x8d, 0x00, 0x21, //       pantalla apagada mientras se prepara
  0x9c, 0x00, 0x42, // STZ $4200         sin NMI
  0x9c, 0x21, 0x21, // STZ $2121         color 0 de la paleta (el fondo)
  0xa9, AZUL[0], 0x8d, 0x22, 0x21,
  0xa9, AZUL[1], 0x8d, 0x22, 0x21,
  0xa9, 0x0f, 0x8d, 0x00, 0x21, //       pantalla encendida, brillo máximo
  0xa9, 0x01, 0x8d, 0x00, 0x42, //       lectura automática del control
  // $8024 bucle: espera el inicio del retrazado vertical (bit 7 de $4212)
  0xad, 0x12, 0x42, 0x10, 0xfb,
  // $8029 espera a que termine la lectura del control (bit 0 de $4212)
  0xad, 0x12, 0x42, 0x29, 0x01, 0xd0, 0xf9,
  // $8030 botones de los dos registros del control 1; si no hay ninguno, salta a azul
  0xad, 0x18, 0x42, 0x0d, 0x19, 0x42, 0xf0, 0x0d,
  // $8038 rojo y salta a la espera del fin del retrazado
  0x9c, 0x21, 0x21, 0xa9, ROJO[0], 0x8d, 0x22, 0x21, 0x9c, 0x22, 0x21, 0x80, 0x0d,
  // $8045 azul
  0x9c, 0x21, 0x21, 0xa9, AZUL[0], 0x8d, 0x22, 0x21, 0xa9, AZUL[1], 0x8d, 0x22, 0x21,
  // $8052 espera a que termine el retrazado y vuelve al bucle
  0xad, 0x12, 0x42, 0x30, 0xfb, 0x80, 0xcb,
];
const RTI = 0x8100; // destino de las interrupciones, que no se usan

export function romDePrueba() {
  const rom = Buffer.alloc(TAMANO, 0xff);
  Buffer.from(PROGRAMA).copy(rom, 0);
  rom[RTI - 0x8000] = 0x40; // RTI

  // Encabezado del cartucho en $FFC0 (posición 0x7FC0 del archivo).
  rom.write('NEO ARCADE PRUEBA'.padEnd(21, ' '), 0x7fc0, 'ascii');
  rom[0x7fd5] = 0x20; // LoROM
  rom[0x7fd6] = 0x00; // solo ROM
  rom[0x7fd7] = 0x05; // 2^5 KB = 32 KB
  rom[0x7fd8] = 0x00; // sin RAM
  rom[0x7fd9] = 0x01; // Norteamérica
  rom[0x7fda] = 0x00;
  rom[0x7fdb] = 0x00; // versión
  rom.writeUInt16LE(0xffff, 0x7fdc); // complemento y suma: se llenan al final
  rom.writeUInt16LE(0x0000, 0x7fde);

  // Vectores: nativos en $FFE4–$FFEF y de emulación en $FFF4–$FFFF. Solo el de arranque va al programa.
  for (let vector = 0x7fe4; vector < 0x8000; vector += 2) rom.writeUInt16LE(RTI, vector);
  rom.writeUInt16LE(0x8000, 0x7ffc);

  let suma = 0;
  for (const byte of rom) suma = (suma + byte) & 0xffff;
  rom.writeUInt16LE(suma ^ 0xffff, 0x7fdc);
  rom.writeUInt16LE(suma, 0x7fde);
  return rom;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const destino = process.argv[2];
  if (!destino) {
    console.error('Uso: node scripts/juego-de-prueba-snes.mjs <carpeta de destino>');
    process.exit(2);
  }
  await mkdir(destino, { recursive: true });
  await writeFile(path.join(destino, NOMBRE), romDePrueba());
  console.log(`Programa de prueba en ${path.join(destino, NOMBRE)}`);
}
