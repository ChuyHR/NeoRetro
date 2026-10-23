import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AJUSTES_INICIALES } from '../app/ajustes.js';
import { DATOS } from '../app/datos-ejemplo.js';
import { aplicar, estadoInicial, juegosDeLaVista, juegosDelSistema, sistemasDeLaBarra } from '../app/estado.js';

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
  assert.equal(apagado.ajustes.crt, false);
  assert.equal(pasos(['izquierda', 'aceptar'], apagado).ajustes.crt, true);
});

test('Configuración va por filas: arriba y abajo cambian de ajuste, izquierda y derecha de opción', () => {
  const configuracion = pasos(['ajustes']);
  const abajo = (veces) => Array(veces).fill('abajo');
  assert.equal(pasos([...abajo(1), 'derecha', 'aceptar'], configuracion).ajustes.neon, 'bajo');
  assert.equal(pasos([...abajo(2), 'derecha', 'aceptar'], configuracion).ajustes.animaciones, false);
  assert.equal(pasos([...abajo(3), 'aceptar'], configuracion).ajustes.volumen, 60);
  assert.equal(pasos([...abajo(3), 'derecha', 'aceptar', 'aceptar'], configuracion).ajustes.volumen, 90);
  assert.equal(pasos([...abajo(4), 'derecha', 'derecha', 'aceptar'], configuracion).ajustes.tema, 'violeta');
  assert.equal(pasos([...abajo(5), 'derecha', 'aceptar'], configuracion).ajustes.salir, 'mantener-start');
  assert.equal(pasos([...abajo(6), 'aceptar'], configuracion).ajustes.imagen, 'original');
  assert.equal(pasos([...abajo(6), 'derecha', 'aceptar'], configuracion).ajustes.imagen, 'nitido');
  assert.equal(pasos([...abajo(6), 'derecha', 'derecha', 'derecha', 'aceptar'], configuracion).ajustes.imagen, 'crt-suave');
  assert.equal(pasos([...abajo(7), 'derecha', 'aceptar'], configuracion).ajustes.continuar, false);
  assert.equal(pasos([...abajo(8), 'derecha', 'aceptar'], configuracion).ajustes.menu, 'ninguno');
  assert.equal(pasos([...abajo(9), 'aceptar'], configuracion).ventana, 'prueba-control');
  assert.equal(pasos([...abajo(12), 'aceptar'], configuracion).ventana, null);
});

test('Restablecer pide una segunda pulsación y devuelve los ajustes de fábrica', () => {
  const cambiados = pasos(['ajustes', 'derecha', 'aceptar', 'abajo', 'derecha', 'aceptar']);
  assert.equal(cambiados.ajustes.crt, false);
  assert.equal(cambiados.ajustes.neon, 'bajo');
  const una = pasos(['abajo', 'abajo', 'abajo', 'abajo', 'abajo', 'abajo', 'abajo', 'abajo', 'abajo', 'abajo', 'aceptar'], cambiados);
  assert.equal(una.confirmar, 'restablecer');
  assert.equal(una.ajustes.neon, 'bajo');
  const dos = pasos(['aceptar'], una);
  assert.deepEqual(dos.ajustes, AJUSTES_INICIALES);
  assert.equal(dos.confirmar, null);
});

