import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

import { AJUSTES_INICIALES as AJUSTES_INTERFAZ } from '../app/ajustes.js';
import { AJUSTES_INICIALES, crearAlmacen, datosIniciales, limpiarDatos, MAX_RECIENTES } from '../core/almacenamiento/almacenamiento.js';
import { conClaves } from '../core/lanzador/retroarch-cfg.js';

const temporales = [];
after(() => Promise.all(temporales.map((carpeta) => rm(carpeta, { recursive: true, force: true }))));

test('la interfaz y el núcleo usan los mismos ajustes de fábrica', () => {
  assert.deepEqual(AJUSTES_INTERFAZ, AJUSTES_INICIALES);
});

test('solo se guarda lo que tiene la forma esperada', () => {
  const limpio = limpiarDatos({
    favoritos: ['snes/a.sfc', 'snes/a.sfc', 3, ''],
    recientes: [{ id: 'x', fecha: '2026-10-20T10:00:00Z' }, { id: 'x', fecha: '2026-10-21T10:00:00Z' }, { id: 'y', fecha: 'ayer' }],
    ultimoPorSistema: { snes: 'snes/a.sfc', malo: 7 },
    ultimoSistema: 'snes',
    perfil: 'administrador',
    ajustes: { crt: false, neon: 'cegador', volumen: 250, tema: 'magenta', salir: 'mantener-start', imagen: 'crt-suave', extra: 1 },
    otro: 'campo',
  });
  assert.deepEqual(limpio.favoritos, ['snes/a.sfc']);
  assert.deepEqual(limpio.recientes, [{ id: 'x', fecha: '2026-10-20T10:00:00Z' }]);
  assert.deepEqual(limpio.ultimoPorSistema, { snes: 'snes/a.sfc' });
  assert.equal(limpio.perfil, 'normal');
  assert.deepEqual(limpio.ajustes, { ...AJUSTES_INICIALES, crt: false, tema: 'magenta', salir: 'mantener-start', imagen: 'crt-suave' });
  assert.equal(limpiarDatos({ ajustes: { imagen: 'hq9x' } }).ajustes.imagen, AJUSTES_INICIALES.imagen);
  assert.equal(limpio.otro, undefined);
  const muchos = limpiarDatos({ recientes: Array.from({ length: 80 }, (_, i) => ({ id: `j${i}`, fecha: '2026-10-20T10:00:00Z' })) });
  assert.equal(muchos.recientes.length, MAX_RECIENTES);
});

test('las partidas se guardan solo con veces y segundos enteros', () => {
  const limpio = limpiarDatos({
    partidas: { 'psx/ff7.m3u': { veces: 3, segundos: 5400, extra: 1 }, malo: { veces: -1, segundos: 2 }, otro: { veces: 1.5, segundos: 1 }, nada: null },
  });
  assert.deepEqual(limpio.partidas, { 'psx/ff7.m3u': { veces: 3, segundos: 5400 } });
  assert.deepEqual(limpiarDatos({ partidas: [1, 2] }).partidas, {});
});

test('se escribe un JSON legible, juntando los cambios seguidos, y se lee igual al volver', async () => {
  const carpeta = await mkdtemp(path.join(os.tmpdir(), 'neo-arcade-datos-'));
  temporales.push(carpeta);
  const archivo = path.join(carpeta, 'datos-usuario.json');
  const almacen = crearAlmacen(archivo, { esperaMs: 50 });
  assert.deepEqual(await almacen.cargar(), datosIniciales());
  almacen.guardar({ favoritos: ['a'] });
  almacen.guardar({ favoritos: ['a', 'b'], ultimoSistema: 'snes' });
  await almacen.vaciar();
  const texto = await readFile(archivo, 'utf8');
  assert.match(texto, /\n {2}"favoritos": \[/);
  const leido = await crearAlmacen(archivo).cargar();
  assert.deepEqual(leido.favoritos, ['a', 'b']);
  assert.equal(leido.ultimoSistema, 'snes');
  await writeFile(archivo, '{ esto no es JSON');
  assert.deepEqual(await crearAlmacen(archivo).cargar(), datosIniciales());
});

test('la combinación para salir se escribe en retroarch.cfg sin tocar lo demás', () => {
  const antes = 'video_fullscreen = "false"\ninput_quit_gamepad_combo = "4"\n';
  assert.equal(conClaves(antes, { input_quit_gamepad_combo: '7' }), 'video_fullscreen = "false"\ninput_quit_gamepad_combo = "7"\n');
  assert.equal(conClaves('a = "1"', { b: '2' }), 'a = "1"\nb = "2"\n');
  assert.equal(conClaves('', { b: '2' }), 'b = "2"\n');
});
