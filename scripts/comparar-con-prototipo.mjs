// Compara la app con el prototipo aprobado, los dos a 1920×1080 en su estado inicial, y deja las
// capturas, el mapa de diferencias y el porcentaje por zona en docs/pruebas-fase1/.
// Uso: npm run comparar (en Linux). El prototipo pide sus tipografías a Google Fonts: necesita internet.
import { app } from 'electron';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { abrir, comparar } from './captura.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const SALIDA = path.join(RAIZ, 'docs', 'pruebas-fase1');
const PROTOTIPO = path.join(RAIZ, 'docs', 'referencia');

// Zonas del prototipo (x, y, ancho, alto). Las marcadas con «cambio aprobado» deben diferir.
const ZONAS = {
  'cabecera, sin el reloj': [0, 0, 1668, 232],
  'reloj y fecha (cambian con la hora)': [1668, 0, 252, 210],
  'barra de sistemas': [30, 238, 1860, 128],
  carrusel: [0, 380, 1920, 380],
  'reflejos bajo las portadas': [500, 757, 660, 40],
  'ficha del juego (cambio aprobado: texto a 24 px)': [58, 798, 690, 190],
  'menú de acciones': [774, 808, 320, 180],
  'vista previa': [1146, 790, 514, 202],
  'INSERT COIN': [1700, 784, 200, 210],
  'pie (cambio aprobado: teclas del teclado)': [0, 1002, 1300, 78],
  'pie, lema de la derecha': [1300, 1002, 620, 78],
};

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

// El prototipo no carga sus scripts por file://, así que se sirve por HTTP solo dentro de este proceso.
function servir(carpeta) {
  return new Promise((listo) => {
    const servidor = createServer(async (pedido, respuesta) => {
      const ruta = path.join(carpeta, decodeURIComponent(new URL(pedido.url, 'http://local').pathname));
      try {
        if (!ruta.startsWith(carpeta)) throw new Error('fuera de la carpeta');
        const contenido = await readFile(ruta);
        respuesta.writeHead(200, { 'content-type': TIPOS[path.extname(ruta)] ?? 'application/octet-stream' });
        respuesta.end(contenido);
      } catch {
        respuesta.writeHead(404).end();
      }
    });
    servidor.listen(0, '127.0.0.1', () => listo(servidor));
  });
}

async function principal() {
  await mkdir(SALIDA, { recursive: true });
  const servidor = await servir(PROTOTIPO);
  const { port } = servidor.address();

  const prototipo = await abrir((ventana) => ventana.loadURL(`http://127.0.0.1:${port}/NeoArcade.dc.html`));
  const capturaPrototipo = await prototipo.capturar();
  prototipo.cerrar();
  servidor.close();

  const neo = await abrir((ventana) => ventana.loadFile(path.join(RAIZ, 'app', 'index.html')));
  const capturaApp = await neo.capturar();
  neo.cerrar();

  const { porZona, mapa } = comparar(capturaPrototipo, capturaApp, ZONAS);
  await writeFile(path.join(SALIDA, 'prototipo.png'), capturaPrototipo);
  await writeFile(path.join(SALIDA, 'app.png'), capturaApp);
  await writeFile(path.join(SALIDA, 'diferencias.png'), mapa);
  const lineas = porZona.map(({ nombre, porcentaje }) => `${porcentaje.toFixed(1).padStart(5)} %  ${nombre}`);
  await writeFile(path.join(SALIDA, 'comparacion.txt'), `Píxeles distintos por zona (umbral 40 por canal)\n${lineas.join('\n')}\n`);
  console.log(lineas.join('\n'));
}

// Entre la captura del prototipo y la de la app no queda ninguna ventana abierta; sin esto, Electron
// se cerraría solo en ese momento e interrumpiría la carga de la app.
app.on('window-all-closed', () => {});
app.whenReady().then(principal).then(() => app.quit(), (error) => {
  console.error(error);
  app.exit(1);
});
