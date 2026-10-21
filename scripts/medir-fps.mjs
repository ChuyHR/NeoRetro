// Mide la fluidez del carrusel en la pantalla real: abre la interfaz a pantalla completa con los datos
// de ejemplo, recorre el carrusel y la barra de sistemas con el teclado y anota cuánto tarda cada
// cuadro. Sirve en el equipo de destino, no en WSL (allí la pantalla y la GPU no son las reales).
// Uso: npm run medir-fps [-- --css='reglas']  (en Linux, con la sesión gráfica abierta).
// --css agrega reglas a la página antes de medir, para ver cuánto pesa un efecto apagándolo.
import { app, BrowserWindow } from 'electron';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const CSS = process.argv.find((arg) => arg.startsWith('--css='))?.slice('--css='.length);
const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms));

// El tiempo entre cuadros se mide con requestAnimationFrame desde que empieza el recorrido.
const MEDIDOR = `window.__cuadros = []; (() => {
  let previo = performance.now();
  const paso = (ahora) => { window.__cuadros.push(ahora - previo); previo = ahora; requestAnimationFrame(paso); };
  requestAnimationFrame(paso);
})(); true`;

async function principal() {
  const ventana = new BrowserWindow({ fullscreen: true, frame: false, backgroundColor: '#050914' });
  await ventana.loadFile(path.join(RAIZ, 'app', 'index.html'));
  if (CSS) await ventana.webContents.insertCSS(CSS);
  await ventana.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
  await esperar(1500);
  const tecla = (codigo) => {
    ventana.webContents.sendInputEvent({ type: 'keyDown', keyCode: codigo });
    ventana.webContents.sendInputEvent({ type: 'keyUp', keyCode: codigo });
  };

  await ventana.webContents.executeJavaScript(MEDIDOR);
  // Pulsaciones cada 350 ms (la animación dura 300 ms) y después una ráfaga como una tecla sostenida.
  for (let i = 0; i < 12; i += 1) { tecla('Right'); await esperar(350); }
  for (let i = 0; i < 6; i += 1) { tecla('PageDown'); await esperar(350); }
  for (let i = 0; i < 20; i += 1) { tecla('Left'); await esperar(90); }
  await esperar(500);
  const cuadros = await ventana.webContents.executeJavaScript('window.__cuadros.slice(1)');

  const ordenados = [...cuadros].sort((a, b) => a - b);
  const total = cuadros.reduce((suma, ms) => suma + ms, 0);
  const percentil = (p) => ordenados[Math.min(ordenados.length - 1, Math.floor(ordenados.length * p))];
  const { width, height } = ventana.getBounds();
  console.log(`Pantalla ${width}x${height}, ${cuadros.length} cuadros en ${(total / 1000).toFixed(1)} s`);
  console.log(`Promedio ${(1000 * cuadros.length / total).toFixed(1)} cuadros por segundo`);
  console.log(`Cuadro típico ${percentil(0.5).toFixed(1)} ms, 95 % por debajo de ${percentil(0.95).toFixed(1)} ms, el más lento ${ordenados.at(-1).toFixed(1)} ms`);
  console.log(`Cuadros de más de 25 ms (se notan como salto): ${cuadros.filter((ms) => ms > 25).length}`);
  ventana.destroy();
}

app.on('window-all-closed', () => {});
app.whenReady().then(principal).then(() => app.quit(), (error) => {
  console.error(error);
  app.exit(1);
});
