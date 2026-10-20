// Prueba de punta a punta sin juegos ni emuladores reales. Arma en una carpeta temporal una biblioteca
// de archivos vacíos (uno por sistema) y un emulador falso que anota cómo lo llamaron, espera y sale;
// abre la app de verdad (core/main.js) apuntando a ellos y la recorre con el teclado. Guarda capturas
// en docs/pruebas-fase2/ y docs/pruebas-fase3/, y los tiempos en docs/pruebas-fase3/resultado.txt.
// Nunca toca roms/, media/ ni la configuración real. Uso: npm run simulacion (en Linux).
import { app, BrowserWindow } from 'electron';
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { controlar } from './captura.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const FASE2 = path.join(RAIZ, 'docs', 'pruebas-fase2');
const FASE3 = path.join(RAIZ, 'docs', 'pruebas-fase3');
const EMULADOR_MS = 1500; // lo que «juega» el emulador falso antes de cerrarse
const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms));

// Un juego por sistema, con nombres como los que traen los archivos reales.
const JUEGOS = {
  arcade: 'Street Fighter II (World 910522).zip',
  neogeo: 'Metal Slug (Set 1).zip',
  cps: 'Final Fight (World).zip',
  nes: 'Mega Man 2 (USA).nes',
  snes: 'Super Mario World (USA).sfc',
  n64: 'Super Mario 64 (USA).z64',
  gb: 'Tetris (World) (Rev 1).gb',
  gbc: 'Wario Land 3 (World).gbc',
  gba: 'Metroid Fusion (USA).gba',
  gamecube: 'Super Smash Bros Melee (USA).rvz',
  mastersystem: 'Alex Kidd in Miracle World (USA).sms',
  megadrive: 'Sonic_The_Hedgehog_(USA,_Europe).md',
  segacd: 'Sonic CD/Sonic CD (USA).cue',
  sega32x: 'Knuckles Chaotix (Japan, USA).32x',
  gamegear: 'Shinobi (USA, Europe).gg',
  dreamcast: 'Crazy Taxi/Crazy Taxi (USA).gdi',
  psx: 'Metal Gear Solid/Metal Gear Solid (USA) (Disc 1).cue',
  psp: 'Lumines (USA).iso',
  pcengine: 'Bonk Adventure (USA).pce',
  atari2600: 'Pitfall (USA).a26',
  ports: 'Juego propio.sh',
};
// Un segundo juego de SNES, con un nombre largo, para ver cómo se acomoda el título.
const TITULO_LARGO = 'The Legend of Zelda - A Link to the Past (USA).sfc';

