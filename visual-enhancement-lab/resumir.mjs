// Resume una medición de medir.sh en resultados.json y tabla.md, dentro de la misma carpeta.
// Todo sale de lo que se midió; si falta un dato, queda vacío, no se estima.
// Uso: node resumir.mjs <carpeta de resultados>
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [carpeta] = process.argv.slice(2);
if (!carpeta) {
  console.error('Uso: node resumir.mjs <carpeta de resultados>');
  process.exit(2);
}
const INICIO = 120; // los primeros cuadros son la carga del juego y del shader: no cuentan
const leer = (ruta) => readFile(ruta, 'utf8').catch(() => null);

function numeros(texto) {
  return (texto ?? '').split('\n').map(Number).filter((n) => Number.isFinite(n));
}

function percentil(ordenados, p) {
  if (!ordenados.length) return null;
  return ordenados[Math.min(ordenados.length - 1, Math.floor((p / 100) * ordenados.length))];
}

const promedio = (lista) => (lista.length ? lista.reduce((a, b) => a + b, 0) / lista.length : null);

async function cuadros(dir) {
  const tiempos = numeros(await leer(path.join(dir, 'frametime_(ms)'))).slice(INICIO, -5);
  const cpu = numeros(await leer(path.join(dir, 'cpu'))).slice(INICIO, -5);
  if (!tiempos.length) return null;
  const ordenados = [...tiempos].sort((a, b) => a - b);
  const media = promedio(tiempos);
  // El HUD toma el tiempo del lado del procesador: un cuadro de 21 ms seguido de uno de 12 se muestra
  // a tiempo igual. Lo que se ve es si cada cuadro cae en el refresco que le toca: con el tiempo
  // acumulado, un salto de dos refrescos es uno perdido (un tirón) y uno de cero, un cuadro de más.
  const refresco = 1000 / 60;
  let acumulado = 0;
  let previo = 0;
  let perdidos = 0;
  for (const t of tiempos) {
    acumulado += t;
    const lugar = Math.round(acumulado / refresco);
    if (lugar - previo > 1) perdidos += lugar - previo - 1;
    previo = lugar;
  }
  return {
    cuadros: tiempos.length,
    fps: 1000 / media,
    msMedia: media,
    msP50: percentil(ordenados, 50),
    msP95: percentil(ordenados, 95),
    msP99: percentil(ordenados, 99),
    msMax: ordenados.at(-1),
    mas20ms: tiempos.filter((t) => t > 20).length,
    refrescosPerdidos: perdidos,
    cpuEquipo: promedio(cpu),
  };
}

// intel_gpu_top -J escribe objetos seguidos; si se corta, el último queda abierto. Se separan contando llaves.
function objetos(texto) {
  const lista = [];
  let nivel = 0;
  let desde = -1;
  for (let i = 0; i < texto.length; i += 1) {
    if (texto[i] === '{') {
      if (nivel === 0) desde = i;
      nivel += 1;
    } else if (texto[i] === '}') {
      nivel -= 1;
      if (nivel === 0 && desde >= 0) {
        try { lista.push(JSON.parse(texto.slice(desde, i + 1))); } catch { /* muestra incompleta */ }
      }
    }
  }
  return lista;
}

async function gpu(archivo) {
  const texto = await leer(archivo);
  if (!texto) return null;
  // Solo las muestras con RetroArch abierto, sin las primeras 6 (3 s de carga).
  const muestras = objetos(texto).filter((m) => Object.values(m.clients ?? {}).some((c) => c.name === 'retroarch')).slice(6);
  if (!muestras.length) return null;
  const de = (m) => Object.values(m.clients).find((c) => c.name === 'retroarch');
  return {
    muestras: muestras.length,
    ocupacion3D: promedio(muestras.map((m) => m.engines?.['Render/3D']?.busy ?? 0)),
    ocupacion3DRetroArch: promedio(muestras.map((m) => Number(de(m)?.['engine-classes']?.['Render/3D']?.busy ?? 0))),
    mhz: promedio(muestras.map((m) => m.frequency?.actual ?? 0)),
    vatiosGpu: promedio(muestras.map((m) => m.power?.GPU ?? 0)),
    vatiosPaquete: promedio(muestras.map((m) => m.power?.Package ?? 0)),
  };
}

