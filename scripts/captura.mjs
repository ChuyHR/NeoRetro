// Utilidades de las herramientas de verificación: abrir una página a 1920×1080 aunque la pantalla sea
// más chica, capturarla y comparar dos capturas píxel por píxel. Solo usan Electron.
import { BrowserWindow, nativeImage } from 'electron';

const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms));

// El sistema de ventanas recorta cualquier ventana al tamaño de la pantalla, así que el tamaño se
// emula con el protocolo de depuración de Chromium.
export async function abrir(cargar) {
  const ventana = new BrowserWindow({ width: 1280, height: 720, frame: false, backgroundColor: '#050914' });
  await cargar(ventana);
  const depurador = ventana.webContents.debugger;
  depurador.attach('1.3');
  await depurador.sendCommand('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await ventana.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
  await esperar(2500); // el prototipo pide sus tipografías a Google Fonts después de cargar
  return {
    ventana,
    async capturar() {
      const { data } = await depurador.sendCommand('Page.captureScreenshot', {
        format: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 }, captureBeyondViewport: true,
      });
      return Buffer.from(data, 'base64');
    },
    async tecla(codigo, pausaMs = 450) {
      ventana.webContents.sendInputEvent({ type: 'keyDown', keyCode: codigo });
      ventana.webContents.sendInputEvent({ type: 'keyUp', keyCode: codigo });
      await esperar(pausaMs);
    },
    cerrar() {
      depurador.detach();
      ventana.destroy();
    },
  };
}

// Devuelve el porcentaje de píxeles distintos por zona y un mapa con las diferencias en rojo sobre la
// primera captura en gris. Un píxel cuenta como distinto si algún canal cambia más que el umbral.
export function comparar(pngA, pngB, zonas, umbral = 40) {
  const a = nativeImage.createFromBuffer(pngA);
  const b = nativeImage.createFromBuffer(pngB);
  const { width, height } = a.getSize();
  const pixelesA = a.toBitmap();
  const pixelesB = b.toBitmap();
  const distinto = new Uint8Array(width * height);
  const mapa = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 4;
    const cambio = Math.max(
      Math.abs(pixelesA[o] - pixelesB[o]),
      Math.abs(pixelesA[o + 1] - pixelesB[o + 1]),
      Math.abs(pixelesA[o + 2] - pixelesB[o + 2]),
    );
    if (cambio > umbral) {
      distinto[i] = 1;
      mapa[o] = 40; // el mapa está en BGRA: azul, verde, rojo, opacidad
      mapa[o + 1] = 40;
      mapa[o + 2] = 255;
    } else {
      const gris = ((pixelesA[o] + pixelesA[o + 1] + pixelesA[o + 2]) / 3) * 0.4;
      mapa[o] = gris;
      mapa[o + 1] = gris;
      mapa[o + 2] = gris;
    }
    mapa[o + 3] = 255;
  }
  const porZona = Object.entries(zonas).map(([nombre, [x, y, ancho, alto]]) => {
    let cuenta = 0;
    for (let fila = y; fila < y + alto; fila += 1) {
      for (let columna = x; columna < x + ancho; columna += 1) cuenta += distinto[fila * width + columna];
    }
    return { nombre, porcentaje: (100 * cuenta) / (ancho * alto) };
  });
  return { porZona, mapa: nativeImage.createFromBitmap(mapa, { width, height }).toPNG() };
}
