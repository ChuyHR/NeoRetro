import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DATOS } from '../app/datos-ejemplo.js';
import { aplicar, estadoInicial, juegosDelSistema } from '../app/estado.js';

const pasos = (acciones, estado = estadoInicial()) =>
  acciones.reduce((actual, accion) => aplicar(actual, accion, DATOS), estado);

test('arranca como el prototipo: todos los juegos, Street Fighter II elegido y Jugar marcado', () => {
  const estado = estadoInicial();
  assert.equal(estado.sistema, 'todos');
  assert.equal(estado.seleccion, 'sf2');
  assert.equal(estado.accion, 0);
  assert.equal(estado.ventana, null);
});

test('izquierda y derecha recorren el carrusel y dan la vuelta en los extremos', () => {
  assert.equal(pasos(['derecha']).seleccion, 'mgs');
  assert.equal(pasos(['izquierda']).seleccion, 'sonic');
  const primero = { ...estadoInicial(), seleccion: 'pacman' };
  assert.equal(pasos(['izquierda'], primero).seleccion, 'lumines');
});

test('arriba y abajo recorren el menú sin salirse', () => {
  assert.equal(pasos(['arriba']).accion, 0);
  assert.equal(pasos(['abajo', 'abajo', 'abajo', 'abajo', 'abajo']).accion, 3);
});

test('Enter sobre Jugar abre la pantalla de lanzamiento y Retroceso la cierra', () => {
  const abierto = pasos(['aceptar']);
  assert.equal(abierto.ventana, 'lanzamiento');
  assert.equal(pasos(['volver'], abierto).ventana, null);
});

test('Favoritos agrega y quita el juego elegido', () => {
  const quitado = pasos(['abajo', 'aceptar']);
  assert.deepEqual(quitado.favoritos, []);
  assert.deepEqual(pasos(['aceptar'], quitado).favoritos, ['sf2']);
});

test('en Detalles las flechas mueven el foco y Jugar lleva al lanzamiento', () => {
  const detalles = pasos(['abajo', 'abajo', 'aceptar']);
  assert.equal(detalles.ventana, 'detalles');
  assert.equal(pasos(['derecha', 'aceptar'], detalles).ventana, null);
  assert.equal(pasos(['aceptar'], detalles).ventana, 'lanzamiento');
});

test('en Configuración se apaga y se enciende el efecto CRT', () => {
  const configuracion = pasos(['abajo', 'abajo', 'abajo', 'aceptar']);
  assert.equal(configuracion.ventana, 'configuracion');
  assert.equal(configuracion.foco, 0);
  const apagado = pasos(['derecha', 'aceptar'], configuracion);
  assert.equal(apagado.crt, false);
  assert.equal(pasos(['izquierda', 'aceptar'], apagado).crt, true);
  assert.equal(pasos(['abajo', 'abajo', 'aceptar'], configuracion).ventana, null);
});

test('al cambiar de sistema, si el juego no está ahí se elige el primero de ese sistema', () => {
  const arcade = pasos(['sistema-siguiente']);
  assert.equal(arcade.sistema, 'arcade');
  assert.equal(arcade.seleccion, 'pacman');
  const snes = pasos([{ tipo: 'elegir-sistema', valor: 'snes' }]);
  assert.equal(snes.seleccion, 'sf2');
  assert.equal(pasos(['sistema-anterior']).sistema, 'ports');
});

test('las acciones de la pantalla principal no hacen nada con una ventana abierta', () => {
  const abierto = pasos(['aceptar']);
  assert.equal(pasos(['sistema-siguiente'], abierto).sistema, 'todos');
});

test('juegosDelSistema filtra por carpeta y «todos» devuelve la biblioteca completa', () => {
  assert.equal(juegosDelSistema(DATOS.juegos, 'todos').length, DATOS.juegos.length);
  assert.deepEqual(juegosDelSistema(DATOS.juegos, 'nes').map((juego) => juego.id), ['castlevania', 'megaman']);
});
