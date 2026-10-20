import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { datosParaInterfaz, ubicarJuego } from '../core/biblioteca.js';

const SISTEMAS = [
  { id: 'snes', nombre: 'SNES', nombreLargo: 'SUPER NINTENDO', carpeta: 'snes', nombreEmulador: 'Snes9x', controles: 'Mando', colores: ['#1', '#2', '#3'], motivo: 'rays' },
  { id: 'psx', nombre: 'PLAYSTATION', nombreLargo: 'PLAYSTATION', carpeta: 'psx', nombreEmulador: 'SwanStation', controles: 'Mando', colores: ['#4', '#5', '#6'], motivo: 'grid' },
  { id: 'n64', nombre: 'NINTENDO 64', nombreLargo: 'NINTENDO 64', carpeta: 'n64', nombreEmulador: 'Mupen64Plus-Next', controles: 'Mando', colores: ['#7', '#8', '#9'], motivo: 'circles' },
];

const escaneo = {
  sistemas: {
    snes: { juegos: [{ archivo: 'Zelda.sfc', titulo: 'Zelda' }, { archivo: 'Axelay.sfc', titulo: 'Axelay' }] },
    psx: { juegos: [{ archivo: 'MGS/MGS.cue', titulo: 'Metal Gear Solid' }] },
    n64: { juegos: [] },
  },
};

test('solo aparecen en la barra los sistemas con juegos, después de «todos»', () => {
  const { sistemas } = datosParaInterfaz({ sistemas: SISTEMAS }, escaneo);
  assert.deepEqual(sistemas.map((sistema) => sistema.id), ['todos', 'snes', 'psx']);
});

test('los juegos van en orden alfabético y llevan lo que aporta su sistema', () => {
  const { juegos } = datosParaInterfaz({ sistemas: SISTEMAS }, escaneo);
  assert.deepEqual(juegos.map((juego) => juego.titulo), ['Axelay', 'Metal Gear Solid', 'Zelda']);
  const mgs = juegos[1];
  assert.equal(mgs.id, 'psx/MGS/MGS.cue');
  assert.equal(mgs.nombreSistema, 'PLAYSTATION');
  assert.equal(mgs.emulador, 'SwanStation');
  assert.deepEqual(mgs.colores, ['#4', '#5', '#6']);
});

test('sin juegos no hay sistemas, ni siquiera «todos»', () => {
  const vacio = { sistemas: { snes: { juegos: [] } } };
  assert.deepEqual(datosParaInterfaz({ sistemas: SISTEMAS }, vacio), { sistemas: [], juegos: [] });
});

test('el id de un juego lleva a su archivo y nunca fuera de la carpeta del sistema', () => {
  const configuracion = { sistemas: SISTEMAS, carpetaRoms: '/juegos' };
  const { ruta, sistema } = ubicarJuego('psx/MGS/MGS.cue', configuracion);
  assert.equal(ruta, path.join('/juegos', 'psx', 'MGS', 'MGS.cue'));
  assert.equal(sistema.id, 'psx');
  assert.equal(ubicarJuego('psx/../../etc/passwd', configuracion), null);
  assert.equal(ubicarJuego('dos/juego.exe', configuracion), null);
});
