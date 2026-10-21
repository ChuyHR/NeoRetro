import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

import { escanearBiblioteca } from '../core/escaner/escaner.js';
import { archivoDeSistema } from '../core/lanzador/lanzador.js';
import { archivosQueNombra, buscarDuplicados, revisarJuegos } from '../core/revision-juegos.js';

const temporales = [];
after(() => Promise.all(temporales.map((carpeta) => rm(carpeta, { recursive: true, force: true }))));

async function carpetaTemporal() {
  const carpeta = await mkdtemp(path.join(os.tmpdir(), 'neo-arcade-revision-'));
  temporales.push(carpeta);
  return carpeta;
}

async function escribir(raiz, relativa, contenido) {
  await mkdir(path.dirname(path.join(raiz, relativa)), { recursive: true });
  await writeFile(path.join(raiz, relativa), contenido);
}

// Un zip vacío válido: solo el fin del directorio central.
const ZIP_VACIO = Buffer.from([0x50, 0x4b, 0x05, 0x06, ...Array(18).fill(0)]);

test('se leen los archivos que nombran las listas .cue, .gdi y .m3u', () => {
  assert.deepEqual(archivosQueNombra('.cue', 'FILE "Juego (Track 1).bin" BINARY\n  TRACK 01 MODE2/2352\nFILE pista2.bin BINARY\n'), ['Juego (Track 1).bin', 'pista2.bin']);
  assert.deepEqual(archivosQueNombra('.gdi', '3\n1 0 4 2352 track01.bin 0\n2 600 0 2352 "track 02.raw" 0\n3 45000 4 2352 track03.bin 0\n'), ['track01.bin', 'track 02.raw', 'track03.bin']);
  assert.deepEqual(archivosQueNombra('.m3u', '#EXTM3U\nJuego (Disc 1).cue\n\nJuego (Disc 2).cue\n'), ['Juego (Disc 1).cue', 'Juego (Disc 2).cue']);
});

test('los duplicados se encuentran por contenido, no por nombre', async () => {
  const carpeta = await carpetaTemporal();
  const archivos = [];
  for (const [nombre, contenido] of [['a.sfc', 'uno'], ['b.sfc', 'uno'], ['c.sfc', 'dos'], ['d.sfc', 'tres']]) {
    const ruta = path.join(carpeta, nombre);
    await writeFile(ruta, contenido);
    archivos.push({ ruta, tamano: Buffer.byteLength(contenido), nombre });
  }
  const duplicados = await buscarDuplicados(archivos);
  assert.equal(duplicados.length, 1);
  assert.deepEqual(duplicados[0].archivos.map(({ nombre }) => nombre), ['a.sfc', 'b.sfc']);
  assert.match(duplicados[0].sha256, /^[0-9a-f]{64}$/);
});

test('cada juego queda con su estado y el motivo', async () => {
  const raiz = await carpetaTemporal();
  const roms = path.join(raiz, 'roms');
  const bios = path.join(raiz, 'bios');
  await mkdir(bios, { recursive: true });
  await escribir(roms, 'snes/Bueno.sfc', 'contenido');
  await escribir(roms, 'snes/Copia.sfc', 'contenido');
  await escribir(roms, 'snes/Vacío.sfc', '');
  await escribir(roms, 'nes/Sin cabecera.nes', 'esto no es NES');
  await escribir(roms, 'nes/En UNIF.nes', 'UNIF\x07\0\0\0 resto del juego');
  await escribir(roms, 'arcade/cortado.zip', 'PK\x03\x04 a medias');
  await escribir(roms, 'psx/Juego/Juego.cue', 'FILE "juego.bin" BINARY\n');
  await escribir(roms, 'psx/Juego/Juego.bin', 'x');
  await escribir(roms, 'segacd/Otro.cue', 'FILE "Otro.bin" BINARY\n');
  await escribir(roms, 'segacd/Otro.bin', 'y');
  await escribir(roms, 'neogeo/mslug.zip', ZIP_VACIO);
  await escribir(roms, 'neogeo/neogeo.zip', ZIP_VACIO);
  const sistema = (id, extensiones, extra = {}) => ({ id, nombreLargo: id.toUpperCase(), carpeta: id, extensiones, ...extra });
  const configuracion = {
    carpetaRoms: roms,
    sistemas: [
      sistema('snes', ['.sfc']),
      sistema('nes', ['.nes']),
      sistema('arcade', ['.zip'], { noSonJuegos: ['neogeo.zip'] }),
      sistema('psx', ['.cue']),
      sistema('segacd', ['.cue'], { bios: ['bios_CD_U.bin'] }),
      sistema('neogeo', ['.zip'], { noSonJuegos: ['neogeo.zip'], archivoDeSistema: 'neogeo.zip' }),
    ],
  };
  const { biblioteca } = await escanearBiblioteca(configuracion, path.join(raiz, 'cache.json'));
  assert.deepEqual(biblioteca.sistemas.neogeo.juegos.map(({ archivo }) => archivo), ['mslug.zip']); // neogeo.zip no es un juego
  const { juegos, duplicados } = await revisarJuegos(configuracion, biblioteca, { biosPorSistema: new Map([['segacd', false]]), carpetaBios: bios });
  const estado = Object.fromEntries(juegos.map((juego) => [`${juego.sistema}/${juego.archivo}`, [juego.estado, juego.detalle.join('; ')]]));
  assert.equal(estado['snes/Bueno.sfc'][0], 'DUPLICATE');
  assert.match(estado['snes/Bueno.sfc'][1], /posible duplicado de snes\/Copia\.sfc/);
  assert.equal(estado['snes/Vacío.sfc'][0], 'CORRUPTED');
  assert.equal(estado['nes/Sin cabecera.nes'][0], 'CORRUPTED');
  assert.equal(estado['nes/En UNIF.nes'][0], 'VALID');
  assert.equal(estado['arcade/cortado.zip'][0], 'CORRUPTED');
  assert.equal(estado['psx/Juego/Juego.cue'][0], 'INVALID');
  assert.match(estado['psx/Juego/Juego.cue'][1], /juego\.bin \(está como Juego\.bin\)/);
  assert.equal(estado['segacd/Otro.cue'][0], 'MISSING_BIOS');
  assert.equal(estado['neogeo/mslug.zip'][0], 'VALID');
  assert.equal(duplicados.length, 1);
});

test('neogeo.zip se busca junto al juego y en la carpeta de BIOS', async () => {
  const raiz = await carpetaTemporal();
  await escribir(raiz, 'bios/fbneo/neogeo.zip', ZIP_VACIO);
  assert.equal(await archivoDeSistema('neogeo.zip', path.join(raiz, 'roms'), null), null);
  assert.equal(await archivoDeSistema('neogeo.zip', path.join(raiz, 'roms'), path.join(raiz, 'bios')), path.join(raiz, 'bios', 'fbneo', 'neogeo.zip'));
});