async function prepararEntorno() {
  const base = await mkdtemp(path.join(os.tmpdir(), 'neo-arcade-simulacion-'));
  const carpeta = (nombre) => path.join(base, nombre);
  const { sistemas } = JSON.parse(await readFile(path.join(RAIZ, 'config', 'systems.json'), 'utf8'));

  for (const sistema of sistemas) {
    const archivo = path.join(carpeta('roms'), sistema.carpeta, JUEGOS[sistema.id]);
    await mkdir(path.dirname(archivo), { recursive: true });
    // El port sí corre de verdad: es un script que espera y sale, como un emulador.
    await writeFile(archivo, sistema.id === 'ports' ? `sleep ${EMULADOR_MS / 1000}\n` : '');
  }
  await writeFile(path.join(carpeta('roms'), 'snes', TITULO_LARGO), '');

  const emulador = carpeta('emulador-falso.sh');
  await writeFile(emulador, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> '${carpeta('llamadas.txt')}'
sleep ${EMULADOR_MS / 1000}
date +%s%3N > '${carpeta('cierre.txt')}'
exit 0
`);
  await chmod(emulador, 0o755);

  // Todos los núcleos menos el de Nintendo 64, para ver el aviso de núcleo faltante.
  await mkdir(carpeta('nucleos'));
  for (const nucleo of new Set(sistemas.map((sistema) => sistema.nucleo).filter(Boolean))) {
    if (nucleo !== 'mupen64plus_next') await writeFile(path.join(carpeta('nucleos'), `${nucleo}_libretro.so`), '');
  }

  // La configuración real, salvo los emuladores: RetroArch y PPSSPP son el falso y Dolphin no existe.
  await mkdir(carpeta('config'));
  await writeFile(path.join(carpeta('config'), 'systems.json'), JSON.stringify({ sistemas }));
  await writeFile(path.join(carpeta('config'), 'biblioteca.json'), JSON.stringify({ roms: carpeta('roms'), medios: carpeta('media') }));
  await writeFile(path.join(carpeta('config'), 'emulators.json'), JSON.stringify({
    emuladores: {
      retroarch: { nombre: 'RetroArch', comando: [emulador], carpetaNucleos: carpeta('nucleos') },
      dolphin: { nombre: 'Dolphin', comando: [carpeta('no-instalado/dolphin-emu')] },
      ppsspp: { nombre: 'PPSSPP', comando: [emulador] },
      directo: { nombre: 'Ejecutable propio', comando: [] },
    },
  }));

  process.env.NEO_ARCADE_CONFIG = carpeta('config');
  process.env.NEO_ARCADE_DATOS = carpeta('datos');
  return { base, carpeta, sistemas };
}

async function ventanaDeLaApp() {
  for (;;) {
    const [ventana] = BrowserWindow.getAllWindows();
    if (ventana?.isVisible()) return ventana;
    await esperar(100);
  }
}

const cuando = (emisor, evento) => new Promise((listo) => emisor.once(evento, () => listo(Date.now())));

async function principal() {
  const entorno = await prepararEntorno();
  await import('../core/main.js');
  await app.whenReady();
  const ventana = await ventanaDeLaApp();
  const neo = await controlar(ventana);
  await Promise.all([mkdir(FASE2, { recursive: true }), mkdir(FASE3, { recursive: true })]);
  const leer = (js) => ventana.webContents.executeJavaScript(js);
  const tituloElegido = () => leer(`document.querySelector('[aria-label="Juego seleccionado"] [data-ref="titulo"]').textContent`);
  const sistemaActivo = () => leer(`document.querySelector('nav [aria-pressed="true"] span')?.textContent ?? ''`);
  const guardar = async (carpeta, nombre) => writeFile(path.join(carpeta, `${nombre}.png`), await neo.capturar());
  const informe = [];
  const anotar = (linea) => {
    informe.push(linea);
    console.log(linea);
  };

  async function irA(nombreSistema) {
    for (let vuelta = 0; vuelta < entorno.sistemas.length + 1; vuelta += 1) {
      if ((await sistemaActivo()) === nombreSistema) return;
      await neo.tecla('PageDown', 250);
    }
    throw new Error(`no encontré el sistema ${nombreSistema} en la barra`);
  }

  // Fase 2: la biblioteca leída de las carpetas.
  const sistemasEnBarra = await leer(`[...document.querySelectorAll('nav button span')].length`);
  anotar(`Barra al abrir: ${sistemasEnBarra} botones visibles; elegido «${await tituloElegido()}»`);
  await guardar(FASE2, '01-biblioteca');
  await neo.tecla('PageUp');
  await guardar(FASE2, '02-barra-al-final');
  await irA('PLAYSTATION');
  anotar(`PLAYSTATION: elegido «${await tituloElegido()}» (subcarpeta y número de disco)`);
  await guardar(FASE2, '03-un-sistema');

  // Fase 3: el ciclo completo con el emulador falso.
  await irA('SNES');
  const inicio = Date.now();
  const oculta = cuando(ventana, 'hide');
  const visible = cuando(ventana, 'show');
  const enfocada = cuando(ventana, 'focus');
  await neo.tecla('Enter', 300);
  await guardar(FASE3, '01-abriendo');
  const tOculta = await oculta;
  const tVisible = await visible;
  const tEnfocada = await Promise.race([enfocada, esperar(3000).then(() => null)]);
  await esperar(600);
  const tCierre = Number(await readFile(entorno.carpeta('cierre.txt'), 'utf8'));
  anotar(`Ventana oculta ${tOculta - inicio} ms después de Enter (incluye ${1200} ms de «Abriendo…»)`);
  anotar(`De vuelta ${tVisible - tCierre} ms después de cerrarse el emulador; foco: ${tEnfocada ? `sí, a los ${tEnfocada - tCierre} ms` : 'no llegó el evento'}; isFocused=${ventana.isFocused()}`);
  anotar(`Al volver: elegido «${await tituloElegido()}»`);
  await guardar(FASE3, '02-de-vuelta');
  await neo.tecla('Right');
  anotar(`Una flecha a la derecha después de volver: «${await tituloElegido()}»`);
  await guardar(FASE2, '05-titulo-largo');
  await neo.tecla('Left');

  // El port no pasa por RetroArch: es su propio programa.
  await irA('PORTS');
  const puerto = Date.now();
  const puertoVisible = cuando(ventana, 'show');
  await neo.tecla('Enter', 300);
  anotar(`Port: de vuelta a los ${(await puertoVisible) - puerto} ms (espera de 1200 ms + ${EMULADOR_MS} ms de juego)`);
  await esperar(600);

  // Los tres avisos de error.
  for (const [sistema, nombre] of [['NINTENDO 64', '03-falta-nucleo'], ['GAMECUBE', '04-falta-emulador'], ['GBA', '05-falta-juego']]) {
    await irA(sistema);
    if (sistema === 'GBA') await rm(path.join(entorno.carpeta('roms'), 'gba', JUEGOS.gba));
    await neo.tecla('Enter', 800);
    anotar(`${sistema}: «${await leer(`document.querySelector('[data-ref="error"]')?.textContent ?? ''`)}»`);
    await guardar(FASE3, nombre);
    await neo.tecla('Enter'); // VOLVER AL INICIO
  }

  // Fase 2 otra vez: sin ningún juego.
  for (const sistema of entorno.sistemas) {
    const carpetaSistema = path.join(entorno.carpeta('roms'), sistema.carpeta);
    for (const entrada of await readdir(carpetaSistema)) await rm(path.join(carpetaSistema, entrada), { recursive: true });
  }
  ventana.webContents.reload();
  await cuando(ventana.webContents, 'did-finish-load');
  await leer('document.fonts.ready.then(() => true)');
  await esperar(1500);
  anotar(`Biblioteca vacía: ${await leer(`[...document.querySelectorAll('nav button')].length`)} botones en la barra`);
  await guardar(FASE2, '04-biblioteca-vacia');

  const llamadas = await readFile(entorno.carpeta('llamadas.txt'), 'utf8');
  const registro = await readFile(path.join(entorno.carpeta('datos'), 'registros', 'neo-arcade.log'), 'utf8');
  const sinTemporal = (texto) => texto.replaceAll(entorno.base, '<temporal>');
  anotar(`\nArgumentos que recibió el emulador falso:\n${sinTemporal(llamadas)}`);
  anotar(`Registro de la app:\n${sinTemporal(registro)}`);
  await writeFile(path.join(FASE3, 'resultado.txt'), `${informe.join('\n')}\n`);
  neo.cerrar();
  await rm(entorno.base, { recursive: true, force: true });
}

principal().then(() => app.exit(0), (error) => {
  console.error(error);
  app.exit(1);
});
