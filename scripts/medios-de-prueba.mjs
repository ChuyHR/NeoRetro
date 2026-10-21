// Medios de prueba propios (no son de ningún juego): carátulas, capturas y vídeos dibujados aquí mismo
// con el lienzo de Chromium, para probar la fase 5 sin medios de terceros. Se usa desde
// scripts/simulacion.mjs y también suelto:
//   bash scripts/electron.sh scripts/medios-de-prueba.mjs <carpeta de medios>   (arma un ejemplo de SNES)
import { app, BrowserWindow } from 'electron';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Dibuja en una ventana oculta. Cada pedido: { tipo: 'imagen' | 'video', ancho, alto, titulo, colores,
// segundos }. Devuelve los archivos en base64 (PNG o WebM).
const DIBUJO = String.raw`
async function dibujar({ tipo, ancho, alto, titulo, colores: [a, b, c], segundos = 3 }) {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d');
  const cuadro = (t) => {
    const fondo = ctx.createLinearGradient(0, 0, ancho, alto);
    fondo.addColorStop(0, a);
    fondo.addColorStop(1, c);
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, ancho, alto);
    ctx.fillStyle = b;
    for (let i = 0; i < 6; i += 1) {
      const x = ((i * ancho) / 6 + t * ancho * 0.4) % ancho;
      ctx.fillRect(x, alto * 0.72, ancho / 14, alto * 0.18);
    }
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(4, ancho / 60);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, ancho - ctx.lineWidth, alto - ctx.lineWidth);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + Math.round(ancho / 9) + 'px sans-serif';
    const palabras = titulo.toUpperCase().split(' ');
    palabras.forEach((palabra, i) => ctx.fillText(palabra, ancho / 2, alto * 0.25 + i * ancho / 8));
    ctx.font = Math.round(ancho / 22) + 'px monospace';
    ctx.fillText(tipo === 'video' ? 'VÍDEO DE PRUEBA' : 'IMAGEN DE PRUEBA', ancho / 2, alto * 0.62);
  };
  if (tipo === 'imagen') {
    cuadro(0);
    return lienzo.toDataURL('image/png').split(',')[1];
  }
  const flujo = lienzo.captureStream(30);
  const grabadora = new MediaRecorder(flujo, { mimeType: 'video/webm;codecs=vp8' });
  const partes = [];
  grabadora.ondataavailable = (evento) => partes.push(evento.data);
  const terminado = new Promise((listo) => { grabadora.onstop = listo; });
  grabadora.start(250);
  const inicio = performance.now();
  await new Promise((listo) => {
    const paso = () => {
      const t = (performance.now() - inicio) / 1000;
      cuadro(t);
      if (t < segundos) setTimeout(paso, 33);
      else listo();
    };
    paso();
  });
  grabadora.stop();
  await terminado;
  const datos = await new Blob(partes, { type: 'video/webm' }).arrayBuffer();
  let binario = '';
  const bytes = new Uint8Array(datos);
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}`;

let ventana = null;

async function ventanaDeDibujo() {
  if (ventana && !ventana.isDestroyed()) return ventana;
  ventana = new BrowserWindow({ show: false, width: 400, height: 300, webPreferences: { backgroundThrottling: false } });
  await ventana.loadURL('data:text/html,<meta charset="utf-8"><body></body>');
  await ventana.webContents.executeJavaScript(`${DIBUJO}; window.dibujar = dibujar; true`);
  return ventana;
}

export async function dibujarArchivo(destino, pedido) {
  const dibujo = await ventanaDeDibujo();
  const base64 = await dibujo.webContents.executeJavaScript(`dibujar(${JSON.stringify(pedido)})`);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, Buffer.from(base64, 'base64'));
  return destino;
}

export function cerrarDibujo() {
  if (ventana && !ventana.isDestroyed()) ventana.destroy();
  ventana = null;
}

const escapar = (texto) => String(texto).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);

// Escribe un gamelist.xml con lo que se le pase: [{ path, name, desc, thumbnail, image, video, … }].
export async function escribirGamelist(destino, juegos) {
  const cuerpo = juegos.map((juego) => `  <game>\n${Object.entries(juego)
    .map(([etiqueta, valor]) => `    <${etiqueta}>${escapar(valor)}</${etiqueta}>`).join('\n')}\n  </game>`).join('\n');
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, `<?xml version="1.0"?>\n<gameList>\n${cuerpo}\n</gameList>\n`);
}

// Uso suelto: medios de ejemplo para el programa de prueba de SNES (scripts/juego-de-prueba-snes.mjs).
// Electron deja la ruta del script tal como se escribió y puede poner opciones antes, así que se busca
// este archivo entre todos los argumentos.
const ESTE_ARCHIVO = fileURLToPath(import.meta.url);
if (process.argv.slice(1).some((argumento) => path.resolve(argumento) === ESTE_ARCHIVO)) {
  app.on('window-all-closed', () => {});
  app.whenReady().then(async () => {
    const medios = path.join(process.argv.at(-1), 'snes');
    const colores = ['#1E90FF', '#FFD23F', '#0A1A4A'];
    const titulo = 'Prueba de control';
    await dibujarArchivo(path.join(medios, 'covers', 'caja.png'), { tipo: 'imagen', ancho: 300, alto: 420, titulo, colores });
    await dibujarArchivo(path.join(medios, 'screenshots', 'pantalla.png'), { tipo: 'imagen', ancho: 320, alto: 240, titulo, colores });
    await dibujarArchivo(path.join(medios, 'videos', 'video.webm'), { tipo: 'video', ancho: 320, alto: 240, titulo, colores });
    await escribirGamelist(path.join(medios, 'gamelist.xml'), [{
      path: './Prueba de control (Neo Arcade).sfc', name: 'Prueba de control', thumbnail: './covers/caja.png',
      image: './screenshots/pantalla.png', video: './videos/video.webm', releasedate: '20261020T000000',
      developer: 'Neo Arcade', genre: 'Prueba', players: '1',
      desc: 'Programa propio de Neo Arcade: la pantalla se pone roja mientras se pulsa cualquier botón.',
    }]);
    console.log(`Medios de prueba en ${medios}`);
    cerrarDibujo();
    app.quit();
  });
}
