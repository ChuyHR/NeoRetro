import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

import { escanearBiblioteca, limpiarNombre } from '../core/escaner/escaner.js';

// Las bibliotecas de prueba son archivos vacíos en una carpeta temporal: nunca se toca roms/.
const temporales = [];
after(() => Promise.all(temporales.map((carpeta) => rm(carpeta, { recursive: true, force: true }))));

async function biblioteca(archivos) {
  const raiz = await mkdtemp(path.join(os.tmpdir(), 'neo-arcade-roms-'));
  temporales.push(raiz);
  for (const archivo of archivos) {
    await mkdir(path.dirname(path.join(raiz, archivo)), { recursive: true });
    await writeFile(path.join(raiz, archivo), '');
  }
  return raiz;
}

const SISTEMAS = [
  { id: 'snes', carpeta: 'snes', extensiones: ['.sfc', '.smc', '.zip'] },
  { id: 'psx', carpeta: 'psx', extensiones: ['.cue', '.chd'] },
  { id: 'n64', carpeta: 'n64', extensiones: ['.z64'] },
];

test('limpia regiones, marcas, guiones bajos y extensión, y conserva el número de disco', () => {
  assert.equal(limpiarNombre('Street_Fighter_II_(USA) [!].sfc'), 'Street Fighter II');
  assert.equal(limpiarNombre('Final Fantasy VII (USA) (Disc 2).cue'), 'Final Fantasy VII (Disc 2)');
  assert.equal(limpiarNombre('Mega  Man (Europe) (Rev 1).nes'), 'Mega Man');
  assert.equal(limpiarNombre('(Proto).zip'), '(Proto)');
});

test('filtra por extensión, entra en subcarpetas y omite archivos ocultos', async () => {
  const raiz = await biblioteca([
    'snes/Zelda (USA).sfc', 'snes/Notas.txt', 'snes/.oculto.sfc', 'snes/CHRONO TRIGGER.SMC',
    'psx/Metal Gear Solid/Metal Gear Solid (Disc 1).cue', 'psx/Metal Gear Solid/Metal Gear Solid (Disc 1).bin',
  ]);
  const { biblioteca: resultado } = await escanearBiblioteca({ sistemas: SISTEMAS, carpetaRoms: raiz }, path.join(raiz, 'cache.json'));
  assert.deepEqual(resultado.sistemas.snes.juegos.map((juego) => juego.titulo), ['CHRONO TRIGGER', 'Zelda']);
  assert.deepEqual(resultado.sistemas.psx.juegos, [
    { archivo: 'Metal Gear Solid/Metal Gear Solid (Disc 1).cue', titulo: 'Metal Gear Solid (Disc 1)' },
  ]);
  assert.deepEqual(resultado.sistemas.n64.juegos, []); // la carpeta no existe: sin error y sin juegos
});

test('la segunda vez sale de la caché y solo vuelve a leer el sistema que cambió', async () => {
  const raiz = await biblioteca(['snes/A.sfc', 'psx/B.cue']);
  const cache = path.join(raiz, 'datos', 'biblioteca.json');
  const configuracion = { sistemas: SISTEMAS, carpetaRoms: raiz };
  assert.equal((await escanearBiblioteca(configuracion, cache)).leidos, 3);
  assert.equal((await escanearBiblioteca(configuracion, cache)).leidos, 0);
  await writeFile(path.join(raiz, 'snes', 'C.sfc'), '');
  const futuro = new Date(Date.now() + 5000); // en algunos discos la fecha cambia en pasos de segundos
  await utimes(path.join(raiz, 'snes'), futuro, futuro);
  const { biblioteca: resultado, leidos } = await escanearBiblioteca(configuracion, cache);
  assert.equal(leidos, 1);
  assert.equal(resultado.sistemas.snes.juegos.length, 2);
});

test('con 500 archivos tarda menos de 2 segundos', async () => {
  const archivos = Array.from({ length: 500 }, (_, i) => `${SISTEMAS[i % 3].carpeta}/Juego ${i} (USA)${['.sfc', '.cue', '.z64'][i % 3]}`);
  const raiz = await biblioteca(archivos);
  const inicio = performance.now();
  const { biblioteca: resultado } = await escanearBiblioteca({ sistemas: SISTEMAS, carpetaRoms: raiz }, path.join(raiz, 'cache.json'));
  const ms = performance.now() - inicio;
  const total = Object.values(resultado.sistemas).reduce((suma, sistema) => suma + sistema.juegos.length, 0);
  assert.equal(total, 500);
  assert.ok(ms < 2000, `tardó ${ms.toFixed(0)} ms`);
});
