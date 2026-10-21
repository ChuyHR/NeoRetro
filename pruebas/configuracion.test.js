import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

import { cargarConfiguracion, carpetasDelUsuario, RAIZ } from '../core/configuracion.js';
import { crearRegistro } from '../core/registro.js';

const temporales = [];
after(() => Promise.all(temporales.map((carpeta) => rm(carpeta, { recursive: true, force: true }))));

async function carpetaTemporal() {
  const carpeta = await mkdtemp(path.join(os.tmpdir(), 'neo-arcade-config-'));
  temporales.push(carpeta);
  return carpeta;
}

// Lo que escribe instalar-neo-arcade.sh en ~/NeoRetro/config.
const BIBLIOTECA_CONSOLA = { roms: '~/NeoRetro/roms', medios: '~/NeoRetro/media', datos: '~/NeoRetro/config', registros: '~/NeoRetro/logs' };

test('la carpeta de configuración propia solo necesita los archivos que cambian', async () => {
  const carpeta = await carpetaTemporal();
  await writeFile(path.join(carpeta, 'biblioteca.json'), JSON.stringify(BIBLIOTECA_CONSOLA));
  const configuracion = await cargarConfiguracion({ NEO_ARCADE_CONFIG: carpeta });
  const casa = os.homedir();
  assert.equal(configuracion.carpetaRoms, path.join(casa, 'NeoRetro', 'roms'));
  assert.equal(configuracion.carpetaMedios, path.join(casa, 'NeoRetro', 'media'));
  assert.equal(configuracion.carpetaDatos, path.join(casa, 'NeoRetro', 'config'));
  assert.equal(configuracion.carpetaRegistros, path.join(casa, 'NeoRetro', 'logs'));
  // Los demás vienen de la app.
  const deLaApp = JSON.parse(await readFile(path.join(RAIZ, 'config', 'systems.json'), 'utf8'));
  assert.equal(configuracion.sistemas.length, deLaApp.sistemas.length);
});

test('un archivo propio con un error se avisa, no se cambia por el de la app', async () => {
  const carpeta = await carpetaTemporal();
  await writeFile(path.join(carpeta, 'systems.json'), '{ esto no es JSON');
  await assert.rejects(cargarConfiguracion({ NEO_ARCADE_CONFIG: carpeta }), SyntaxError);
});

test('sin datos ni registros en la configuración, van en la carpeta de datos de la app', async () => {
  const configuracion = await cargarConfiguracion({});
  assert.equal(configuracion.carpetaDatos, null);
  assert.deepEqual(carpetasDelUsuario(configuracion, '/datos/app', {}), { datos: '/datos/app', registros: path.join('/datos/app', 'registros') });
  const consola = { carpetaDatos: '/casa/NeoRetro/config', carpetaRegistros: '/casa/NeoRetro/logs' };
  assert.deepEqual(carpetasDelUsuario(consola, '/datos/app', {}), { datos: '/casa/NeoRetro/config', registros: '/casa/NeoRetro/logs' });
  // Las pruebas apartan todo con NEO_ARCADE_DATOS, aunque la configuración diga otra cosa.
  assert.deepEqual(carpetasDelUsuario(consola, '/datos/app', { NEO_ARCADE_DATOS: '/prueba' }), { datos: '/prueba', registros: path.join('/prueba', 'registros') });
});

test('el registro escribe en su carpeta y la crea si no existe', async () => {
  const carpeta = path.join(await carpetaTemporal(), 'NeoRetro', 'logs');
  const registro = crearRegistro(carpeta);
  await registro.anotar('prueba', 'uno', 'dos');
  assert.equal(registro.archivo, path.join(carpeta, 'neo-arcade.log'));
  assert.match(await readFile(registro.archivo, 'utf8'), /\tprueba\tuno\tdos\n$/);
});
