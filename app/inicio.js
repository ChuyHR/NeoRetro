// Arma la pantalla: crea las piezas en el orden del prototipo (que define qué queda encima), carga la
// biblioteca, conecta el teclado y el mando, y vuelve a pintar cada vez que una acción cambia el estado.
// Con el puente del núcleo (core/preload.cjs) usa la biblioteca real, abre los juegos y escucha los
// mandos; sin él, como en las herramientas de comparación, usa los datos de ejemplo del prototipo.
import { TEMAS } from './ajustes.js';
import { DATOS } from './datos-ejemplo.js';
import { escucharTeclado } from './entrada-teclado.js';
import { aplicar, estadoInicial, juegosDeLaVista, MENU, sistemasDeLaBarra } from './estado.js';
import { ajustarLienzo } from './lienzo.js';
import { esMovimiento, mapeoTerminado, PASOS_MAPEO } from './mapeo.js';
import { vistaDe } from './modelo.js';
import { crearSonidos, sonidoDelCambio } from './sonidos.js';
import { crearAcciones } from './piezas/acciones.js';
import { crearArranque } from './piezas/arranque.js';
import { crearBarraSistemas } from './piezas/barra-sistemas.js';
import { crearBuscar } from './piezas/buscar.js';
import { crearCabecera } from './piezas/cabecera.js';
import { crearCarrusel } from './piezas/carrusel.js';
import { crearConfiguracion } from './piezas/configuracion.js';
import { crearConfigurarControl, ESPERA_OMITIR_MS } from './piezas/configurar-control.js';
import { crearLaterales, crearMoneda } from './piezas/decoracion.js';
import { crearDetalles } from './piezas/detalles.js';
import { crearFicha } from './piezas/ficha.js';
import { crearLanzamiento } from './piezas/lanzamiento.js';
import { crearPie } from './piezas/pie.js';
import { crearPruebaControl } from './piezas/prueba-control.js';
import { crearVistaPrevia } from './piezas/vista-previa.js';

const lienzo = document.getElementById('lienzo');
ajustarLienzo(lienzo);

const puente = window.neoArcade ?? null;
let datos = { sistemas: [], juegos: [] };
let estado = estadoInicial();
let enJuego = false; // mientras corre un emulador, el teclado no hace nada aquí

const SALIR_PRUEBA_MS = 2000; // en «Probar control», B sostenido este tiempo cierra la pantalla
const CIERRE_MAPEO_MS = 2500; // «Listo» queda a la vista este tiempo antes de volver
// En estas pantallas el mando se lee crudo: sus acciones (A acepta, B vuelve…) no se aplican.
const SIN_ACCIONES_DE_MANDO = new Set(['prueba-control', 'configurar-control']);

const contexto = { despachar, menu: MENU };
const piezas = [
  crearLaterales(lienzo),
  crearCabecera(lienzo),
  crearBarraSistemas(lienzo, contexto),
  crearCarrusel(lienzo, contexto),
  crearFicha(lienzo),
  crearAcciones(lienzo, contexto),
  crearVistaPrevia(lienzo),
  crearMoneda(lienzo),
  crearPie(lienzo),
  crearDetalles(lienzo, contexto),
  crearConfiguracion(lienzo, contexto),
  crearBuscar(lienzo, contexto),
  crearPruebaControl(lienzo, contexto),
  crearConfigurarControl(lienzo, contexto),
  crearLanzamiento(lienzo, contexto),
];
const sonidos = crearSonidos();

// La animación de arranque se ve una vez por sesión (no al recargar la página, como hacen las pruebas)
// y solo con el núcleo: en la demostración del prototipo estorbaría a las comparaciones. Mientras se
// ve, teclado y mando no hacen nada.
function primeraVezEnLaSesion() {
  try {
    if (sessionStorage.getItem('neoArcadeArranque')) return false;
    sessionStorage.setItem('neoArcadeArranque', '1');
  } catch {
    // sin almacenamiento de sesión, se muestra siempre
  }
  return true;
}
const arranque = puente && primeraVezEnLaSesion() ? crearArranque(lienzo) : null;
let arrancando = Boolean(arranque);

// Los ajustes que no son de una sola pieza se aplican al lienzo entero: color del tema, brillo del neón
// y animaciones (app/estilos.css).
function aplicarAjustes({ tema, neon, animaciones }) {
  lienzo.style.setProperty('--acento', TEMAS[tema] ?? TEMAS.azul);
  lienzo.classList.toggle('neon-bajo', neon === 'bajo');
  lienzo.classList.toggle('sin-animaciones', !animaciones);
}

