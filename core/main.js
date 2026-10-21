// Proceso principal de Neo Arcade: abre la ventana de la interfaz, lee los mandos y atiende lo que la
// interfaz le pide por el puente de core/preload.cjs: la biblioteca de juegos, abrir un juego y
// guardar el mapeo de un mando.
import { app, BrowserWindow, ipcMain, Menu, protocol } from 'electron';
import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { crearAlmacen } from './almacenamiento/almacenamiento.js';
import { conteoPorSistema, datosParaInterfaz, ubicarJuego } from './biblioteca.js';
import { cargarConfiguracion, expandirRuta, RAIZ } from './configuracion.js';
import { iniciarMandos } from './entrada/mandos.js';
import { escribirPerfiles } from './entrada/perfil-retroarch.js';
import { limpiarPerfil } from './entrada/traductor.js';
import { escanearBiblioteca } from './escaner/escaner.js';
import { leerMedios } from './medios/medios.js';
import { crearServidorDeMedios } from './medios/servidor.js';
import { armarComando, comandoLegible, ejecutar, ErrorLanzamiento, falloAlAbrir, verificar } from './lanzador/lanzador.js';
import { ajustarRetroArch, COMBOS_SALIR } from './lanzador/retroarch-cfg.js';
import { crearRegistro } from './registro.js';

