// Captura las pantallas de Neo Arcade con la biblioteca del Game Stick, para que el menú del Game
// Stick se vea igual. Abre Neo Arcade (el Electron del repositorio) con la biblioteca que arma
// scripts/preparar-diseno.py y lo maneja por el protocolo de depuración de Chromium: recorre cada
// sistema y «ALL GAMES» juego por juego, comprueba que el juego del centro sea el esperado y guarda la
// pantalla a 1920×1080. Aparte guarda la barra con FAVORITOS y RECIENTES activos y el menú de acciones
// en sus cuatro estados (JUGAR o FAVORITOS elegido, con la estrella apagada o encendida).
//
// Antes de cada captura cambia lo que en el Game Stick no aplica: la hora (no tiene reloj) por «LITE»
// y «GAME STICK 4K», la versión por «NEO ARCADE LITE» y la leyenda del pie por los botones del tablero.
//
// Se corre en el Debian de WSL, desde la raíz de ArcadeRetro (Node 22 o más nuevo, por WebSocket):
//   node GameStickLite/scripts/capturar-diseno.mjs <biblioteca> <salida>
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// --solo-portada: solo la portada, sin recorrer los juegos.
const [biblioteca, salida] = process.argv.slice(2).filter((a) => !a.startsWith('--')).map((ruta) => path.resolve(ruta));
if (!biblioteca || !salida) {
  console.error('Uso: node GameStickLite/scripts/capturar-diseno.mjs <biblioteca> <salida>');
  process.exit(2);
}
const RAIZ = path.resolve(import.meta.dirname, '../..');
const PUERTO = 9333;
const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms));

// Lo mismo que verá la interfaz, calculado con el núcleo de Neo Arcade.
process.env.NEO_ARCADE_ROMS = path.join(biblioteca, 'roms');
process.env.NEO_ARCADE_MEDIOS = path.join(biblioteca, 'medios');
process.env.NEO_ARCADE_DATOS = path.join(biblioteca, 'datos');
const { cargarConfiguracion } = await import(path.join(RAIZ, 'core/configuracion.js'));
const { escanearBiblioteca } = await import(path.join(RAIZ, 'core/escaner/escaner.js'));
const { leerMedios } = await import(path.join(RAIZ, 'core/medios/medios.js'));
const { datosParaInterfaz } = await import(path.join(RAIZ, 'core/biblioteca.js'));
const configuracion = await cargarConfiguracion();
const { biblioteca: leida } = await escanearBiblioteca(configuracion, path.join(biblioteca, 'datos', 'cache.json'));
const datos = datosParaInterfaz(configuracion, leida, await leerMedios(configuracion));
const vistas = datos.sistemas.map(({ id, nombre }) => ({
  id, nombre, juegos: id === 'todos' ? datos.juegos : datos.juegos.filter((juego) => juego.sistema === id),
}));
console.log(vistas.map((v) => `${v.nombre} ${v.juegos.length}`).join(' · '));

// Neo Arcade con la depuración remota abierta.
const app = spawn(path.join(RAIZ, 'node_modules/.bin/electron'), ['.', '--no-sandbox', `--remote-debugging-port=${PUERTO}`], {
  cwd: RAIZ, env: { ...process.env, GALLIUM_DRIVER: 'd3d12' }, stdio: 'ignore',
});
let pagina = null;
for (let intento = 0; intento < 60 && !pagina; intento += 1) {
  await esperar(500);
  const lista = await fetch(`http://127.0.0.1:${PUERTO}/json/list`).then((r) => r.json()).catch(() => []);
  pagina = lista.find((t) => t.type === 'page');
}
if (!pagina) throw new Error('Neo Arcade no abrió la depuración remota');