test('al cambiar de sistema, si el juego no está ahí se elige el primero de ese sistema', () => {
  const arcade = pasos(['sistema-siguiente']);
  assert.equal(arcade.sistema, 'arcade');
  assert.equal(arcade.seleccion, 'pacman');
  const snes = pasos([{ tipo: 'elegir-sistema', valor: 'snes' }]);
  assert.equal(snes.seleccion, 'sf2');
  // Desde «todos», el anterior es el último de la barra: Favoritos (en la demostración, sf2 lo es).
  assert.equal(pasos(['sistema-anterior']).sistema, 'favoritos');
  assert.equal(pasos(['sistema-anterior', 'sistema-anterior']).sistema, 'ports');
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
  const prueba = pasos(['ajustes', 'abajo', 'abajo', 'abajo', 'abajo', 'abajo', 'abajo', 'abajo', 'abajo', 'abajo', 'aceptar']);
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

test('Apagar y Reiniciar piden una segunda pulsación; moverse cancela la confirmación', () => {
  const equipo = pasos(['ajustes', 'abajo', 'abajo', 'abajo', 'abajo', 'abajo', 'abajo', 'abajo', 'abajo', 'abajo', 'abajo']);
  const una = pasos(['aceptar'], equipo);
  assert.equal(una.confirmar, 'apagar');
  assert.equal(una.equipo, null);
  assert.equal(pasos(['aceptar'], una).equipo, 'apagar');
  assert.equal(pasos(['derecha', 'aceptar'], una).confirmar, 'reiniciar');
  assert.equal(pasos(['derecha', 'aceptar', 'aceptar'], una).equipo, 'reiniciar');
  assert.equal(pasos(['equipo-hecho'], pasos(['aceptar'], una)).equipo, null);
});

test('Favoritos aparece al final de la barra cuando hay alguno y se va al quitar el último', () => {
  const barra = (estado) => sistemasDeLaBarra(DATOS, estado).map(({ id }) => id);
  assert.equal(barra(estadoInicial()).includes('favoritos'), false);
  const demo = estadoInicial(DEMO);
  assert.equal(barra(demo).at(-1), 'favoritos');
  assert.equal(barra(demo).slice(0, 12).join(), DATOS.sistemas.map(({ id }) => id).join()); // los sistemas no se mueven
  const enFavoritos = pasos([{ tipo: 'elegir-sistema', valor: 'favoritos' }]);
  assert.deepEqual(juegosDeLaVista(DATOS, enFavoritos).map(({ id }) => id), ['sf2']);
  const sinFavoritos = pasos(['favorito'], enFavoritos);
  assert.equal(sinFavoritos.sistema, 'todos');
});

test('al quitar un favorito desde Favoritos se elige el que quedó en su lugar', () => {
  const tres = pasos(['derecha', 'favorito', 'derecha', 'favorito', { tipo: 'elegir-sistema', valor: 'favoritos' }]);
  const lista = juegosDeLaVista(DATOS, tres).map(({ id }) => id);
  assert.equal(lista.length, 3);
  const quitado = pasos([{ tipo: 'seleccionar', valor: lista[1] }, 'favorito'], tres);
  assert.equal(juegosDeLaVista(DATOS, quitado).length, 2);
  assert.equal(quitado.seleccion, lista[2]);
});

test('cada partida suma una vez y su tiempo al juego', () => {
  const jugado = (id, segundos) => ({ tipo: 'jugado', valor: { id, fecha: '2026-10-20T10:00:00Z', segundos } });
  const estado = pasos([jugado('mgs', 600.4), jugado('zelda', 30), jugado('mgs', 1200), jugado('mgs')]);
  assert.deepEqual(estado.partidas, { mgs: { veces: 3, segundos: 1800 }, zelda: { veces: 1, segundos: 30 } });
});

test('Recientes guarda el último primero, sin repetir, y View recorre los filtros', () => {
  const jugado = (id, fecha) => ({ tipo: 'jugado', valor: { id, fecha } });
  const estado = pasos([jugado('mgs', '2026-10-20T10:00:00Z'), jugado('zelda', '2026-10-20T11:00:00Z'), jugado('mgs', '2026-10-20T12:00:00Z')]);
  assert.deepEqual(estado.recientes.map(({ id }) => id), ['mgs', 'zelda']);
  const filtro = pasos(['filtro'], estado);
  assert.equal(filtro.sistema, 'favoritos');
  const recientes = pasos(['filtro'], filtro);
  assert.equal(recientes.sistema, 'recientes');
  assert.deepEqual(juegosDeLaVista(DATOS, recientes).map(({ id }) => id), ['mgs', 'zelda']);
  assert.equal(pasos(['filtro'], recientes).sistema, 'todos');
  const desdeSnes = pasos([{ tipo: 'elegir-sistema', valor: 'snes' }, 'filtro'], estado);
  assert.equal(desdeSnes.sistema, 'favoritos');
});

test('Buscar: con el teclado físico se escribe y Enter busca; con el mando, A pulsa la tecla marcada', () => {
  const abierto = pasos([{ tipo: 'escribir', valor: 'M' }]);
  assert.equal(abierto.ventana, 'buscar');
  const escrito = pasos([{ tipo: 'escribir', valor: 'E' }, { tipo: 'escribir', valor: 'G' }, 'aceptar'], abierto);
  assert.equal(escrito.ventana, null);
  assert.equal(escrito.busqueda, 'MEG');
  assert.equal(escrito.sistema, 'busqueda');
  assert.deepEqual(juegosDeLaVista(DATOS, escrito).map(({ id }) => id), ['megaman']);
  assert.equal(pasos(['volver'], escrito).sistema, 'todos');
  const conMando = pasos([{ tipo: 'entrada', valor: 'mando' }, 'buscar', 'abajo', 'aceptar']);
  assert.equal(conMando.escribiendo, 'Q');
  assert.equal(pasos(['volver'], conMando).escribiendo, '');
  assert.equal(pasos(['volver', 'volver'], conMando).ventana, null);
});

test('al volver a un sistema se recupera el juego que quedó elegido en él', () => {
  const nes = pasos([{ tipo: 'elegir-sistema', valor: 'nes' }, 'derecha']);
  assert.equal(nes.seleccion, 'megaman');
  const otra = pasos([{ tipo: 'elegir-sistema', valor: 'snes' }, { tipo: 'elegir-sistema', valor: 'nes' }], nes);
  assert.equal(otra.seleccion, 'megaman');
});
