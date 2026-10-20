import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fondoPortada } from '../app/arte.js';
import { DATOS } from '../app/datos-ejemplo.js';
import { estadoInicial } from '../app/estado.js';
import { marcador, ranurasCarrusel, textosReloj, ventanaSistemas, vistaDe } from '../app/modelo.js';
import { tamanoTitulo } from '../app/piezas/carrusel.js';

test('el carrusel dibuja solo los lugares de -4 a +5 alrededor del juego elegido', () => {
  const ranuras = ranurasCarrusel(DATOS.juegos, 3);
  assert.deepEqual(ranuras.map((ranura) => ranura.desplazamiento), [-3, -2, -1, 0, 1, 2, 3, 4, 5]);
  const central = ranuras.find((ranura) => ranura.central);
  assert.equal(central.juego.id, 'sf2');
  assert.deepEqual([central.left, central.top, central.ancho, central.alto], [719, -70, 427, 375]);
  assert.equal(central.z, 20);
});

test('con 3.000 juegos el carrusel sigue dibujando a lo más 10 portadas', () => {
  const muchos = Array.from({ length: 3000 }, (_, i) => ({ ...DATOS.juegos[0], id: `j${i}` }));
  assert.equal(ranurasCarrusel(muchos, 1500).length, 10);
});

test('la barra de sistemas se desplaza para mantener visible el activo', () => {
  assert.deepEqual(ventanaSistemas(12, 11), { inicio: 0, fin: 12 });
  assert.deepEqual(ventanaSistemas(22, 0), { inicio: 0, fin: 12 });
  assert.deepEqual(ventanaSistemas(22, 10), { inicio: 5, fin: 17 });
  assert.deepEqual(ventanaSistemas(22, 21), { inicio: 10, fin: 22 });
});

test('reloj y fecha con las abreviaturas en español del prototipo', () => {
  assert.deepEqual(textosReloj(new Date(2026, 9, 20, 9, 5)), { hora: '09:05', fecha: 'MAR. 20 OCT. 2026' });
});

test('el marcador de adorno es fijo por juego', () => {
  assert.deepEqual(marcador('sf2'), marcador('sf2'));
  assert.equal(marcador('sf2').record.length, 5);
});

test('cada motivo produce un fondo, y el desconocido cae en zigzag', () => {
  const juego = DATOS.juegos[0];
  for (const motivo of ['rays', 'grid', 'circles', 'stripes', 'diamond', 'zigzag']) {
    assert.match(fondoPortada({ ...juego, motivo }), /gradient/);
  }
  assert.equal(fondoPortada({ ...juego, motivo: 'otro' }), fondoPortada({ ...juego, motivo: 'zigzag' }));
});

test('la letra de una portada se achica solo si su palabra más larga no cabe en una línea', () => {
  assert.equal(tamanoTitulo('Street Fighter II', 417, 58), 58);
  assert.equal(tamanoTitulo('Bonk Adventure', 184, 26), 23);
});

test('la vista inicial marca Street Fighter II como favorito y elegido', () => {
  const vista = vistaDe(estadoInicial({ seleccion: 'sf2', favoritos: ['sf2'] }), DATOS, new Date(2026, 9, 20));
  assert.equal(vista.juego.id, 'sf2');
  assert.equal(vista.esFavorito, true);
  assert.equal(vista.ranuras.length, 9);
});
