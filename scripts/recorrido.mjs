// Recorre la app solo con el teclado y captura cada pantalla, a 1920×1080, en docs/pruebas-fase1/recorrido/.
// Las teclas se mandan con sendInputEvent, que pasa por el mismo camino que una tecla real.
// Uso: npm run recorrido (en Linux).
import { app } from 'electron';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { abrir } from './captura.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const SALIDA = path.join(RAIZ, 'docs', 'pruebas-fase1', 'recorrido');

// Cada paso: teclas que se pulsan y nombre de la captura que se toma después.
const PASOS = [
  [[], '01-inicio'],
  [['Right', 'Right'], '02-dos-a-la-derecha'],
  [['PageDown'], '03-sistema-arcade'],
  [['PageUp', 'Down', 'Down', 'Enter'], '04-detalles'],
  [['Right'], '05-detalles-foco-en-volver'],
  [['Backspace', 'Down', 'Enter'], '06-configuracion'],
  [['Right', 'Enter'], '07-crt-desactivado'],
  [['Backspace', 'Up', 'Up', 'Up', 'Enter'], '08-lanzamiento'],
  [['Backspace'], '09-de-vuelta-sin-crt'],
];

async function principal() {
  await mkdir(SALIDA, { recursive: true });
  const neo = await abrir((ventana) => ventana.loadFile(path.join(RAIZ, 'app', 'index.html')));
  for (const [teclas, nombre] of PASOS) {
    for (const tecla of teclas) await neo.tecla(tecla);
    await writeFile(path.join(SALIDA, `${nombre}.png`), await neo.capturar());
    console.log(`${nombre}  (${teclas.join(', ') || 'sin teclas'})`);
  }
  neo.cerrar();
}

app.whenReady().then(principal).then(() => app.quit(), (error) => {
  console.error(error);
  app.exit(1);
});