// Los medios llegan a la página por medio://, que el navegador debe tratar como origen seguro y al que
// debe pedir rangos (los necesita para los vídeos). Electron solo lo acepta antes de que la app esté
// lista, por eso va aquí arriba, antes de cualquier espera.
protocol.registerSchemesAsPrivileged([
  { scheme: 'medio', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

// Empaquetada con scripts/empaquetar.sh, el ejecutable se llama neo-arcade y Electron la da por
// empaquetada: Esc deja de cerrarla y no hay herramientas de desarrollo.
const DESARROLLO = !app.isPackaged;

// Solo en desarrollo: `npm start -- --captura=archivo.png` guarda lo que muestra la ventana y sale.
const CAPTURA = DESARROLLO
  ? process.argv.find((arg) => arg.startsWith('--captura='))?.slice('--captura='.length)
  : undefined;

// Solo en desarrollo: NEO_ARCADE_DEPURAR=1 escribe en la terminal cada acción que llega del mando, y
// NEO_ARCADE_MEDIR=1, la fluidez de la página cada 10 s y la memoria de cada proceso cada minuto.
const DEPURAR = DESARROLLO && Boolean(process.env.NEO_ARCADE_DEPURAR);
const MEDIR = DESARROLLO && process.env.NEO_ARCADE_MEDIR === '1';

function medirMemoria() {
  const porTipo = {};
  for (const { type, memory } of app.getAppMetrics()) porTipo[type] = (porTipo[type] ?? 0) + memory.workingSetSize;
  const total = Object.values(porTipo).reduce((suma, kb) => suma + kb, 0);
  const detalle = Object.entries(porTipo).map(([tipo, kb]) => `${tipo} ${Math.round(kb / 1024)} MB`).join(', ');
  console.log(`[medir] memoria total ${Math.round(total / 1024)} MB (${detalle})`);
}

// Tiempo mínimo de «Abriendo…» en pantalla antes de ocultar la ventana, para que alcance a leerse.
const PANTALLA_LANZAMIENTO_MS = 1200;

// En las pruebas, NEO_ARCADE_DATOS aparta la carpeta de datos (caché y registros) de la real.
if (process.env.NEO_ARCADE_DATOS) app.setPath('userData', expandirRuta(process.env.NEO_ARCADE_DATOS));

const configuracion = await cargarConfiguracion();
const registro = crearRegistro(app.getPath('userData'));
const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms));
let ventana = null;
let enJuego = false;
let mandos = null;

// Mapeos hechos en «Configurar control», uno por modelo de mando, en un JSON legible.
const ARCHIVO_MAPEOS = path.join(app.getPath('userData'), 'mandos.json');
const mapeos = await readFile(ARCHIVO_MAPEOS, 'utf8').then(JSON.parse, () => ({}));

// Favoritos, recientes, último juego por sistema y ajustes (core/almacenamiento/).
const almacen = crearAlmacen(path.join(app.getPath('userData'), 'datos-usuario.json'));
ipcMain.handle('datos-usuario', () => almacen.cargar());
ipcMain.handle('guardar-datos-usuario', (_evento, datos) => {
  almacen.guardar(datos);
  return true;
});

function enviar(canal, dato) {
  if (ventana && !ventana.isDestroyed()) ventana.webContents.send(canal, dato);
}

ipcMain.handle('mandos', () => mandos?.lista() ?? []);

ipcMain.handle('guardar-mapeo', async (_evento, clave, perfil) => {
  if (typeof clave !== 'string' || clave.length > 300) return false;
  mapeos[clave] = limpiarPerfil(perfil);
  // Se escribe aparte y se renombra: un corte de luz a la mitad no deja el archivo roto.
  await writeFile(`${ARCHIVO_MAPEOS}.nuevo`, `${JSON.stringify(mapeos, null, 2)}\n`);
  await rename(`${ARCHIVO_MAPEOS}.nuevo`, ARCHIVO_MAPEOS);
  await registro.anotar('mando', 'mapeo guardado', clave);
  mandos?.recargar(clave);
  return true;
});

ipcMain.handle('biblioteca', async () => {
  const inicio = Date.now();
  const archivoCache = path.join(app.getPath('userData'), 'biblioteca.json');
  const [{ biblioteca, leidos }, medios] = await Promise.all([
    escanearBiblioteca(configuracion, archivoCache),
    leerMedios(configuracion),
  ]);
  const datos = datosParaInterfaz(configuracion, biblioteca, medios);
  const conteo = conteoPorSistema(configuracion, biblioteca)
    .filter(({ juegos }) => juegos > 0)
    .map(({ id, juegos }) => `${id}=${juegos}`)
    .join(' ');
  const conCaratula = datos.juegos.filter((juego) => juego.caratula).length;
  await registro.anotar('biblioteca', `${Date.now() - inicio} ms`, `${leidos} sistemas leídos del disco`,
    conteo || 'sin juegos', `${conCaratula} con carátula`);
  return datos;
});

ipcMain.handle('jugar', async (_evento, id, opciones = {}) => {
  if (enJuego) return { ok: false, mensaje: 'Ya hay un juego abierto.' };
  const ubicado = ubicarJuego(id, configuracion);
  if (!ubicado) return { ok: false, mensaje: 'No encuentro ese juego en la biblioteca.' };
  enJuego = true;
  let comando = null;
  try {
    comando = armarComando(ubicado.sistema, ubicado.ruta, configuracion.emuladores);
    await verificar(comando, ubicado.sistema, ubicado.ruta);
    if (comando.emulador.carpetaPerfilesMando && mandos) {
      // Un mando configurado aquí debe servir igual dentro del juego. Si falla, el juego abre igual.
      await escribirPerfiles(expandirRuta(comando.emulador.carpetaPerfilesMando), mandos.conectados())
        .catch((error) => registro.anotar('mando', 'no se pudo escribir el perfil de RetroArch', String(error)));
    }
    if (comando.emulador.archivoConfiguracion) {
      // La combinación para salir que se eligió en Configuración. Si falla, el juego abre igual.
      await ajustarRetroArch(expandirRuta(comando.emulador.archivoConfiguracion), {
        input_quit_gamepad_combo: COMBOS_SALIR[opciones?.salir] ?? COMBOS_SALIR['select-start'],
      }).catch((error) => registro.anotar('error', 'no se pudo ajustar retroarch.cfg', String(error)));
    }
    mandos?.soltarTodo();
    await esperar(PANTALLA_LANZAMIENTO_MS);
    ventana.hide();
    const resultado = await ejecutar(comando);
    const { codigo, senal, duracionMs } = resultado;
    await registro.anotar('lanzamiento', comandoLegible(comando), `salida ${codigo ?? senal}`, `${duracionMs} ms`);
    if (falloAlAbrir(resultado)) {
      return { ok: false, mensaje: `${ubicado.sistema.nombreEmulador} se cerró al abrir el juego. Puede que el archivo esté dañado o que no sea de ${ubicado.sistema.nombreLargo}.` };
    }
    return { ok: true, codigo };
  } catch (error) {
    const conocido = error instanceof ErrorLanzamiento;
    const mensaje = conocido ? error.message : 'No se pudo abrir el juego.';
    await registro.anotar('error', comando ? comandoLegible(comando) : id, mensaje, conocido ? '' : String(error?.stack ?? error));
    return { ok: false, mensaje };
  } finally {
    enJuego = false;
    volverAlFrente();
  }
});

// Al cerrar el emulador, la ventana vuelve en el mismo juego y recupera el foco. Ponerla encima un
// momento evita que el sistema de ventanas deje el foco en otra parte (plan, tabla de riesgos).
function volverAlFrente() {
  if (!ventana || ventana.isDestroyed()) return;
  if (!ventana.isVisible()) ventana.show();
  ventana.focus();
  ventana.setAlwaysOnTop(true);
  setTimeout(() => ventana?.setAlwaysOnTop(false), 300);
}

async function capturar(ruta) {
  await ventana.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
  await esperar(2600); // la animación de arranque dura 2 s
  const imagen = await ventana.webContents.capturePage();
  await writeFile(ruta, imagen.toPNG());
  const { width, height } = imagen.getSize();
  console.log(`captura guardada en ${ruta} (${width}x${height})`);
  app.quit();
}

function crearVentana() {
  ventana = new BrowserWindow({
    title: 'Neo Arcade',
    fullscreen: true,
    frame: false,
    show: false,
    backgroundColor: '#050914',
    webPreferences: {
      devTools: DESARROLLO,
      preload: path.join(RAIZ, 'core', 'preload.cjs'),
      // Los sonidos de navegación tienen que oírse también con el mando, que para el navegador no es
      // una pulsación del usuario.
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  ventana.webContents.on('before-input-event', (_evento, entrada) => {
    if (DESARROLLO && entrada.type === 'keyDown' && entrada.key === 'Escape') app.quit();
  });
  // Solo al medir: NEO_ARCADE_CSS agrega reglas a la página, para ver cuánto pesa un efecto apagándolo.
  if (MEDIR && process.env.NEO_ARCADE_CSS) {
    ventana.webContents.on('did-finish-load', () => ventana.webContents.insertCSS(process.env.NEO_ARCADE_CSS));
  }
  // En desarrollo, lo que la página escribe en su consola (errores incluidos) sale en la terminal.
  if (DESARROLLO) {
    ventana.webContents.on('console-message', ({ level, message, lineNumber, sourceId }) => {
      console.log(`[página ${level}] ${message} (${path.basename(sourceId ?? '')}:${lineNumber})`);
    });
  }

  // Al abrir también se fuerza el foco: el gestor de ventanas de un escritorio puede negárselo a una
  // ventana nueva si otra estaba en uso, y en una consola el teclado y el mando tienen que llegar aquí.
  ventana.once('ready-to-show', () => {
    ventana.show();
    volverAlFrente();
    if (CAPTURA) capturar(CAPTURA);
  });

  ventana.loadFile(path.join(RAIZ, 'app', 'index.html'));
}

// Sin menú tampoco existen sus atajos (recargar, herramientas de desarrollo, zoom).
Menu.setApplicationMenu(null);
console.log(`Neo Arcade ${app.getVersion()} en ${DESARROLLO ? 'modo desarrollo' : 'versión final'}`);
app.whenReady().then(() => {
  protocol.handle('medio', crearServidorDeMedios(configuracion));
  crearVentana();
  if (MEDIR) setInterval(medirMemoria, 60000);
  // Con un emulador abierto el mando es del juego: Neo Arcade no reacciona hasta que se cierre.
  mandos = iniciarMandos({
    mapa: configuracion.mapaMando,
    perfilGuardado: (clave) => mapeos[clave] ?? null,
    alAccion: (accion) => {
      if (DEPURAR) console.log(`[mando] ${accion}${enJuego ? ' (ignorada: hay un juego abierto)' : ''}`);
      if (!enJuego) enviar('mando-accion', accion);
    },
    alControl: (cambio) => enJuego || enviar('mando-control', cambio),
    alCrudo: (suceso) => enJuego || enviar('mando-crudo', suceso),
    alCambio: (lista) => enviar('mandos', lista),
    anotar: (...partes) => registro.anotar(...partes),
  });
});
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => mandos?.detener());
// Antes de salir se escribe lo que haya quedado pendiente de guardar (se juntan los cambios seguidos).
let guardadoAlSalir = false;
app.on('before-quit', (evento) => {
  if (guardadoAlSalir) return;
  evento.preventDefault();
  almacen.vaciar().finally(() => {
    guardadoAlSalir = true;
    app.quit();
  });
});
