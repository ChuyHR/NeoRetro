import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

import { cargarConfiguracion } from '../core/configuracion.js';
import { armarComando } from '../core/lanzador/lanzador.js';
import { leerClaves, restaurarClaves } from '../core/lanzador/retroarch-cfg.js';
import { conArgumentos, elegirPerfil, lineasCfg, prepararVisual, ubicarShader } from '../core/lanzador/visual.js';

const temporales = [];
after(() => Promise.all(temporales.map((carpeta) => rm(carpeta, { recursive: true, force: true }))));

async function carpetaTemporal() {
  const carpeta = await mkdtemp(path.join(os.tmpdir(), 'neo-arcade-visual-'));
  temporales.push(carpeta);
  return carpeta;
}

const configuracion = await cargarConfiguracion({});

// Un RetroArch de prueba con su carpeta de shaders «del equipo» en una carpeta temporal.
async function emuladorDePrueba(shaders = []) {
  const equipo = await carpetaTemporal();
  for (const shader of shaders) {
    await mkdir(path.dirname(path.join(equipo, shader)), { recursive: true });
    await writeFile(path.join(equipo, shader), 'shaders = 1\n');
  }
  return { ...configuracion.emuladores.retroarch, shaders: { enEmulador: '/app/share/libretro/shaders', enEquipo: [equipo] } };
}

const VISUAL = {
  activo: true,
  predeterminado: 'original',
  perfiles: {
    original: { retroarch: {} },
    nitido: { retroarch: { video_scale_integer: 'false', video_shader_enable: 'true' }, shader: 'shaders_glsl/interpolation/sharp-bilinear-simple.glslp' },
    entero: { retroarch: { video_scale_integer: 'true', video_shader_enable: 'false' } },
  },
  porSistema: { neogeo: 'nitido' },
  porJuego: { 'neogeo/mslug.zip': 'entero' },
};

test('a cada juego le toca su perfil, el de su sistema o el predeterminado', () => {
  assert.equal(elegirPerfil(VISUAL, 'neogeo', 'neogeo/mslug.zip'), 'entero');
  assert.equal(elegirPerfil(VISUAL, 'neogeo', 'neogeo/kof98.zip'), 'nitido');
  assert.equal(elegirPerfil(VISUAL, 'n64', 'n64/mario.z64'), 'original');
  assert.equal(elegirPerfil({ ...VISUAL, activo: false }, 'neogeo', 'neogeo/kof98.zip'), null);
  assert.equal(elegirPerfil(null, 'neogeo', 'neogeo/kof98.zip'), null);
});

test('un ajuste que podría colar otras claves en el .cfg se rechaza', () => {
  assert.deepEqual(lineasCfg({ video_scale_integer: 'true', video_smooth: false }), ['video_scale_integer = "true"', 'video_smooth = "false"']);
  assert.equal(lineasCfg({ 'video scale': 'true' }), null);
  assert.equal(lineasCfg({ video_scale_integer: 'true"\nconfig_save_on_exit = "true' }), null);
  assert.equal(lineasCfg({ video_scale_integer: { valor: 1 } }), null);
});

test('el shader se busca en el equipo y se entrega como lo ve RetroArch', async () => {
  const emulador = await emuladorDePrueba(['shaders_glsl/crt/zfast-crt.glslp']);
  assert.equal(await ubicarShader('shaders_glsl/crt/zfast-crt.glslp', emulador), '/app/share/libretro/shaders/shaders_glsl/crt/zfast-crt.glslp');
  assert.equal(await ubicarShader('shaders_glsl/crt/no-existe.glslp', emulador), null);
  assert.equal(await ubicarShader('../../../etc/passwd', emulador), null);
  assert.equal(await ubicarShader('/etc/passwd', emulador), null);
});

