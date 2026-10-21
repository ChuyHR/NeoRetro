// Resume una traza de Chromium (la de NEO_ARCADE_TRAZA): tiempo total, veces y máximo de cada evento por
// hilo, de mayor a menor, sin los eventos que solo envuelven a otros.
// Uso: node scripts/herramientas/resumir-traza.mjs traza.json [cuántos, 40 por omisión]
import { readFile } from 'node:fs/promises';

const [archivo, cuantos = '40'] = process.argv.slice(2);
const { traceEvents } = JSON.parse(await readFile(archivo, 'utf8'));
const hilos = new Map();
for (const evento of traceEvents) if (evento.ph === 'M' && evento.name === 'thread_name') hilos.set(`${evento.pid}:${evento.tid}`, evento.args.name);
const ENVOLTORIOS = /RunTask|ThreadControllerImpl|EpollEvent|mojo|SimpleWatcher|Graphics.Pipeline|ScheduledActionDraw/;
const datos = new Map();
for (const evento of traceEvents) {
  if (evento.ph !== 'X' || !evento.dur || ENVOLTORIOS.test(evento.name)) continue;
  const hilo = hilos.get(`${evento.pid}:${evento.tid}`) ?? '?';
  const clave = `${hilo.padEnd(22)} ${evento.name}`;
  const dato = datos.get(clave) ?? { veces: 0, total: 0, maximo: 0 };
  dato.veces += 1;
  dato.total += evento.dur;
  dato.maximo = Math.max(dato.maximo, evento.dur);
  datos.set(clave, dato);
}
for (const [clave, { veces, total, maximo }] of [...datos].sort((a, b) => b[1].total - a[1].total).slice(0, Number(cuantos))) {
  console.log(`${String(Math.round(total / 1000)).padStart(6)} ms ${String(veces).padStart(6)} veces  máx ${(maximo / 1000).toFixed(1).padStart(5)} ms  ${clave}`);
}
