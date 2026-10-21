import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { crearNavegacion } from '../core/entrada/navegacion.js';
import { indicesRetroArch, textoPerfil } from '../core/entrada/perfil-retroarch.js';
import { claveDeMando, crearTraductor, limpiarPerfil, normalizar, sigueLaNorma } from '../core/entrada/traductor.js';

const MAPA = JSON.parse(await readFile(new URL('../config/gamepad-map.json', import.meta.url), 'utf8'));

// Un mando de Xbox 360 como lo describe el lector (lector-mandos.py) con el controlador xpad.
const XBOX = {
  id: 'event9', nombre: 'Microsoft X-Box 360 pad', vendor: '045e', producto: '028e',
  botones: [304, 305, 307, 308, 310, 311, 314, 315, 316, 317, 318],
  ejes: { 0: [-32768, 32767, 128, 0], 1: [-32768, 32767, 128, 0], 2: [0, 255, 0, 0], 3: [-32768, 32767, 128, 0], 4: [-32768, 32767, 128, 0], 5: [0, 255, 0, 0], 16: [-1, 1, 0, 0], 17: [-1, 1, 0, 0] },
};

// Reloj de mentira: guarda los temporizadores y los dispara al avanzar el tiempo.
function relojFalso() {
  let ahora = 0;
  let siguienteId = 1;
  const pendientes = new Map();
  return {
    setTimeout(funcion, ms) {
      const id = siguienteId++;
      pendientes.set(id, { cuando: ahora + ms, funcion });
      return id;
    },
    clearTimeout(id) {
      pendientes.delete(id);
    },
    avanzar(ms) {
      const fin = ahora + ms;
      for (;;) {
        const [id, proximo] = [...pendientes].sort((a, b) => a[1].cuando - b[1].cuando)[0] ?? [];
        if (!proximo || proximo.cuando > fin) break;
        pendientes.delete(id);
        ahora = proximo.cuando;
        proximo.funcion();
      }
      ahora = fin;
    },
  };
}

test('los mandos con BTN_SOUTH siguen la norma; las palancas genéricas no', () => {
  assert.equal(sigueLaNorma(XBOX), true);
  assert.equal(sigueLaNorma({ botones: [288, 289, 290] }), false);
  assert.equal(claveDeMando(XBOX), '045e:028e:Microsoft X-Box 360 pad');
});

test('los ejes se llevan a -1…1 o a 0…1 con el rango del propio mando', () => {
  assert.equal(normalizar(-32768, [-32768, 32767]), -1);
  assert.equal(normalizar(128, [0, 255]), (128 - 127.5) / 127.5);
  assert.equal(normalizar(255, [0, 255], false), 1);
  assert.equal(normalizar(0, [0, 255], false), 0);
});

test('A acepta, la cruceta y la palanca dan direcciones y el gatillo cuenta desde su reposo', () => {
  const traducir = crearTraductor(MAPA.estandar, XBOX.ejes, MAPA.umbral);
  assert.deepEqual(traducir({ tipo: 'boton', codigo: 304, valor: 1 }), [{ control: 'a', pulsado: true }]);
  assert.deepEqual(traducir({ tipo: 'eje', codigo: 16, valor: -1 }), [{ control: 'izquierda', pulsado: true }]);
  assert.deepEqual(traducir({ tipo: 'eje', codigo: 16, valor: 1 }), [{ control: 'izquierda', pulsado: false }, { control: 'derecha', pulsado: true }]);
  assert.deepEqual(traducir({ tipo: 'eje', codigo: 16, valor: 0 }), [{ control: 'derecha', pulsado: false }]);
  assert.deepEqual(traducir({ tipo: 'eje', codigo: 5, valor: 200 }), [{ control: 'rt', pulsado: true }]);
  assert.deepEqual(traducir({ tipo: 'eje', codigo: 5, valor: 0 }), [{ control: 'rt', pulsado: false }]);
});

test('una palanca en el borde del umbral no pulsa y suelta sin parar', () => {
  const traducir = crearTraductor(MAPA.estandar, XBOX.ejes, MAPA.umbral);
  assert.equal(traducir({ tipo: 'eje', codigo: 0, valor: 20000 }).length, 1); // 0.61: pulsa derecha
  assert.deepEqual(traducir({ tipo: 'eje', codigo: 0, valor: 14000 }), []); // 0.43: aún no suelta
  assert.deepEqual(traducir({ tipo: 'eje', codigo: 0, valor: 9000 }), [{ control: 'derecha', pulsado: false }]); // 0.27
});