test('con un perfil y su shader, el .cfg del perfil va con --appendconfig y el shader con --set-shader', async () => {
  const emulador = await emuladorDePrueba(['shaders_glsl/interpolation/sharp-bilinear-simple.glslp']);
  const carpeta = await carpetaTemporal();
  const visual = await prepararVisual(VISUAL, { sistemaId: 'neogeo', juegoId: 'neogeo/kof98.zip', emulador, carpeta });
  const archivo = path.join(carpeta, 'retroarch-perfil-visual.cfg');
  assert.equal(visual.perfil, 'nitido');
  assert.deepEqual(visual.argumentos, ['--appendconfig', archivo, '--set-shader=/app/share/libretro/shaders/shaders_glsl/interpolation/sharp-bilinear-simple.glslp']);
  assert.deepEqual(visual.claves, ['video_scale_integer', 'video_shader_enable']);
  assert.match(await readFile(archivo, 'utf8'), /^video_scale_integer = "false"$/m);
});

test('con vulkan o glcore se usa la variante slang del shader; con gl, la GLSL', async () => {
  const glsl = 'shaders_glsl/interpolation/sharp-bilinear-simple.glslp';
  const slang = 'shaders_slang/pixel-art-scaling/sharp-bilinear-simple.slangp';
  const base = await emuladorDePrueba([glsl, slang]);
  const carpeta = await carpetaTemporal();
  const visual = { ...VISUAL, perfiles: { ...VISUAL.perfiles, nitido: { ...VISUAL.perfiles.nitido, shaderSlang: slang } } };
  for (const [driver, esperado] of [['vulkan', slang], ['glcore', slang], ['gl', glsl]]) {
    const cfg = path.join(carpeta, `${driver}.cfg`);
    await writeFile(cfg, `video_driver = "${driver}"\n`);
    const { argumentos } = await prepararVisual(visual, { sistemaId: 'neogeo', juegoId: 'neogeo/kof98.zip', emulador: { ...base, archivoConfiguracion: cfg }, carpeta });
    assert.equal(argumentos.at(-1), `--set-shader=/app/share/libretro/shaders/${esperado}`, driver);
  }
  // Sin variante para ese driver: el juego se abre como siempre.
  const cfg = path.join(carpeta, 'vulkan.cfg');
  const sinSlang = await prepararVisual(VISUAL, { sistemaId: 'neogeo', juegoId: 'neogeo/kof98.zip', emulador: { ...base, archivoConfiguracion: cfg }, carpeta });
  assert.deepEqual(sinSlang.argumentos, []);
  assert.match(sinSlang.motivo, /no tiene shader para el driver vulkan/);
});

test('un perfil sin shader apaga además los presets automáticos de RetroArch', async () => {
  const visual = await prepararVisual(VISUAL, { sistemaId: 'neogeo', juegoId: 'neogeo/mslug.zip', emulador: await emuladorDePrueba(), carpeta: await carpetaTemporal() });
  assert.equal(visual.perfil, 'entero');
  assert.equal(visual.argumentos.at(-1), '--set-shader=');
});

test('si algo del perfil falla, el juego se abre como siempre y queda el motivo', async () => {
  const carpeta = await carpetaTemporal();
  const sinShader = await prepararVisual(VISUAL, { sistemaId: 'neogeo', juegoId: 'neogeo/kof98.zip', emulador: await emuladorDePrueba(), carpeta });
  assert.deepEqual(sinShader.argumentos, []);
  assert.match(sinShader.motivo, /no está el shader/);

  const emulador = await emuladorDePrueba(['shaders_glsl/interpolation/sharp-bilinear-simple.glslp']);
  const inexistente = await prepararVisual({ ...VISUAL, porSistema: { neogeo: 'no-existe' } }, { sistemaId: 'neogeo', juegoId: 'neogeo/kof98.zip', emulador, carpeta });
  assert.deepEqual(inexistente.argumentos, []);
  assert.match(inexistente.motivo, /no existe el perfil/);

  const invalido = await prepararVisual({ ...VISUAL, perfiles: { ...VISUAL.perfiles, nitido: { retroarch: { 'mala clave': '1' } } } },
    { sistemaId: 'neogeo', juegoId: 'neogeo/kof98.zip', emulador, carpeta });
  assert.deepEqual(invalido.argumentos, []);

  const otroEmulador = await prepararVisual(VISUAL, { sistemaId: 'neogeo', juegoId: 'neogeo/kof98.zip', emulador: configuracion.emuladores.ppsspp, carpeta });
  assert.deepEqual(otroEmulador.argumentos, []);

  const original = await prepararVisual(VISUAL, { sistemaId: 'n64', juegoId: 'n64/mario.z64', emulador, carpeta });
  assert.deepEqual(original.argumentos, []);
  assert.equal(original.motivo, 'perfil sin cambios');
});

