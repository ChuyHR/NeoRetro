// Biblioteca grande para medir rendimiento (fase 7): N juegos de archivos vacíos repartidos en varios
// sistemas, cada uno con su carátula propia en media/<sistema>/covers/ (dibujadas con
// scripts/medios-de-prueba.mjs; no son de ningún juego). Nunca toca roms/ ni media/ del repositorio.
// Uso: bash scripts/electron.sh scripts/biblioteca-grande.mjs <carpeta> [cantidad, 3000 por omisión]
import { app } from 'electron';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { cerrarDibujo, dibujarArchivo } from './medios-de-prueba.mjs';

const SISTEMAS = [
  ['snes', '.sfc', ['#8B5CF6', '#FFD23F', '#1A1030']],
  ['nes', '.nes', ['#E53935', '#C9D2E8', '#1A0A0A']],
  ['megadrive', '.md', ['#1769FF', '#C9D2E8', '#0A1A4A']],
  ['gba', '.gba', ['#6A4BC0', '#FFB020', '#140A30']],
  ['psx', '.cue', ['#5A6A7A', '#C9D2E8', '#0B1116']],
  ['arcade', '.zip', ['#FF3B3B', '#FFD23F', '#1A0505']],
];
// Títulos con todas las letras, para que también se pueda probar el salto de letra.
const PALABRAS = ['Aventura', 'Batalla', 'Cosmos', 'Dragón', 'Estrella', 'Fuego', 'Galaxia', 'Héroe', 'Isla', 'Jungla',
  'Kárate', 'Leyenda', 'Misión', 'Neón', 'Órbita', 'Pirata', 'Quimera', 'Rayo', 'Sable', 'Trueno', 'Universo',
  'Vórtice', 'Wolf', 'Xenón', 'Yeti', 'Zafiro'];

app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  // Electron pone sus propias opciones antes del script: los argumentos son los que van después.
  const resto = process.argv.slice(process.argv.findIndex((argumento) => argumento.endsWith('biblioteca-grande.mjs')) + 1);
  const [destino, cantidad = '3000'] = resto;
  const total = Number(cantidad);
  const inicio = Date.now();
  for (let i = 0; i < total; i += 1) {
    const [sistema, extension, colores] = SISTEMAS[i % SISTEMAS.length];
    const titulo = `${PALABRAS[i % PALABRAS.length]} ${Math.floor(i / PALABRAS.length) + 1}`;
    const carpeta = path.join(destino, 'roms', sistema);
    await mkdir(carpeta, { recursive: true });
    await writeFile(path.join(carpeta, `${titulo}${extension}`), '');
    await dibujarArchivo(path.join(destino, 'media', sistema, 'covers', `${titulo}.png`), { tipo: 'imagen', ancho: 200, alto: 280, titulo, colores });
    if ((i + 1) % 500 === 0) console.log(`${i + 1} juegos (${Math.round((Date.now() - inicio) / 1000)} s)`);
  }
  console.log(`Biblioteca de ${total} juegos con carátula en ${destino}`);
  cerrarDibujo();
  app.quit();
});
