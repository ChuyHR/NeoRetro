import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calcularEscala } from '../app/lienzo.js';

test('a 1920×1080 el lienzo queda a escala 1 y sin márgenes', () => {
  assert.deepEqual(calcularEscala(1920, 1080), { escala: 1, x: 0, y: 0 });
});

test('en 1366×768 cabe completo y centrado', () => {
  const { escala, x, y } = calcularEscala(1366, 768);
  assert.ok(Math.abs(escala - 768 / 1080) < 1e-9);
  assert.ok(x > 0 && x < 1);
  assert.equal(y, 0);
});

test('en 4K se agranda al doble', () => {
  assert.deepEqual(calcularEscala(3840, 2160), { escala: 2, x: 0, y: 0 });
});

test('en una pantalla 4:3 el margen sobra arriba y abajo, nunca a los lados', () => {
  const { escala, x, y } = calcularEscala(1024, 768);
  assert.equal(escala, 1024 / 1920);
  assert.equal(x, 0);
  assert.ok(y > 0);
});
