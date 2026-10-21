// Prueba de punta a punta sin juegos ni emuladores reales. Arma en una carpeta temporal una biblioteca
// de archivos vacíos (uno por sistema), un emulador falso que anota cómo lo llamaron, espera y sale, y
// medios propios dibujados aquí; abre la app de verdad (core/main.js) apuntando a ellos y la recorre con
// el teclado. Guarda capturas en docs/pruebas-fase2/, docs/pruebas-fase3/ y docs/pruebas-fase5/, con
// los resultados en el resultado.txt de cada una.
// Nunca toca roms/, media/ ni la configuración real. Uso: npm run simulacion (en Linux).
import { app, BrowserWindow } from 'electron';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

// El orden importa: primero la carpeta temporal y luego la app, que la lee al importarse.
import { EMULADOR_MS, entorno, JUEGOS, TITULO_LARGO } from './simulacion-entorno.mjs';
import '../core/main.js';
import { ESPERA_VIDEO_MS } from '../app/piezas/vista-previa.js';
import { controlar } from './captura.mjs';
import { cerrarDibujo, dibujarArchivo, escribirGamelist } from './medios-de-prueba.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const FASE2 = path.join(RAIZ, 'docs', 'pruebas-fase2');
const FASE3 = path.join(RAIZ, 'docs', 'pruebas-fase3');
const FASE5 = path.join(RAIZ, 'docs', 'pruebas-fase5');
const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms));
// Medios de la fase 5, de las tres formas que acepta core/medios/medios.js:
//   - SNES: gamelist.xml en media/snes/ con nombre, datos, caja vertical, captura y vídeo; el otro juego
//     trae una caja horizontal, para ver que se muestra completa.
//   - Arcade: el gamelist da el nombre completo («mslug» → «Metal Slug» en la vida real) y apunta a una
//     carátula que no existe: debe quedar la portada de reemplazo, nunca una imagen rota.
//   - Neo Geo: sin gamelist; carátula y vídeo en media/neogeo/covers/ y videos/ con el nombre del juego.
//   - PlayStation: gamelist.xml en roms/psx/ (donde lo deja Skraper) con solo <image>, que hace de carátula.
async function prepararMedios({ carpeta }) {
  const medios = carpeta('media');
  const sin = (archivo) => path.basename(archivo, path.extname(archivo));
  const colores = { snes: ['#8B5CF6', '#FFD23F', '#1A1030'], arcade: ['#E53935', '#FFD23F', '#1A0505'], neogeo: ['#FFB020', '#1E90FF', '#1A1405'], psx: ['#5A6A7A', '#C9D2E8', '#0B1116'] };
  await dibujarArchivo(path.join(medios, 'snes', 'covers', 'mario.png'), { tipo: 'imagen', ancho: 300, alto: 420, titulo: 'Super Mario World', colores: colores.snes });
  await dibujarArchivo(path.join(medios, 'snes', 'screenshots', 'mario.png'), { tipo: 'imagen', ancho: 320, alto: 240, titulo: 'Pantalla de juego', colores: colores.snes });
  await dibujarArchivo(path.join(medios, 'snes', 'videos', 'mario.webm'), { tipo: 'video', ancho: 320, alto: 240, titulo: 'Super Mario World', colores: colores.snes, segundos: 3 });
  await dibujarArchivo(path.join(medios, 'snes', 'covers', 'zelda.png'), { tipo: 'imagen', ancho: 420, alto: 300, titulo: 'Caja horizontal', colores: colores.snes });
  await escribirGamelist(path.join(medios, 'snes', 'gamelist.xml'), [
    { path: `./${JUEGOS.snes}`, name: 'Super Mario World', thumbnail: './covers/mario.png', image: './screenshots/mario.png', video: './videos/mario.webm', releasedate: '19901121T000000', developer: 'Estudio de prueba', genre: 'Plataformas', players: '1-2', desc: 'Datos de prueba de Neo Arcade: la descripción sale del gamelist.xml y se corta en tres líneas para no invadir el pie.' },
    { path: `./${TITULO_LARGO}`, name: 'The Legend of Zelda: A Link to the Past', thumbnail: './covers/zelda.png', releasedate: '19911121', genre: 'Aventura' },
  ]);
  await escribirGamelist(path.join(medios, 'arcade', 'gamelist.xml'), [
    { path: `./${JUEGOS.arcade}`, name: 'Street Fighter II: The World Warrior', thumbnail: './covers/no-existe.png', developer: 'Estudio de prueba', releasedate: '1991' },
  ]);
  await dibujarArchivo(path.join(medios, 'neogeo', 'covers', `${sin(JUEGOS.neogeo)}.png`), { tipo: 'imagen', ancho: 300, alto: 420, titulo: 'Metal Slug', colores: colores.neogeo });
  await dibujarArchivo(path.join(medios, 'neogeo', 'videos', `${sin(JUEGOS.neogeo)}.webm`), { tipo: 'video', ancho: 320, alto: 240, titulo: 'Metal Slug', colores: colores.neogeo, segundos: 3 });
  await dibujarArchivo(path.join(carpeta('roms'), 'psx', 'media', 'images', 'mgs.png'), { tipo: 'imagen', ancho: 300, alto: 300, titulo: 'Metal Gear Solid', colores: colores.psx });
  await escribirGamelist(path.join(carpeta('roms'), 'psx', 'gamelist.xml'), [
    { path: `./${JUEGOS.psx}`, name: 'Metal Gear Solid', image: './media/images/mgs.png', genre: 'Acción' },
  ]);
  cerrarDibujo();
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
  await app.whenReady();
  const ventana = await ventanaDeLaApp();
  const neo = await controlar(ventana);
  await Promise.all([FASE2, FASE3, FASE5].map((carpeta) => mkdir(carpeta, { recursive: true })));
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

  // Fase 5: medios propios dibujados aquí (scripts/medios-de-prueba.mjs), de las tres formas posibles.
  const lineas5 = [];
  const anotar5 = (linea) => {
    lineas5.push(linea);
    console.log(linea);
  };
  await prepararMedios(entorno);
  ventana.webContents.reload();
  await cuando(ventana.webContents, 'did-finish-load');
  await leer('document.fonts.ready.then(() => true)');
  await esperar(1500);
  const caratulasVisibles = () => leer(`[...document.querySelectorAll('img[data-caratula]')].filter((i) => i.complete && i.naturalWidth > 0).length`);
  const videoCorriendo = () => leer(`(() => { const v = document.querySelector('[aria-label="Vista previa"] video'); return Boolean(v && v.getAttribute('src') && !v.paused && v.currentTime > 0); })()`);
  await irA('SNES');
  await esperar(500);
  anotar5(`SNES (gamelist en media/): «${await tituloElegido()}», ${await caratulasVisibles()} carátulas cargadas, vídeo corriendo al instante: ${await videoCorriendo()}`);
  await guardar(FASE5, '01-caratulas-y-captura');
  await esperar(ESPERA_VIDEO_MS + 1500);
  anotar5(`Tras ${(ESPERA_VIDEO_MS + 2000) / 1000} s en el mismo juego, vídeo corriendo: ${await videoCorriendo()}`);
  await guardar(FASE5, '02-video-en-la-vista-previa');
  anotar5(`Ficha: «${await leer(`document.querySelector('[aria-label="Juego seleccionado"] [data-ref="meta"]').textContent`)}»`);
  await neo.tecla('Down');
  await neo.tecla('Down');
  await neo.tecla('Enter', 600);
  await guardar(FASE5, '03-detalles-con-caratula');
  await neo.tecla('Backspace');
  await neo.tecla('Up');
  await neo.tecla('Up');
  await neo.tecla('Right', 600);
  anotar5(`Carátula horizontal: «${await tituloElegido()}», vídeo corriendo: ${await videoCorriendo()} (no tiene)`);
  await guardar(FASE5, '04-caratula-horizontal');
  await irA('ARCADE');
  await esperar(800);
  anotar5(`ARCADE (carátula del gamelist que no existe): «${await tituloElegido()}», ${await caratulasVisibles()} carátulas cargadas`);
  await guardar(FASE5, '05-caratula-rota-usa-reemplazo');
  await irA('NEO GEO');
  await esperar(ESPERA_VIDEO_MS + 1500);
  anotar5(`NEO GEO (sin gamelist, por carpetas): «${await tituloElegido()}», ${await caratulasVisibles()} carátulas cargadas, vídeo corriendo: ${await videoCorriendo()}`);
  await guardar(FASE5, '06-medios-por-carpetas');
  await irA('PLAYSTATION');
  await esperar(800);
  anotar5(`PLAYSTATION (gamelist en roms/, solo <image>): «${await tituloElegido()}», ${await caratulasVisibles()} carátulas cargadas`);
  await guardar(FASE5, '07-gamelist-en-roms');
  await writeFile(path.join(FASE5, 'resultado.txt'), `${lineas5.join('\n')}\n`);

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