test('al mantener una dirección se repite tras 380 ms y luego cada 90 ms; soltar la detiene', () => {
  const reloj = relojFalso();
  const emitidas = [];
  const navegacion = crearNavegacion({ acciones: MAPA.acciones, repeticion: MAPA.repeticion, emitir: (accion) => emitidas.push(accion), reloj });
  navegacion.cambiar({ control: 'derecha', pulsado: true });
  assert.deepEqual(emitidas, ['derecha']);
  reloj.avanzar(379);
  assert.equal(emitidas.length, 1);
  reloj.avanzar(1);
  assert.equal(emitidas.length, 2);
  reloj.avanzar(90 * 5);
  assert.equal(emitidas.length, 7);
  navegacion.cambiar({ control: 'derecha', pulsado: false });
  reloj.avanzar(1000);
  assert.equal(emitidas.length, 7);
});

test('los botones que no son direcciones no se repiten y cada uno da su acción', () => {
  const reloj = relojFalso();
  const emitidas = [];
  const navegacion = crearNavegacion({ acciones: MAPA.acciones, repeticion: MAPA.repeticion, emitir: (accion) => emitidas.push(accion), reloj });
  for (const control of ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'menu', 'view']) {
    navegacion.cambiar({ control, pulsado: true });
    reloj.avanzar(1000);
    navegacion.cambiar({ control, pulsado: false });
  }
  assert.deepEqual(emitidas, ['aceptar', 'volver', 'favorito', 'buscar', 'sistema-anterior', 'sistema-siguiente', 'letra-anterior', 'letra-siguiente', 'ajustes', 'filtro']);
});

test('soltarTodo corta cualquier repetición, por ejemplo al abrir un emulador', () => {
  const reloj = relojFalso();
  const emitidas = [];
  const navegacion = crearNavegacion({ acciones: MAPA.acciones, repeticion: MAPA.repeticion, emitir: (accion) => emitidas.push(accion), reloj });
  navegacion.cambiar({ control: 'abajo', pulsado: true });
  navegacion.soltarTodo();
  reloj.avanzar(2000);
  assert.deepEqual(emitidas, ['abajo']);
});

test('RetroArch numera los botones del Xbox 360 como su propio perfil (A=0, B=1, X=2, Y=3)', () => {
  const { boton, eje } = indicesRetroArch(XBOX);
  assert.deepEqual([304, 305, 307, 308, 310, 311, 314, 315].map((codigo) => boton.get(codigo)), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((codigo) => eje.get(codigo)), [0, 1, 2, 3, 4, 5]);
  assert.equal(eje.has(16), false); // las crucetas van aparte, como h0
});

test('el perfil de RetroArch de una palanca de arcade usa su numeración y la cruceta como ejes', () => {
  const palanca = {
    nombre: 'DragonRise Inc. Generic USB Joystick', vendor: '0079', producto: '0006',
    botones: [288, 289, 290, 291, 292, 293, 294, 295, 296, 297], ejes: { 0: [0, 255, 15, 127], 1: [0, 255, 15, 127] },
  };
  const perfil = { botones: { 290: 'a', 289: 'b', 297: 'menu', 296: 'view' }, ejes: { 0: ['izquierda', 'derecha'], 1: ['arriba', 'abajo'] } };
  const texto = textoPerfil(palanca, perfil);
  assert.match(texto, /^input_device = "DragonRise Inc\. Generic USB Joystick"$/m);
  assert.match(texto, /^input_vendor_id = "121"$/m);
  assert.match(texto, /^input_b_btn = "2"$/m); // A de Xbox es B del RetroPad (abajo)
  assert.match(texto, /^input_a_btn = "1"$/m);
  assert.match(texto, /^input_start_btn = "9"$/m);
  assert.match(texto, /^input_select_btn = "8"$/m);
  assert.match(texto, /^input_left_axis = "-0"$/m);
  assert.match(texto, /^input_down_axis = "\+1"$/m);
});

test('la cruceta de un perfil propio se escribe como h0 en RetroArch', () => {
  const texto = textoPerfil(XBOX, { botones: {}, ejes: { 16: ['izquierda', 'derecha'], 17: ['arriba', 'abajo'] } });
  assert.match(texto, /^input_left_btn = "h0left"$/m);
  assert.match(texto, /^input_up_btn = "h0up"$/m);
  assert.match(texto, /^input_down_btn = "h0down"$/m);
});

test('un mapeo que llega de la interfaz se limpia antes de guardarse', () => {
  const limpio = limpiarPerfil({ botones: { 288: 'a', abc: 'b', 289: 'borrar-todo' }, ejes: { 0: ['izquierda', 'derecha'], 1: ['nada', null], 2: 'x' } });
  assert.deepEqual(limpio, { botones: { 288: 'a' }, ejes: { 0: ['izquierda', 'derecha'] } });
});
