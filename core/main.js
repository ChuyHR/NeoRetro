// Proceso principal de Neo Arcade: abre la ventana de la interfaz. En las fases siguientes conecta la
// interfaz con la entrada, el lanzador, el escáner y el almacenamiento.
import { app, BrowserWindow, Menu } from 'electron';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Empaquetada con scripts/empaquetar.sh, el ejecutable se llama neo-arcade y Electron la da por
// empaquetada: Esc deja de cerrarla y no hay herramientas de desarrollo.
const DESARROLLO = !app.isPackaged;

// Solo en desarrollo: `npm start -- --captura=archivo.png` guarda lo que muestra la ventana y sale.
const CAPTURA = DESARROLLO
  ? process.argv.find((arg) => arg.startsWith('--captura='))?.slice('--captura='.length)
  : undefined;

async function capturar(ventana, ruta) {
  await ventana.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
  await new Promise((listo) => setTimeout(listo, 1000));
  const imagen = await ventana.webContents.capturePage();
  await writeFile(ruta, imagen.toPNG());
  const { width, height } = imagen.getSize();
  console.log(`captura guardada en ${ruta} (${width}x${height})`);
  app.quit();
}

function crearVentana() {
  const ventana = new BrowserWindow({
    title: 'Neo Arcade',
    fullscreen: true,
    frame: false,
    show: false,
    backgroundColor: '#050914',
    webPreferences: { devTools: DESARROLLO },
  });

  ventana.webContents.on('before-input-event', (_evento, entrada) => {
    if (DESARROLLO && entrada.type === 'keyDown' && entrada.key === 'Escape') app.quit();
  });

  ventana.once('ready-to-show', () => {
    ventana.show();
    if (CAPTURA) capturar(ventana, CAPTURA);
  });

  ventana.loadFile(path.join(RAIZ, 'app', 'index.html'));
}

// Sin menú tampoco existen sus atajos (recargar, herramientas de desarrollo, zoom).
Menu.setApplicationMenu(null);
console.log(`Neo Arcade ${app.getVersion()} en ${DESARROLLO ? 'modo desarrollo' : 'versión final'}`);
app.whenReady().then(crearVentana);
app.on('window-all-closed', () => app.quit());