function pintar() {
  aplicarAjustes(estado.ajustes);
  const vista = vistaDe(estado, datos, new Date());
  for (const pieza of piezas) pieza.actualizar?.(vista);
}

function despachar(accion) {
  const anterior = estado;
  const siguiente = aplicar(estado, accion, datos);
  if (siguiente === estado) return;
  estado = siguiente;
  pintar();
  if (puente) sonidos.tocar(sonidoDelCambio(anterior, estado), estado.ajustes.volumen);
  if (puente && estado.ventana === 'lanzamiento' && anterior.ventana !== 'lanzamiento') jugar();
  efectosDelMapeo(anterior);
  if (estado.equipo && !anterior.equipo) pedirEquipo(estado.equipo);
  guardarSiCambio();
}

// Lo que se recuerda entre sesiones se manda a guardar cuando cambia; el núcleo junta los cambios
// seguidos. Una búsqueda no se recuerda: al volver a abrir, se está en «todos».
let guardado = null;
function guardarSiCambio() {
  if (!puente) return;
  const { favoritos, recientes, ajustes, ultimoPorSistema, sistema, seleccion } = estado;
  const ahora = [favoritos, recientes, ajustes, ultimoPorSistema, sistema, seleccion];
  if (guardado && ahora.every((valor, indice) => valor === guardado[indice])) return;
  guardado = ahora;
  const recordado = sistema === 'busqueda' ? ultimoPorSistema : { ...ultimoPorSistema, [sistema]: seleccion };
  puente.guardarDatosUsuario({
    favoritos,
    recientes,
    ultimoPorSistema: recordado,
    ultimoSistema: sistema === 'busqueda' ? 'todos' : sistema,
    perfil: 'normal',
    ajustes,
  });
}

// Al abrir, se vuelve al último sistema y al último juego elegidos, si siguen en la biblioteca.
function estadoGuardado(guardados) {
  const base = estadoInicial({
    favoritos: guardados.favoritos,
    recientes: guardados.recientes,
    ultimoPorSistema: guardados.ultimoPorSistema,
    ajustes: guardados.ajustes,
  });
  const barra = sistemasDeLaBarra(datos, base);
  const sistema = barra.some(({ id }) => id === guardados.ultimoSistema) ? guardados.ultimoSistema : 'todos';
  const lista = juegosDeLaVista(datos, base, sistema);
  const recordado = guardados.ultimoPorSistema?.[sistema];
  const seleccion = lista.some(({ id }) => id === recordado) ? recordado : (lista[0]?.id ?? null);
  return { ...base, sistema, seleccion };
}

async function jugar() {
  const juego = vistaDe(estado, datos).juego;
  if (!juego) return;
  enJuego = true;
  try {
    const resultado = await puente.jugar(juego.id, { salir: estado.ajustes.salir });
    if (resultado.ok) despachar({ tipo: 'jugado', valor: { id: juego.id, fecha: new Date().toISOString() } });
    despachar(resultado.ok ? 'juego-terminado' : { tipo: 'error-lanzamiento', valor: resultado.mensaje });
  } finally {
    enJuego = false;
  }
}

// «Configurar control»: un paso opcional se salta solo si no llega nada; al terminar se guarda el
// mapeo y, tras mostrar «Listo», se vuelve al inicio.
let temporizadorMapeo = null;
function efectosDelMapeo(anterior) {
  const antes = anterior.ventana === 'configurar-control' ? anterior.mapeo : null;
  const ahora = estado.ventana === 'configurar-control' ? estado.mapeo : null;
  if (antes?.paso === ahora?.paso && Boolean(antes) === Boolean(ahora)) return;
  clearTimeout(temporizadorMapeo);
  if (!ahora) return;
  if (mapeoTerminado(ahora)) {
    puente?.guardarMapeo(ahora.clave, ahora.perfil);
    temporizadorMapeo = setTimeout(() => estado.ventana === 'configurar-control' && despachar('volver'), CIERRE_MAPEO_MS);
  } else if (PASOS_MAPEO[ahora.paso][2]) {
    temporizadorMapeo = setTimeout(() => despachar('omitir-paso'), ESPERA_OMITIR_MS);
  }
}

