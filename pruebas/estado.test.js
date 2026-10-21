import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DATOS } from '../app/datos-ejemplo.js';
import { aplicar, estadoInicial, juegosDelSistema } from '../app/estado.js';

// El estado con que arranca la demostración del prototipo.
const DEMO = { seleccion: 'sf2', favoritos: ['sf2'] };

const pasos = (acciones, estado = estadoInicial(DEMO)) =>
  acciones.reduce((actual, accion) => aplicar(actual, accion, DATOS), estado);

test('arranca como el prototipo: todos los juegos, Street Fighter II elegido y Jugar marcado', () => {
  const estado = estadoInicial(DEMO);
  assert.equal(estado.sistema, 'todos');
  assert.equal(estado.seleccion, 'sf2');
  assert.equal(estado.accion, 0);
  assert.equal(estado.ventana, null);
});

test('izquierda y derecha recorren el carrusel y dan la vuelta en los extremos', () => {
  assert.equal(pasos(['derecha']).seleccion, 'mgs');
  assert.equal(pasos(['izquierda']).seleccion, 'sonic');
  const primero = { ...estadoInicial(DEMO), seleccion: 'pacman' };
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
  assert.equal(pasos(['abajo', 'abajo', 'aceptar'], configuracion).ventana, 'prueba-control');
  assert.equal(pasos(['abajo', 'abajo', 'abajo', 'abajo', 'aceptar'], configuracion).ventana, null);
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

test('al terminar el juego se vuelve a la pantalla principal con el mismo juego elegido', () => {
  const jugando = pasos(['derecha', 'aceptar']);
  const vuelta = pasos(['juego-terminado'], jugando);
  assert.equal(vuelta.ventana, null);
  assert.equal(vuelta.seleccion, 'mgs');
});

test('un error del lanzador se muestra en la pantalla de lanzamiento y Retroceso lo limpia', () => {
  const fallido = pasos(['aceptar', { tipo: 'error-lanzamiento', valor: 'Falta el núcleo Snes9x de RetroArch.' }]);
  assert.equal(fallido.ventana, 'lanzamiento');
  assert.equal(fallido.error, 'Falta el núcleo Snes9x de RetroArch.');
  const limpio = pasos(['volver'], fallido);
  assert.equal(limpio.ventana, null);
  assert.equal(limpio.error, null);
});

test('sin juegos ni sistemas, cambiar de sistema o moverse no rompe nada', () => {
  const vacio = { sistemas: [], juegos: [] };
  const estado = estadoInicial();
  for (const accion of ['sistema-siguiente', 'sistema-anterior', 'derecha', 'aceptar', 'letra-siguiente', 'favorito']) {
    assert.equal(aplicar(estado, accion, vacio), estado);
  }
});

test('LT y RT saltan a la letra anterior o siguiente, sin acentos y dando la vuelta', () => {
  const titulos = ['Aero', 'Alien', 'Bomber', 'Bubble', 'Ébano', 'Zelda'];
  const datos = { sistemas: [], juegos: titulos.map((titulo) => ({ id: titulo, titulo, sistema: 'snes' })) };
  const desde = (seleccion, accion) => aplicar({ ...estadoInicial(), seleccion }, accion, datos).seleccion;
  assert.equal(desde('Aero', 'letra-siguiente'), 'Bomber');
  assert.equal(desde('Bubble', 'letra-siguiente'), 'Ébano');
  assert.equal(desde('Zelda', 'letra-siguiente'), 'Aero');
  assert.equal(desde('Bubble', 'letra-anterior'), 'Aero');
  assert.equal(desde('Ébano', 'letra-anterior'), 'Bomber');
  assert.equal(desde('Alien', 'letra-anterior'), 'Zelda');
});

test('X marca favorito y Start abre y cierra Configuración, sin pasar por el menú', () => {
  const marcado = pasos(['derecha', 'favorito']);
  assert.deepEqual(marcado.favoritos, ['sf2', 'mgs']);
  const ajustes = pasos(['ajustes']);
  assert.equal(ajustes.ventana, 'configuracion');
  assert.equal(pasos(['ajustes'], ajustes).ventana, null);
});

test('un mando sin configurar abre «Configurar control» la primera vez que se pulsa', () => {
  const crudo = { mando: 'palanca', nombre: 'Palanca', origen: 'sin-configurar', tipo: 'boton', codigo: 288, valor: 1 };
  const estado = pasos([{ tipo: 'crudo', valor: crudo }]);
  assert.equal(estado.ventana, 'configurar-control');
  assert.equal(estado.mapeo.clave, 'palanca');
  assert.equal(estado.mapeo.paso, 0); // la pulsación que la abrió no cuenta como «arriba»
  const soltado = pasos([{ tipo: 'crudo', valor: { ...crudo, valor: 0 } }]);
  assert.equal(soltado.ventana, null);
});

test('«Probar control» enciende lo que se mantiene pulsado y anota el último código', () => {
  const prueba = pasos(['ajustes', 'derecha', 'derecha', 'aceptar']);
  assert.equal(prueba.ventana, 'prueba-control');
  const pulsado = pasos([{ tipo: 'control', valor: { mando: 'x', control: 'a', pulsado: true } }, { tipo: 'crudo', valor: { mando: 'x', tipo: 'boton', codigo: 304, valor: 1 } }], prueba);
  assert.deepEqual(pulsado.prueba.pulsados, ['a']);
  assert.equal(pulsado.prueba.ultimo, 'botón 304');
  assert.deepEqual(pasos([{ tipo: 'control', valor: { mando: 'x', control: 'a', pulsado: false } }], pulsado).prueba.pulsados, []);
});

test('el pie sigue a la última entrada usada', () => {
  assert.equal(estadoInicial().entrada, 'teclado');
  assert.equal(pasos([{ tipo: 'entrada', valor: 'mando' }]).entrada, 'mando');
});