test('los argumentos del perfil van después del emulador y antes de los del sistema', () => {
  const sistema = configuracion.sistemas.find((s) => s.id === 'neogeo');
  const comando = armarComando(sistema, '/j/mslug.zip', configuracion.emuladores);
  const con = conArgumentos(comando, ['--appendconfig', '/d/p.cfg', '--set-shader=']);
  assert.deepEqual(con.argumentos.slice(0, 5), ['run', 'org.libretro.RetroArch', '--appendconfig', '/d/p.cfg', '--set-shader=']);
  assert.deepEqual(con.argumentos.slice(5, 7), ['-f', '-L']);
  assert.equal(con.argumentos.at(-1), '/j/mslug.zip');
  assert.equal(conArgumentos(comando, []), comando);
});

test('lo que RetroArch guardó del perfil al cerrar se devuelve como estaba', async () => {
  const archivo = path.join(await carpetaTemporal(), 'retroarch.cfg');
  await writeFile(archivo, 'video_scale_integer = "false"\ninput_quit_gamepad_combo = "4"\n');
  const previas = await leerClaves(archivo, ['video_scale_integer', 'video_shader_enable']);
  assert.deepEqual(previas, { video_scale_integer: 'false', video_shader_enable: null });
  // Así deja RetroArch el archivo al cerrar con el perfil (caso 5 de probar-fallas.sh).
  await writeFile(archivo, 'video_scale_integer = "true"\ninput_quit_gamepad_combo = "4"\nvideo_shader_enable = "true"\n');
  assert.equal(await restaurarClaves(archivo, previas), true);
  assert.equal(await readFile(archivo, 'utf8'), 'video_scale_integer = "false"\ninput_quit_gamepad_combo = "4"\n');
  assert.equal(await restaurarClaves(archivo, previas), false); // ya estaba como antes: no se reescribe
});

test('config/visual.json: perfiles válidos y sistemas que existen', () => {
  const { visual } = configuracion;
  assert.ok(visual?.activo);
  assert.ok(visual.perfiles[visual.predeterminado]);
  for (const [nombre, perfil] of Object.entries(visual.perfiles)) {
    assert.ok(lineasCfg(perfil.retroarch), `ajustes de ${nombre}`);
    for (const shader of [perfil.shader, perfil.shaderSlang].filter(Boolean)) {
      assert.ok(!shader.includes('..') && !path.isAbsolute(shader), `shader de ${nombre}`);
    }
    if (perfil.shader) assert.ok(perfil.shaderSlang, `${nombre} necesita también su variante slang`);
  }
  const ids = new Set(configuracion.sistemas.map((s) => s.id));
  for (const [sistema, perfil] of Object.entries(visual.porSistema)) {
    assert.ok(ids.has(sistema), `sistema ${sistema}`);
    assert.ok(visual.perfiles[perfil], `perfil ${perfil}`);
  }
});

test('un visual.json con un error no impide cargar la configuración', async () => {
  const carpeta = await carpetaTemporal();
  await writeFile(path.join(carpeta, 'visual.json'), '{ esto no es json');
  const conError = await cargarConfiguracion({ NEO_ARCADE_CONFIG: carpeta });
  assert.equal(conError.visual, null);
  assert.ok(conError.errorVisual);
  assert.ok(conError.sistemas.length > 0);
});