async function proceso(archivo) {
  const texto = await leer(archivo);
  if (!texto || texto.startsWith('sin proceso')) return null;
  const campo = (clave) => texto.match(new RegExp(`^${clave} (.*)$`, 'm'))?.[1]?.split(/\s+/).map(Number);
  const [a, b] = campo('ticks') ?? [];
  const [t0, t1] = campo('ns') ?? [];
  const [clk] = campo('clk') ?? [100];
  const kb = (clave) => Number(texto.match(new RegExp(`${clave}:\\s+(\\d+)`))?.[1]);
  return {
    // Si RetroArch se cerró antes de la segunda lectura, no hay dato.
    cpuRetroArch: Number.isFinite(a + b + t0 + t1) && b >= a ? ((b - a) / clk / ((t1 - t0) / 1e9)) * 100 : null,
    memoriaMaxMB: kb('VmHWM') / 1024,
  };
}

async function medidaPng(archivo) {
  const datos = await readFile(archivo).catch(() => null);
  if (!datos || datos.length < 24) return null;
  return `${datos.readUInt32BE(16)}×${datos.readUInt32BE(20)}`;
}

async function erroresDeShader(archivo) {
  const texto = (await leer(archivo)) ?? '';
  return texto.split('\n').filter((l) => /\[(Shader|GLSL)\].*(fail|error|could not|couldn)|Failed to (load|compile).*shader/i.test(l)).slice(0, 3);
}

const capturas = (await readdir(path.join(carpeta, 'capturas')).catch(() => [])).filter((f) => f.endsWith('.png'));
const filas = [];
for (const archivo of capturas.sort()) {
  const n = archivo.replace(/\.png$/, '');
  const [juego, ...resto] = n.split('-');
  const perfil = resto.join('-');
  filas.push({
    juego,
    perfil,
    salida: await medidaPng(path.join(carpeta, 'capturas', archivo)),
    tiempoReal: await cuadros(path.join(carpeta, 'hud', `${n}-tiempo-real`)),
    sinLimite: await cuadros(path.join(carpeta, 'hud', `${n}-sin-limite`)),
    gpu: await gpu(path.join(carpeta, 'gpu', `${n}.json`)),
    proceso: await proceso(path.join(carpeta, 'proc', `${n}.txt`)),
    erroresShader: await erroresDeShader(path.join(carpeta, 'registros', `${n}.log`)),
  });
}
await writeFile(path.join(carpeta, 'resultados.json'), `${JSON.stringify(filas, null, 2)}\n`);

const f = (v, d = 1) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d));
const lineas = [];
for (const juego of [...new Set(filas.map((x) => x.juego))]) {
  lineas.push(`### ${juego}`, '',
    '| Perfil | Imagen | FPS | ms media | ms p99 | Refrescos perdidos | FPS sin límite | ms sin límite | CPU RetroArch | GPU 3D | GPU MHz | W GPU | W paquete | RAM MB |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const x of filas.filter((y) => y.juego === juego)) {
    const r = x.tiempoReal ?? {};
    lineas.push(`| ${x.perfil} | ${x.salida ?? '—'} | ${f(r.fps)} | ${f(r.msMedia, 2)} | ${f(r.msP99, 2)} | ${r.refrescosPerdidos ?? '—'} de ${r.cuadros ?? '—'} | ${f(x.sinLimite?.fps, 0)} | ${f(x.sinLimite?.msMedia, 2)} | ${f(x.proceso?.cpuRetroArch)} % | ${f(x.gpu?.ocupacion3D)} % | ${f(x.gpu?.mhz, 0)} | ${f(x.gpu?.vatiosGpu, 2)} | ${f(x.gpu?.vatiosPaquete, 2)} | ${f(x.proceso?.memoriaMaxMB, 0)} |`);
  }
  const errores = filas.filter((y) => y.juego === juego && y.erroresShader.length);
  for (const x of errores) lineas.push('', `Errores de shader en ${x.perfil}: ${x.erroresShader.join(' / ')}`);
  lineas.push('');
}
await writeFile(path.join(carpeta, 'tabla.md'), `${lineas.join('\n')}\n`);
console.log(lineas.join('\n'));
