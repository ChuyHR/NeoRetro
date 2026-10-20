// Prueba de la fase 0: el prototipo dentro de Electron, sin portar nada.
// Mide arranque, fidelidad (captura), GPU, códecs, fluidez del carrusel y el ciclo lanzar → volver.
const { app, BrowserWindow, screen } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const URL = process.env.PROTO_URL;
const SALIDA = process.env.SALIDA;
const ARCHIVO = path.join(SALIDA, 'resultado-electron.txt');
const T_INICIO = Number(process.env.T_INICIO) || Date.now();

function log(...partes) {
  const linea = `[${((Date.now() - T_INICIO) / 1000).toFixed(2)}s] ${partes.join(' ')}`;
  console.log(linea);
  fs.appendFileSync(ARCHIVO, linea + '\n');
}

// La escala de Windows (125 %, 150 %) llega a WSLg; sin esto la captura no mide 1920×1080.
app.commandLine.appendSwitch('force-device-scale-factor', '1');

const JS_CODECS = `(() => { const v = document.createElement('video'); return {
  h264: v.canPlayType('video/mp4; codecs="avc1.42E01E"'),
  h264Alto: v.canPlayType('video/mp4; codecs="avc1.640028"'),
  vp9: v.canPlayType('video/webm; codecs="vp9"'),
  av1: v.canPlayType('video/mp4; codecs="av01.0.05M.08"'),
  aac: v.canPlayType('audio/mp4; codecs="mp4a.40.2"') }; })()`;

// Avanza el carrusel con su propio botón cada 120 ms durante 3 s y cuenta cuadros.
const JS_FLUIDEZ = `new Promise((listo) => {
  const boton = document.querySelector('[aria-label="Juego siguiente"]');
  let cuadros = 0, peor = 0;
  const inicio = performance.now();
  let previo = inicio;
  const avance = setInterval(() => boton && boton.click(), 120);
  function cuadro(t) {
    cuadros++; peor = Math.max(peor, t - previo); previo = t;
    if (t - inicio < 3000) requestAnimationFrame(cuadro);
    else {
      clearInterval(avance);
      listo({ botonEncontrado: !!boton, fps: +(cuadros * 1000 / (t - inicio)).toFixed(1), peorCuadroMs: +peor.toFixed(1) });
    }
  }
  requestAnimationFrame(cuadro);
})`;

const JS_SELECCIONADO = `document.querySelector('[aria-label$=", seleccionado"]')?.getAttribute('aria-label') || ''`;

// Lo que hará la app real: escalar el lienzo fijo de 1920×1080 a la ventana, sin deformarlo y centrado.
const JS_ESCALAR = `(() => {
  const lienzo = document.querySelector('div[style*="width: 1920px"][style*="height: 1080px"]');
  if (!lienzo) return 'lienzo no encontrado';
  const w = innerWidth, h = innerHeight, s = Math.min(w / 1920, h / 1080);
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  lienzo.style.transformOrigin = '0 0';
  lienzo.style.transform = 'translate(' + (w - 1920 * s) / 2 + 'px,' + (h - 1080 * s) / 2 + 'px) scale(' + s + ')';
  return 'escala ' + s.toFixed(3) + ' en ' + w + 'x' + h;
})()`;

const JS_FUENTES = 'document.fonts.ready.then(() => [...new Set([...document.fonts].filter(f => f.status === "loaded").map(f => f.family))].join(", "))';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Captura a 1920×1080 aunque la pantalla sea más chica, para comparar fidelidad con el prototipo.
// El sistema de ventanas recorta cualquier ventana al tamaño de la pantalla, así que se emula el
// tamaño con el protocolo de depuración de Chromium.
async function capturaCompleta(win) {
  const depurador = win.webContents.debugger;
  depurador.attach('1.3');
  await depurador.sendCommand('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await win.webContents.executeJavaScript(JS_ESCALAR);
  await esperar(800);
  const { data } = await depurador.sendCommand('Page.captureScreenshot', {
    format: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 }, captureBeyondViewport: true,
  });
  fs.writeFileSync(path.join(SALIDA, 'captura-electron-1920.png'), Buffer.from(data, 'base64'));
  log('captura a tamaño completo 1920x1080');
  await depurador.sendCommand('Emulation.clearDeviceMetricsOverride');
  depurador.detach();
  await win.webContents.executeJavaScript(JS_ESCALAR);
  await esperar(300);
}

async function probar() {
  log('Electron', process.versions.electron, '| Chromium', process.versions.chrome);
  const d = screen.getPrimaryDisplay();
  log('pantalla', `${d.size.width}x${d.size.height}`, 'escala', d.scaleFactor);

  const win = new BrowserWindow({
    width: d.size.width, height: d.size.height, frame: false, show: false, backgroundColor: '#050914',
  });
  win.once('ready-to-show', () => { log('lista para mostrarse'); win.show(); });
  await win.loadURL(URL);
  log('página cargada');
  log('tipografías cargadas:', (await win.webContents.executeJavaScript(JS_FUENTES)) || '(ninguna)');
  log('lienzo:', await win.webContents.executeJavaScript(JS_ESCALAR));
  await esperar(2500);

  log('área de contenido', win.getContentSize().join('x'));
  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(SALIDA, 'captura-electron-escalada.png'), img.toPNG());
  log('captura escalada', `${img.getSize().width}x${img.getSize().height}`);
  await capturaCompleta(win);

  log('estado de la GPU', JSON.stringify(app.getGPUFeatureStatus()));
  const gpu = await app.getGPUInfo('complete');
  log('GPU', gpu.auxAttributes?.glRenderer || '(sin dato)', '|', gpu.auxAttributes?.glVersion || '');
  log('códecs', JSON.stringify(await win.webContents.executeJavaScript(JS_CODECS)));
  log('carrusel', JSON.stringify(await win.webContents.executeJavaScript(JS_FLUIDEZ)));

  // Ciclo de juego: ocultar, lanzar RetroArch, esperar a que cierre y volver al mismo punto.
  const antes = await win.webContents.executeJavaScript(JS_SELECCIONADO);
  log('seleccionado antes de jugar:', antes);
  win.hide();
  log('ventana oculta; lanzando RetroArch');
  const emulador = spawn('retroarch', ['--fullscreen'], { stdio: 'ignore' });
  emulador.on('error', (e) => { log('no se pudo lanzar RetroArch:', e.message); app.quit(); });
  const cierre = setTimeout(() => {
    log('cerrando RetroArch (simula salir del juego)');
    emulador.kill('SIGTERM');
  }, 6000);
  emulador.on('exit', (codigo, senal) => {
    clearTimeout(cierre);
    const tSalida = Date.now();
    log('RetroArch terminó; código', codigo, 'señal', senal);
    win.once('show', () => log('ventana visible de nuevo en', Date.now() - tSalida, 'ms'));
    win.show();
    win.focus();
    setTimeout(async () => {
      const despues = await win.webContents.executeJavaScript(JS_SELECCIONADO);
      log('enfocada:', win.isFocused(), '| seleccionado después:', despues, '| mismo punto:', antes === despues);
      app.quit();
    }, 800);
  });
}

app.whenReady().then(probar).catch((e) => { log('error:', e.stack || e); app.quit(); });