const ws = new WebSocket(pagina.webSocketDebuggerUrl);
await new Promise((listo, falla) => { ws.onopen = listo; ws.onerror = falla; });
let siguienteId = 1;
const pendientes = new Map();
ws.onmessage = ({ data }) => {
  const mensaje = JSON.parse(data);
  if (mensaje.id && pendientes.has(mensaje.id)) {
    pendientes.get(mensaje.id)(mensaje);
    pendientes.delete(mensaje.id);
  }
};
const cdp = (method, params = {}) => new Promise((listo, falla) => {
  const id = siguienteId++;
  pendientes.set(id, (m) => (m.error ? falla(new Error(`${method}: ${m.error.message}`)) : listo(m.result)));
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluar = async (expresion) => (await cdp('Runtime.evaluate', { expression: expresion, returnByValue: true, awaitPromise: true })).result.value;

await cdp('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
for (let intento = 0; intento < 60; intento += 1) {
  if (await evaluar(`document.fonts.status === 'loaded' && !!document.querySelector('[data-ref="titulo"]')?.textContent`)) break;
  await esperar(500);
}
await esperar(1500);

const TECLAS = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, PageDown: 34, KeyX: 88 };
async function tecla(code) {
  const base = { code, key: code.replace('Key', '').toLowerCase().length === 1 ? code.slice(3).toLowerCase() : code, windowsVirtualKeyCode: TECLAS[code] };
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  await esperar(450); // el carrusel se acomoda con una transición
}

// Lo que no aplica en el Game Stick. Se vuelve a poner antes de cada captura: el reloj se repinta.
const BOTON = (t) => `<span style="width: 38px; height: 38px; border-radius: 50%; border: 3px solid #8FA8E8; display: flex; align-items: center; justify-content: center; color: #F5F7FF">${t}</span>`;
const TECLA = (t) => `<span style="height: 38px; padding: 0 10px; border-radius: 8px; border: 3px solid #8FA8E8; box-sizing: border-box; display: flex; align-items: center; justify-content: center; color: #F5F7FF; font-size: 18px">${t}</span>`;
const CRUCETA = '<svg width="46" height="46" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill="#5A6A96"></path></svg>';
const grupo = (indicador, texto, sep = 18) => `<span style="display: flex; align-items: center; gap: ${sep}px">${indicador}${texto}</span>`;
const LEYENDA = [
  grupo(CRUCETA, 'NAVEGAR', 22), grupo(BOTON('A'), 'JUGAR'), grupo(BOTON('X'), 'FAVORITO'),
  grupo(`<span style="display: flex; gap: 8px">${TECLA('LB')}${TECLA('RB')}</span>`, 'SISTEMA'),
  grupo(`<span style="display: flex; gap: 8px">${TECLA('SELECT')}${TECLA('START')}</span>`, 'SALIR'),
].join('');
const AJUSTES = `(() => {
  const hora = document.querySelector('[data-ref="hora"]'); if (hora) hora.textContent = 'LITE';
  const fecha = document.querySelector('[data-ref="fecha"]'); if (fecha) fecha.textContent = 'GAME STICK 4K';
  for (const s of document.querySelectorAll('span')) {
    if (s.textContent === 'NEO ARCADE V1') s.textContent = 'NEO ARCADE LITE';
    if (s.textContent === 'LINUX 6.1') s.textContent = 'LINUX 3.0';
  }
  const pie = document.querySelector('[data-ref="controles"]'); if (pie) pie.innerHTML = ${JSON.stringify(LEYENDA)};
  return true;
})()`;

const activa = () => evaluar(`document.querySelector('[data-ref="barra"] [aria-pressed="true"]')?.textContent.trim()`);
const central = () => evaluar(`[...document.querySelectorAll('[aria-label$=", seleccionado"]')].map((b) => b.getAttribute('aria-label').replace(/, seleccionado$/, ''))[0]`);
async function capturar(archivo) {
  await evaluar(AJUSTES);
  await esperar(120);
  const { data } = await cdp('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 }, captureBeyondViewport: true });
  await mkdir(path.dirname(archivo), { recursive: true });
  await writeFile(archivo, Buffer.from(data, 'base64'));
}
async function irA(nombre) {
  for (let vuelta = 0; vuelta < 20; vuelta += 1) {
    if ((await activa())?.toUpperCase() === nombre.toUpperCase()) return;
    await tecla('PageDown');
  }
  throw new Error(`No llegué a ${nombre} en la barra`);
}

// La portada: la animación de arranque de Neo Arcade (app/piezas/arranque.js) en su cuadro final. El
// Game Stick la muestra mientras carga. Se pone encima de todo con el mismo marcado.
await evaluar(`(() => {
  const capa = document.createElement('div');
  capa.id = 'portada-gamestick';
  capa.setAttribute('style', 'position: fixed; inset: 0; z-index: 9999; background: #050914; display: flex; align-items: center; justify-content: center');
  capa.innerHTML = \`<div style="display: flex; align-items: center; gap: 44px">
      <svg width="264" height="264" viewBox="0 0 64 64">
        <rect x="6" y="38" width="52" height="20" rx="5" fill="none" stroke="#00BFFF" stroke-width="4"></rect>
        <rect x="29" y="16" width="6" height="24" fill="#F5F7FF"></rect>
        <rect x="22" y="4" width="20" height="16" rx="3" fill="#FF168C"></rect>
        <rect x="14" y="45" width="8" height="6" fill="#FF168C"></rect>
        <rect x="42" y="45" width="8" height="6" fill="#00BFFF"></rect>
      </svg>
      <div style="display: flex; flex-direction: column; gap: 20px">
        <div style="font-family: 'Bungee', 'Arial Black', sans-serif; font-size: 140px; line-height: 1; color: #F5F7FF; text-shadow: 0 10px 0 #1769FF66">NEO ARCADE</div>
        <div style="display: flex; align-items: center; gap: 28px; font-family: 'Pixelify Sans', monospace; font-weight: 700; font-size: 80px; color: #FF168C; text-shadow: 0 0 28px #FF168C">
          <span style="width: 84px; height: 16px; border-top: 6px solid #FF168C; border-bottom: 6px solid #FF168C"></span>
          PLAY AGAIN
          <span style="width: 84px; height: 16px; border-top: 6px solid #FF168C; border-bottom: 6px solid #FF168C"></span>
        </div>
      </div>
    </div>\`;
  document.body.append(capa);
  return true;
})()`);
await esperar(300);
{
  const { data } = await cdp('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 }, captureBeyondViewport: true });
  await mkdir(salida, { recursive: true });
  await writeFile(path.join(salida, 'portada.png'), Buffer.from(data, 'base64'));
}
await evaluar(`document.getElementById('portada-gamestick').remove(), true`);
if (process.argv.includes('--solo-portada')) {
  console.log('Listo: portada.png');
  ws.close();
  app.kill();
  process.exit(0);
}

const indice = [];
for (const vista of vistas) {
  await irA(vista.nombre);
  // Al llegar a un sistema, Neo Arcade elige su primer juego: se comprueba y se avanza uno por uno.
  for (let i = 0; i < vista.juegos.length; i += 1) {
    const juego = vista.juegos[i];
    const visto = await central();
    if (visto !== juego.titulo) throw new Error(`En ${vista.nombre} esperaba «${juego.titulo}» y está «${visto}»`);
    const archivo = path.join(salida, vista.id, `${String(i).padStart(3, '0')}.png`);
    await capturar(archivo);
    indice.push({ vista: vista.id, indice: i, id: juego.id, titulo: juego.titulo, png: path.relative(salida, archivo) });
    await tecla('ArrowRight');
  }
  process.stdout.write(`${vista.nombre}: ${vista.juegos.length} pantallas\n`);
}

// La barra con FAVORITOS y RECIENTES activos (de esas vistas solo se usa la barra).
for (const [id, nombre] of [['favoritos', 'FAVORITOS'], ['recientes', 'RECIENTES']]) {
  await irA(nombre);
  await capturar(path.join(salida, 'barras', `${id}.png`));
}
// El menú de acciones: el favorito de muestra (estrella encendida) y otro juego (apagada), con JUGAR
// y con FAVORITOS elegidos.
await irA('FAVORITOS');
await capturar(path.join(salida, 'acciones', 'jugar-si.png'));
await tecla('ArrowDown');
await capturar(path.join(salida, 'acciones', 'favorito-si.png'));
await tecla('ArrowUp');
await irA(vistas[0].nombre);
await tecla('ArrowRight');
await capturar(path.join(salida, 'acciones', 'jugar-no.png'));
await tecla('ArrowDown');
await capturar(path.join(salida, 'acciones', 'favorito-no.png'));

await writeFile(path.join(salida, 'indice.json'), `${JSON.stringify({ vistas: vistas.map((v) => ({ id: v.id, nombre: v.nombre })), pantallas: indice }, null, 1)}\n`);
console.log(`Listo: ${indice.length} pantallas en ${salida}`);
ws.close();
app.kill();
