import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { datosParaInterfaz } from '../core/biblioteca.js';
import { agruparDiscos, listaDeDiscos, sinMarcaDeDisco } from '../core/discos.js';
import { limpiarNombre } from '../core/escaner/escaner.js';

const escaneado = (...archivos) => archivos.map((archivo) => ({ archivo, titulo: limpiarNombre(path.posix.basename(archivo)) }));

test('los discos de un mismo juego se vuelven uno solo, en orden', () => {
  const juegos = agruparDiscos(escaneado(
    'Final Fantasy VII (USA) (Disc 3).cue',
    'Final Fantasy VII (USA) (Disc 1).cue',
    'Final Fantasy VII (USA) (Disc 2).cue',
    'Crash Bandicoot (USA).cue',
  ));
  assert.deepEqual(juegos, [
    { archivo: 'Crash Bandicoot (USA).cue', titulo: 'Crash Bandicoot' },
    {
      archivo: 'Final Fantasy VII (USA) (Disc 1).cue',
      titulo: 'Final Fantasy VII',
      discos: ['Final Fantasy VII (USA) (Disc 1).cue', 'Final Fantasy VII (USA) (Disc 2).cue', 'Final Fantasy VII (USA) (Disc 3).cue'],
    },
  ]);
});

test('si hay una lista .m3u, esa es el juego y los discos no se muestran sueltos', () => {
  const juegos = agruparDiscos(escaneado(
    'Metal Gear Solid (USA).m3u',
    'Metal Gear Solid (USA)/Metal Gear Solid (USA) (Disc 1).chd',
    'Metal Gear Solid (USA)/Metal Gear Solid (USA) (Disc 2).chd',
  ));
  assert.equal(juegos.length, 1);
  assert.equal(juegos[0].archivo, 'Metal Gear Solid (USA).m3u');
  assert.equal(juegos[0].titulo, 'Metal Gear Solid');
  assert.equal(juegos[0].discos.length, 2);
});

test('un disco suelto o juegos de carpetas distintas no se juntan', () => {
  const juegos = agruparDiscos(escaneado('Riven (Disc 1).cue', 'a/Myst (Disc 1).cue', 'b/Myst (Disc 2).cue'));
  assert.deepEqual(juegos.map(({ archivo }) => archivo), ['a/Myst (Disc 1).cue', 'b/Myst (Disc 2).cue', 'Riven (Disc 1).cue']);
  assert.ok(juegos.every(({ discos }) => !discos));
});

test('la marca de disco sale también del nombre que trae el gamelist', () => {
  assert.equal(sinMarcaDeDisco('Policenauts (Disc 1 of 3)'), 'Policenauts');
  assert.equal(sinMarcaDeDisco('Lunar (CD 2)'), 'Lunar');
});

test('la biblioteca agrupa solo en los sistemas que abren listas .m3u', () => {
  const sistema = (id, extensiones) => ({ id, nombreLargo: id, carpeta: id, extensiones, nombreEmulador: 'x', controles: 'x', colores: ['#1', '#2', '#3'], motivo: 'grid' });
  const configuracion = { sistemas: [sistema('psx', ['.cue', '.m3u']), sistema('pce', ['.cue'])] };
  const discos = escaneado('Juego (Disc 1).cue', 'Juego (Disc 2).cue');
  const { juegos } = datosParaInterfaz(configuracion, { sistemas: { psx: { juegos: discos }, pce: { juegos: discos } } });
  assert.deepEqual(juegos.filter(({ sistema: id }) => id === 'psx').map(({ titulo, discos: lista }) => [titulo, lista?.length]), [['Juego', 2]]);
  assert.equal(juegos.filter(({ sistema: id }) => id === 'pce').length, 2);
});

test('la lista que se arma lleva las rutas completas de los discos, una por línea', async () => {
  const carpeta = await mkdtemp(path.join(os.tmpdir(), 'neo-arcade-discos-'));
  try {
    const rutas = ['/home/a/roms/psx/FF7 (Disc 1).cue', '/home/a/roms/psx/FF7 (Disc 2).cue'];
    const archivo = await listaDeDiscos(carpeta, 'psx/FF7 (Disc 1).cue', rutas);
    assert.equal(path.dirname(archivo), path.join(carpeta, 'listas'));
    assert.equal(await readFile(archivo, 'utf8'), `${rutas.join('\n')}\n`);
    assert.equal(await listaDeDiscos(carpeta, 'psx/FF7 (Disc 1).cue', rutas), archivo); // mismo juego, misma lista
  } finally {
    await rm(carpeta, { recursive: true, force: true });
  }
});
