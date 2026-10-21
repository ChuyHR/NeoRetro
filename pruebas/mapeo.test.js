import assert from 'node:assert/strict';
import { test } from 'node:test';

import { asignar, mapeoTerminado, nuevoMapeo, omitir, PASOS_MAPEO } from '../app/mapeo.js';

const CLAVE = '0079:0006:DragonRise Inc. Generic USB Joystick';
const boton = (codigo, valor = 1) => ({ mando: CLAVE, tipo: 'boton', codigo, valor });
const eje = (codigo, normalizado, reposo = 0) => ({ mando: CLAVE, tipo: 'eje', codigo, valor: 0, normalizado, reposo });

test('una palanca de arcade se configura con sus ejes y sus botones, en orden', () => {
  let mapeo = nuevoMapeo({ clave: CLAVE, nombre: 'Palanca' });
  for (const suceso of [eje(1, -1), eje(1, 0), eje(1, 1), eje(0, -1), eje(0, 1), boton(290), boton(290, 0), boton(289)]) {
    mapeo = asignar(mapeo, suceso);
  }
  assert.equal(mapeo.paso, 6);
  assert.deepEqual(mapeo.perfil, { botones: { 290: 'a', 289: 'b' }, ejes: { 1: ['arriba', 'abajo'], 0: ['izquierda', 'derecha'] } });
});

test('un botón ya asignado no se come el paso siguiente', () => {
  let mapeo = { ...nuevoMapeo({ clave: CLAVE, nombre: 'Palanca' }), paso: 4 };
  mapeo = asignar(mapeo, boton(290));
  mapeo = asignar(mapeo, boton(290));
  assert.equal(mapeo.paso, 5);
});

test('un gatillo que reposa en su mínimo se guarda como eje de un solo lado', () => {
  let mapeo = { ...nuevoMapeo({ clave: CLAVE, nombre: 'Mando' }), paso: PASOS_MAPEO.findIndex(([control]) => control === 'lt') };
  mapeo = asignar(mapeo, eje(2, 0.9, -1));
  assert.deepEqual(mapeo.perfil.ejes[2], [null, 'lt']);
});

test('un movimiento pequeño o de otro mando no cuenta', () => {
  const inicio = nuevoMapeo({ clave: CLAVE, nombre: 'Palanca' });
  assert.equal(asignar(inicio, eje(0, 0.3)), inicio);
  assert.equal(asignar(inicio, { ...boton(288), mando: 'otro' }), inicio);
});

test('los pasos opcionales se saltan y los obligatorios no', () => {
  const inicio = nuevoMapeo({ clave: CLAVE, nombre: 'Palanca' });
  assert.equal(omitir(inicio), inicio);
  let mapeo = { ...inicio, paso: 6 };
  for (let i = 6; i < PASOS_MAPEO.length; i += 1) mapeo = omitir(mapeo);
  assert.equal(mapeoTerminado(mapeo), true);
});