// Apagar o reiniciar, ya confirmado. En la versión final el equipo se apaga y el aviso queda a la vista
// hasta el final; en desarrollo el núcleo no hace nada y el aviso se quita al rato.
async function pedirEquipo(accion) {
  if (!puente) return;
  await puente.equipo(accion);
  setTimeout(() => despachar('equipo-hecho'), 3000);
}

// «Probar control»: B sostenido dos segundos cierra la pantalla.
let temporizadorSalida = null;
function vigilarSalidaDePrueba({ control, pulsado }) {
  if (control !== 'b') return;
  clearTimeout(temporizadorSalida);
  if (pulsado && estado.ventana === 'prueba-control') {
    temporizadorSalida = setTimeout(() => estado.ventana === 'prueba-control' && despachar('volver'), SALIR_PRUEBA_MS);
  }
}

async function arrancar() {
  if (puente) {
    const [biblioteca, guardados] = await Promise.all([
      puente.biblioteca().catch((error) => {
        console.error('No se pudo leer la biblioteca:', error);
        return datos;
      }),
      puente.datosUsuario().catch(() => ({})),
    ]);
    datos = biblioteca;
    estado = estadoGuardado(guardados);
    guardado = [estado.favoritos, estado.recientes, estado.ajustes, estado.ultimoPorSistema, estado.sistema, estado.seleccion];
    escucharMandos();
  } else {
    datos = DATOS;
    estado = estadoInicial({ seleccion: 'sf2', favoritos: ['sf2'] });
  }
  pintar();
  programarReloj();
  if (puente?.medir) medirFluidez();
  if (arranque) {
    const principal = ['nav[aria-label="Sistemas"]', 'section[aria-label="Juegos"]', 'section[aria-label="Juego seleccionado"]']
      .map((selector) => lienzo.querySelector(selector)).filter(Boolean);
    await arranque.terminar({ listo: Promise.resolve(), animado: estado.ajustes.animaciones, principal });
  }
  arrancando = false;
}

// El reloj y la fecha de la cabecera cambian al empezar cada minuto.
function programarReloj() {
  const ahora = new Date();
  const falta = (60 - ahora.getSeconds()) * 1000 - ahora.getMilliseconds() + 50;
  setTimeout(() => {
    if (!enJuego) pintar();
    programarReloj();
  }, falta);
}

// Solo para medir (NEO_ARCADE_MEDIR=1): cada 10 s escribe en la consola, que en desarrollo sale en la
// terminal, cuánto tardaron los cuadros y cuánta memoria usa la página.
function medirFluidez() {
  let cuadros = [];
  let previo = performance.now();
  const paso = (ahora) => {
    cuadros.push(ahora - previo);
    previo = ahora;
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
  setInterval(() => {
    const ordenados = [...cuadros].sort((a, b) => a - b);
    const total = cuadros.reduce((suma, ms) => suma + ms, 0);
    const p = (fraccion) => ordenados[Math.min(ordenados.length - 1, Math.floor(ordenados.length * fraccion))]?.toFixed(1);
    const memoria = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : '?';
    console.log(`[medir] ${(1000 * cuadros.length / total).toFixed(1)} cuadros/s, mediana ${p(0.5)} ms, 95 % < ${p(0.95)} ms, ${cuadros.filter((ms) => ms > 25).length} de más de 25 ms, memoria de la página ${memoria} MB`);
    cuadros = [];
  }, 10000);
}

function escucharMandos() {
  puente.escuchar('mandos', (lista) => despachar({ tipo: 'mandos', valor: lista }));
  puente.escuchar('mando-accion', (accion) => {
    if (enJuego || arrancando || SIN_ACCIONES_DE_MANDO.has(estado.ventana)) return;
    despachar({ tipo: 'entrada', valor: 'mando' });
    despachar(accion);
  });
  puente.escuchar('mando-control', (cambio) => {
    if (enJuego || arrancando) return;
    despachar({ tipo: 'control', valor: cambio });
    vigilarSalidaDePrueba(cambio);
  });
  puente.escuchar('mando-crudo', (crudo) => {
    if (enJuego || arrancando) return;
    if (esMovimiento(crudo)) despachar({ tipo: 'entrada', valor: 'mando' });
    despachar({ tipo: 'crudo', valor: crudo });
  });
  puente.mandos().then((lista) => despachar({ tipo: 'mandos', valor: lista }));
}

escucharTeclado(window, (accion) => {
  if (enJuego || arrancando) return;
  despachar({ tipo: 'entrada', valor: 'teclado' });
  despachar(accion);
});
arrancar();
