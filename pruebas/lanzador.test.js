import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

import { cargarConfiguracion } from '../core/configuracion.js';
import { armarComando, comandoLegible, ejecutar, ErrorLanzamiento, rutaNucleo, verificar } from '../core/lanzador/lanzador.js';

const temporales = [];
after(() => Promise.all(temporales.map((carpeta) => rm(carpeta, { recursive: true, force: true }))));

async function carpetaTemporal() {
  const carpeta = await mkdtemp(path.join(os.tmpdir(), 'neo-arcade-lanzador-'));
  temporales.push(carpeta);
  return carpeta;
}

const configuracion = await cargarConfiguracion({});
const sistema = (id) => configuracion.sistemas.find((candidato) => candidato.id === id);

test('RetroArch se lanza a pantalla completa con su núcleo y el juego, sin shell de por medio', () => {
  const { programa, argumentos } = armarComando(sistema('snes'), '/juegos/snes/Mi juego (USA).sfc', configuracion.emuladores);
  assert.equal(programa, 'flatpak');
  assert.deepEqual(argumentos, [
    'run', 'org.libretro.RetroArch', '-f', '-L',
    rutaNucleo(configuracion.emuladores.retroarch, 'snes9x'), '/juegos/snes/Mi juego (USA).sfc',
  ]);
});

test('Dolphin y PPSSPP usan sus propios comandos', () => {
  const gamecube = armarComando(sistema('gamecube'), '/j/juego.rvz', configuracion.emuladores);
  assert.deepEqual([gamecube.programa, ...gamecube.argumentos].slice(-4), ['-C', 'Dolphin.Display.Fullscreen=True', '-e', '/j/juego.rvz']);
  const psp = armarComando(sistema('psp'), '/j/juego.iso', configuracion.emuladores);
  assert.deepEqual(psp.argumentos.slice(-2), ['--fullscreen', '/j/juego.iso']);
});

test('un sistema con un emulador que no existe da un mensaje claro', () => {
  assert.throws(() => armarComando({ ...sistema('snes'), emulador: 'otro' }, '/j', configuracion.emuladores), ErrorLanzamiento);
});

test('verificar avisa si falta el juego, el programa o el núcleo', async () => {
  const carpeta = await carpetaTemporal();
  const juego = path.join(carpeta, 'juego.sfc');
  await writeFile(juego, '');
  const emuladores = {
    retroarch: { nombre: 'RetroArch', comando: ['programa-que-no-existe'], carpetaNucleos: carpeta },
  };
  const snes = sistema('snes');
  await assert.rejects(verificar(armarComando(snes, path.join(carpeta, 'otro.sfc'), emuladores), snes, path.join(carpeta, 'otro.sfc')), /No encuentro el archivo del juego/);
  await assert.rejects(verificar(armarComando(snes, juego, emuladores), snes, juego), /RetroArch no está instalado/);
  const conBash = { retroarch: { ...emuladores.retroarch, comando: ['bash'] } };
  await assert.rejects(verificar(armarComando(snes, juego, conBash), snes, juego), /Falta el núcleo Snes9x de RetroArch/);
  await writeFile(path.join(carpeta, 'snes9x_libretro.so'), '');
  await verificar(armarComando(snes, juego, conBash), snes, juego);
});

test('ejecutar espera a que el emulador cierre y devuelve su código de salida', async () => {
  const carpeta = await carpetaTemporal();
  const emulador = path.join(carpeta, 'emulador-falso.sh');
  await writeFile(emulador, '#!/usr/bin/env bash\nsleep 0.3\nexit 3\n');
  await chmod(emulador, 0o755);
  const { codigo, duracionMs } = await ejecutar({ programa: emulador, argumentos: [] });
  assert.equal(codigo, 3);
  assert.ok(duracionMs >= 250, `duró ${duracionMs} ms`);
});

test('el registro muestra el comando como se escribiría en una terminal', () => {
  assert.equal(comandoLegible({ programa: 'flatpak', argumentos: ['run', '/j/Mi juego.sfc'] }), "flatpak run '/j/Mi juego.sfc'");
});

test('la configuración real tiene los 21 sistemas del plan, cada uno con un emulador configurado', () => {
  const carpetas = configuracion.sistemas.map((candidato) => candidato.carpeta);
  assert.deepEqual(carpetas, ['arcade', 'neogeo', 'cps', 'nes', 'snes', 'n64', 'gb', 'gbc', 'gba', 'gamecube',
    'mastersystem', 'megadrive', 'segacd', 'sega32x', 'gamegear', 'dreamcast', 'psx', 'psp', 'pcengine', 'atari2600', 'ports']);
  for (const candidato of configuracion.sistemas) {
    assert.ok(configuracion.emuladores[candidato.emulador], `${candidato.id}: emulador ${candidato.emulador}`);
    if (candidato.emulador === 'retroarch') assert.ok(candidato.nucleo, `${candidato.id}: falta el núcleo`);
    assert.ok(candidato.comando.includes('{juego}'), `${candidato.id}: el comando no recibe el juego`);
  }
});
