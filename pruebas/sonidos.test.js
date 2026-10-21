import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DATOS } from '../app/datos-ejemplo.js';
import { aplicar, estadoInicial } from '../app/estado.js';
import { NOTAS, sonidoDelCambio } from '../app/sonidos.js';

const DEMO = { seleccion: 'sf2', favoritos: ['sf2'] };
const despues = (accion, estado = estadoInicial(DEMO)) => [estado, aplicar(estado, accion, DATOS)];

test('cada cambio de la interfaz tiene su sonido, y lo que no cambia no suena', () => {
  assert.equal(sonidoDelCambio(...despues('derecha')), 'mover');
  assert.equal(sonidoDelCambio(...despues('abajo')), 'mover');
  assert.equal(sonidoDelCambio(...despues('sistema-siguiente')), 'sistema');
  assert.equal(sonidoDelCambio(...despues('aceptar')), 'aceptar');
  assert.equal(sonidoDelCambio(...despues('favorito')), 'favorito');
  const detalles = aplicar(estadoInicial(DEMO), { tipo: 'ejecutar', valor: 'detalles' }, DATOS);
  assert.equal(sonidoDelCambio(...despues('volver', detalles)), 'volver');
  const lanzando = aplicar(estadoInicial(DEMO), 'aceptar', DATOS);
  assert.equal(sonidoDelCambio(...despues({ tipo: 'error-lanzamiento', valor: 'Falta algo.' }, lanzando)), 'error');
  assert.equal(sonidoDelCambio(...despues('juego-terminado', lanzando)), null); // al volver de un juego, silencio
  assert.equal(sonidoDelCambio(...despues('arriba')), null); // ya estaba arriba
});

test('todas las notas tienen frecuencia y duración válidas', () => {
  for (const [nombre, notas] of Object.entries(NOTAS)) {
    for (const [frecuencia, duracion] of notas) {
      assert.ok(frecuencia > 20 && frecuencia < 20000, nombre);
      assert.ok(duracion > 0 && duracion < 0.5, nombre);
    }
  }
});
