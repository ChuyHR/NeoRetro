// Estado de la pantalla y cómo cambia con cada acción (mover, aceptar, volver…). Son funciones puras:
// no tocan la página, para poder probarlas con Node y para que el teclado y el mando produzcan
// exactamente las mismas acciones. Lo que se guarda entre sesiones (favoritos, recientes, último juego
// de cada sistema, ajustes) también vive aquí; app/inicio.js lo manda a guardar cuando cambia.
import { AJUSTES_INICIALES, PASO_VOLUMEN } from './ajustes.js';
import { asignar, esMovimiento, mapeoTerminado, nuevoMapeo, omitir } from './mapeo.js';

export const MENU = ['jugar', 'favorito', 'detalles', 'configuracion'];
export const MAX_RECIENTES = 50;
export const LARGO_BUSQUEDA = 24;

// Configuración en filas: arriba y abajo cambian de fila; izquierda y derecha, de opción.
export const FILAS_CONFIGURACION = [
  ['crt-activado', 'crt-desactivado'],
  ['neon-alto', 'neon-bajo'],
  ['animaciones-si', 'animaciones-no'],
  ['volumen-menos', 'volumen-mas'],
  ['tema-azul', 'tema-magenta', 'tema-violeta', 'tema-naranja'],
  ['salir-select-start', 'salir-mantener-start', 'salir-lr-select-start'],
  ['imagen-original', 'imagen-nitido', 'imagen-crt', 'imagen-crt-suave'],
  ['continuar-si', 'continuar-no'],
  ['menu-mantener-select', 'menu-ninguno'],
  ['probar-control', 'configurar-control'],
  ['apagar', 'reiniciar'],
  ['restablecer'],
  ['cerrar'],
];

// Teclado en pantalla de «Buscar».
export const FILAS_TECLADO = [
  [...'1234567890'],
  [...'QWERTYUIOP'],
  [...'ASDFGHJKLÑ'],
  [...'ZXCVBNM-:.'],
  ['ESPACIO', 'BORRAR', 'LISTO'],
];

// Botones de cada ventana en filas, y en el orden en que los recorren las flechas.
const FILAS = {
  detalles: [['jugar', 'cerrar']],
  configuracion: FILAS_CONFIGURACION,
  lanzamiento: [['cerrar']],
  'prueba-control': [['cerrar']],
  'configurar-control': [['cerrar']],
  buscar: FILAS_TECLADO,
};
export const BOTONES = Object.fromEntries(Object.entries(FILAS).map(([ventana, filas]) => [ventana, filas.flat()]));

// guardados: lo que devuelve el núcleo de la sesión anterior (core/almacenamiento/). Sin selección se
// muestra el primer juego de la lista. La demostración del prototipo arranca con
// { seleccion: 'sf2', favoritos: ['sf2'] }.
export function estadoInicial({ seleccion = null, favoritos = [], recientes = [], partidas = {}, ultimoPorSistema = {}, sistema = 'todos', ajustes = {} } = {}) {
  return {
    sistema,
    seleccion,
    favoritos,
    recientes, // [{ id, fecha }], el más reciente primero
    partidas, // id → { veces, segundos }: cuántas veces se abrió cada juego y cuánto se jugó en total
    ultimoPorSistema, // sistema → id del último juego elegido en él
    busqueda: '', // texto confirmado en «Buscar»; mientras hay uno, la barra muestra la búsqueda
    escribiendo: '', // lo que se lleva escrito en el teclado de «Buscar»
    accion: 0,
    ventana: null,
    foco: 0,
    confirmar: null, // 'restablecer', 'apagar' o 'reiniciar' tras su primera pulsación
    equipo: null, // 'apagar' o 'reiniciar' ya confirmado: app/inicio.js se lo pide al núcleo
    ajustes: { ...AJUSTES_INICIALES, ...ajustes },
    error: null, // mensaje para el usuario si un juego no se pudo abrir
    entrada: 'teclado', // lo último que se usó: el pie muestra sus teclas o sus botones
    mandos: [], // conectados, como los describe core/entrada/mandos.js
    ultimoMando: null, // clave del último mando que se movió
    prueba: { pulsados: [], ultimo: null }, // lo que muestra «Probar control»
    mapeo: null, // «Configurar control» en curso (app/mapeo.js)
  };
}

export function juegosDelSistema(juegos, sistema) {
  return sistema === 'todos' ? juegos : juegos.filter((juego) => juego.sistema === sistema);
}

// Índice por id de cada biblioteca, para no recorrer 3.000 juegos en cada pulsación.
const indices = new WeakMap();
function porId(datos) {
  let indice = indices.get(datos);
  if (!indice) {
    indice = new Map(datos.juegos.map((juego) => [juego.id, juego]));
    indices.set(datos, indice);
  }
  return indice;
}

const sinAcentos = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const coincide = (titulo, busqueda) => sinAcentos(titulo).includes(sinAcentos(busqueda.trim()));

// La barra: «todos», los sistemas con juegos y, al final, los filtros que tienen algo (Favoritos,
// Recientes y la búsqueda activa). Al final y no al principio para no mover los sistemas de lugar.
export function sistemasDeLaBarra(datos, estado) {
  if (!datos.sistemas.length) return [];
  const ids = porId(datos);
  const filtros = [];
  if (estado.favoritos.some((id) => ids.has(id))) filtros.push({ id: 'favoritos', nombre: 'FAVORITOS' });
  if (estado.recientes.some(({ id }) => ids.has(id))) filtros.push({ id: 'recientes', nombre: 'RECIENTES' });
  if (estado.busqueda) filtros.push({ id: 'busqueda', nombre: `«${estado.busqueda}»` });
  return [...datos.sistemas, ...filtros];
}

// Los juegos de lo que está elegido en la barra: un sistema, «todos» o un filtro.
export function juegosDeLaVista(datos, estado, sistema = estado.sistema) {
  switch (sistema) {
    case 'favoritos': {
      const favoritos = new Set(estado.favoritos);
      return datos.juegos.filter((juego) => favoritos.has(juego.id));
    }
    case 'recientes': {
      const ids = porId(datos);
      return estado.recientes.map(({ id }) => ids.get(id)).filter(Boolean);
    }
    case 'busqueda':
      return estado.busqueda ? datos.juegos.filter((juego) => coincide(juego.titulo, estado.busqueda)) : [];
    default:
      return juegosDelSistema(datos.juegos, sistema);
  }
}

// Una acción es un texto ('derecha') o un objeto con valor ({ tipo: 'seleccionar', valor: 'zelda' }).
export function aplicar(estado, accion, datos) {
  const { tipo, valor } = typeof accion === 'string' ? { tipo: accion } : accion;
  const comun = deCualquierPantalla(estado, tipo, valor);
  if (comun) return comun;
  const siguiente = estado.ventana ? enVentana(estado, tipo, valor, datos) : enPantalla(estado, tipo, valor, datos);
  return siguiente === estado ? estado : ajustarVista(siguiente, datos, estado);
}

// Lo que avisan los mandos y el lanzador vale en cualquier pantalla.
function deCualquierPantalla(estado, tipo, valor) {
  switch (tipo) {
    case 'entrada':
      return estado.entrada === valor ? estado : { ...estado, entrada: valor };
    case 'mandos':
      return { ...estado, mandos: valor };
    case 'control': {
      const siguiente = estado.ultimoMando === valor.mando ? estado : { ...estado, ultimoMando: valor.mando };
      if (estado.ventana !== 'prueba-control') return siguiente;
      const otros = estado.prueba.pulsados.filter((control) => control !== valor.control);
      return { ...siguiente, prueba: { ...estado.prueba, pulsados: valor.pulsado ? [...otros, valor.control] : otros } };
    }
    case 'crudo':
      return conCrudo(estado, valor);
    case 'jugado': {
      // Un juego que se abrió de verdad pasa al frente de Recientes y suma una partida con su tiempo.
      const recientes = [{ id: valor.id, fecha: valor.fecha }, ...estado.recientes.filter(({ id }) => id !== valor.id)];
      const previa = estado.partidas[valor.id] ?? { veces: 0, segundos: 0 };
      const partida = { veces: previa.veces + 1, segundos: previa.segundos + Math.max(0, Math.round(valor.segundos ?? 0)) };
      return { ...estado, recientes: recientes.slice(0, MAX_RECIENTES), partidas: { ...estado.partidas, [valor.id]: partida } };
    }
    default:
      return null;
  }
}

function conCrudo(estado, crudo) {
  if (!esMovimiento(crudo)) return estado;
  const conMando = { ...estado, ultimoMando: crudo.mando };
  if (estado.ventana === 'prueba-control') {
    const ultimo = crudo.tipo === 'boton' ? `botón ${crudo.codigo}` : `eje ${crudo.codigo} hacia ${crudo.normalizado > (crudo.reposo ?? 0) ? '+' : '−'}`;
    return { ...conMando, prueba: { ...estado.prueba, ultimo } };
  }
  if (estado.ventana === 'configurar-control' && estado.mapeo) {
    return { ...conMando, mapeo: asignar(estado.mapeo, crudo) };
  }
  // Un mando que Neo Arcade no sabe leer abre «Configurar control» la primera vez que se usa.
  if (!estado.ventana && crudo.origen === 'sin-configurar') {
    return { ...conMando, ventana: 'configurar-control', foco: 0, mapeo: nuevoMapeo({ clave: crudo.mando, nombre: crudo.nombre }) };
  }
  return conMando;
}

// Tras cada cambio: si lo elegido en la barra ya no existe (se quitó el último favorito), se vuelve a
// «todos»; si el juego elegido ya no está en la lista, se elige el que quedó en su lugar.
function ajustarVista(estado, datos, anterior) {
  const barra = sistemasDeLaBarra(datos, estado);
  const sistema = !barra.length || barra.some(({ id }) => id === estado.sistema) ? estado.sistema : 'todos';
  const lista = juegosDeLaVista(datos, estado, sistema);
  let { seleccion } = estado;
  if (lista.length && !lista.some(({ id }) => id === seleccion)) {
    const antes = juegosDeLaVista(datos, anterior, anterior.sistema).findIndex(({ id }) => id === estado.seleccion);
    seleccion = lista[Math.min(Math.max(0, antes), lista.length - 1)].id;
  }
  return sistema === estado.sistema && seleccion === estado.seleccion ? estado : { ...estado, sistema, seleccion };
}

function enPantalla(estado, tipo, valor, datos) {
  const lista = juegosDeLaVista(datos, estado);
  switch (tipo) {
    case 'izquierda':
    case 'derecha': {
      if (!lista.length) return estado;
      const actual = indiceDe(lista, estado.seleccion);
      const paso = tipo === 'derecha' ? 1 : -1;
      return { ...estado, seleccion: lista[(actual + paso + lista.length) % lista.length].id };
    }
    case 'arriba':
      return { ...estado, accion: Math.max(0, estado.accion - 1) };
    case 'abajo':
      return { ...estado, accion: Math.min(MENU.length - 1, estado.accion + 1) };
    case 'aceptar':
      return ejecutar(estado, MENU[estado.accion], lista);
    case 'ejecutar':
      return MENU.includes(valor) ? ejecutar({ ...estado, accion: MENU.indexOf(valor) }, valor, lista) : estado;
    case 'favorito':
      return ejecutar(estado, 'favorito', lista);
    case 'ajustes':
      return ejecutar(estado, 'configuracion', lista);
    case 'buscar':
      return datos.juegos.length ? { ...estado, ventana: 'buscar', foco: 0, escribiendo: estado.busqueda } : estado;
    case 'escribir': // con el teclado físico, escribir en la pantalla principal abre «Buscar»
      return datos.juegos.length && valor.trim() ? { ...estado, ventana: 'buscar', foco: 0, escribiendo: valor } : estado;
    case 'volver': // con una búsqueda a la vista, volver la quita
      return estado.sistema === 'busqueda' ? { ...estado, busqueda: '', sistema: 'todos' } : estado;
    case 'filtro':
      return siguienteFiltro(estado, datos);
    case 'letra-anterior':
    case 'letra-siguiente':
      return saltarLetra(estado, lista, tipo === 'letra-siguiente');
    case 'seleccionar':
      return lista.some((juego) => juego.id === valor) ? { ...estado, seleccion: valor } : estado;
    case 'sistema-anterior':
    case 'sistema-siguiente': {
      const barra = sistemasDeLaBarra(datos, estado);
      if (barra.length === 0) return estado;
      const actual = barra.findIndex((sistema) => sistema.id === estado.sistema);
      const paso = tipo === 'sistema-siguiente' ? 1 : -1;
      return elegirSistema(estado, barra[(actual + paso + barra.length) % barra.length].id, datos);
    }
    case 'elegir-sistema':
      return elegirSistema(estado, valor, datos);
    default:
      return estado;
  }
}

// View: todos → Favoritos → Recientes → todos, saltando los filtros vacíos. Desde un sistema o una
// búsqueda, va al primer filtro.
function siguienteFiltro(estado, datos) {
  const filtros = sistemasDeLaBarra(datos, estado).map(({ id }) => id).filter((id) => id === 'favoritos' || id === 'recientes');
  if (!filtros.length) return estado;
  const ciclo = ['todos', ...filtros];
  const actual = ciclo.indexOf(estado.sistema);
  return elegirSistema(estado, actual < 0 ? filtros[0] : ciclo[(actual + 1) % ciclo.length], datos);
}

const indiceDe = (lista, id) => Math.max(0, lista.findIndex((juego) => juego.id === id));

// Letra con la que se agrupa un título: sin acentos; números y signos van juntos en «#».
export function inicial(titulo) {
  const letra = titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(letra) ? letra : '#';
}

// Siguiente: el primer juego de la letra que sigue. Anterior: el primero de la letra que va antes.
// Las dos dan la vuelta al llegar a un extremo, como las flechas.
function saltarLetra(estado, lista, siguiente) {
  const total = lista.length;
  if (!total) return estado;
  const actual = indiceDe(lista, estado.seleccion);
  const letra = inicial(lista[actual].titulo);
  const paso = siguiente ? 1 : -1;
  let destino = -1;
  for (let k = 1; k < total; k += 1) {
    const indice = (actual + paso * k + total) % total;
    if (inicial(lista[indice].titulo) !== letra) {
      destino = indice;
      break;
    }
  }
  if (destino < 0) return estado;
  if (!siguiente) {
    const otra = inicial(lista[destino].titulo);
    while (destino > 0 && inicial(lista[destino - 1].titulo) === otra) destino -= 1;
  }
  return { ...estado, seleccion: lista[destino].id };
}

function ejecutar(estado, nombre, lista) {
  const juego = lista.find((candidato) => candidato.id === estado.seleccion) ?? lista[0];
  if (!juego && nombre !== 'configuracion') return estado;
  switch (nombre) {
    case 'jugar':
      return { ...estado, ventana: 'lanzamiento', foco: 0 };
    case 'favorito': {
      const favoritos = estado.favoritos.includes(juego.id)
        ? estado.favoritos.filter((id) => id !== juego.id)
        : [...estado.favoritos, juego.id];
      return { ...estado, favoritos };
    }
    case 'detalles':
      return { ...estado, ventana: 'detalles', foco: 0 };
    case 'configuracion':
      return { ...estado, ventana: 'configuracion', foco: estado.ajustes.crt ? 0 : 1, confirmar: null };
    default:
      return estado;
  }
}

// Al cambiar de sistema se recuerda el juego que quedó elegido en el anterior. En el nuevo se vuelve al
// que se recordaba; si no hay, se queda el actual si está ahí, y si no, el primero.
function elegirSistema(estado, id, datos) {
  const ultimoPorSistema = { ...estado.ultimoPorSistema, [estado.sistema]: estado.seleccion };
  const lista = juegosDeLaVista(datos, estado, id);
  const esta = (candidato) => lista.some((juego) => juego.id === candidato);
  const seleccion = [ultimoPorSistema[id], estado.seleccion].find(esta) ?? lista[0]?.id ?? estado.seleccion;
  return { ...estado, sistema: id, seleccion, ultimoPorSistema };
}

// Movimiento dentro de una ventana. Con una sola fila, las cuatro flechas avanzan y retroceden; con
// varias, arriba y abajo cambian de fila en la misma proporción de columna (la primera sigue siendo la
// primera; en el teclado, de la «M» se baja a LISTO).
function moverFoco(filas, foco, tipo) {
  const plano = filas.flat();
  if (filas.length === 1) {
    const paso = tipo === 'derecha' || tipo === 'abajo' ? 1 : -1;
    return Math.min(plano.length - 1, Math.max(0, foco + paso));
  }
  let fila = 0;
  let columna = foco;
  while (columna >= filas[fila].length) {
    columna -= filas[fila].length;
    fila += 1;
  }
  if (tipo === 'izquierda' || tipo === 'derecha') {
    columna = Math.min(filas[fila].length - 1, Math.max(0, columna + (tipo === 'derecha' ? 1 : -1)));
  } else {
    const nueva = Math.min(filas.length - 1, Math.max(0, fila + (tipo === 'abajo' ? 1 : -1)));
    if (nueva !== fila) {
      columna = Math.min(filas[nueva].length - 1, Math.floor((columna * filas[nueva].length) / filas[fila].length));
      fila = nueva;
    }
  }
  return filas.slice(0, fila).reduce((suma, actual) => suma + actual.length, 0) + columna;
}

function enVentana(estado, tipo, valor, datos) {
  const botones = BOTONES[estado.ventana];
  switch (tipo) {
    case 'izquierda':
    case 'derecha':
    case 'arriba':
    case 'abajo':
      return { ...estado, foco: moverFoco(FILAS[estado.ventana], estado.foco, tipo), confirmar: null };
    case 'aceptar':
      // En «Configurar control», Enter salta un paso que se puede saltar; al terminar, cierra.
      if (estado.ventana === 'configurar-control' && estado.mapeo && !mapeoTerminado(estado.mapeo)) return omitirPaso(estado);
      // En «Buscar», Enter del teclado físico confirma lo escrito; A del mando pulsa la tecla marcada.
      if (estado.ventana === 'buscar' && estado.entrada === 'teclado') return confirmarBusqueda(estado, datos);
      return pulsar(estado, botones[estado.foco], datos);
    case 'boton':
      return botones.includes(valor) ? pulsar({ ...estado, foco: botones.indexOf(valor) }, valor, datos) : estado;
    case 'escribir':
      return estado.ventana === 'buscar' ? escribir(estado, valor) : estado;
    case 'volver':
      // En «Buscar», volver borra una letra; sin nada escrito, cierra.
      if (estado.ventana === 'buscar' && estado.escribiendo) return { ...estado, escribiendo: estado.escribiendo.slice(0, -1) };
      return cerrar(estado);
    case 'ajustes':
      return estado.ventana === 'configuracion' ? cerrar(estado) : estado;
    case 'omitir-paso':
      return omitirPaso(estado);
    case 'equipo-hecho': // en desarrollo no se apaga nada: el aviso se quita
      return { ...estado, equipo: null };
    // Las dos siguientes las produce el lanzador, no el teclado.
    case 'juego-terminado':
      return cerrar(estado);
    case 'error-lanzamiento':
      return estado.ventana === 'lanzamiento' ? { ...estado, error: valor } : estado;
    default:
      return estado;
  }
}

function escribir(estado, texto) {
  const escribiendo = `${estado.escribiendo}${texto}`.slice(0, LARGO_BUSQUEDA);
  return escribiendo === estado.escribiendo ? estado : { ...estado, escribiendo };
}

// LISTO: la búsqueda pasa a la barra con sus resultados. Sin texto, se quita la que hubiera.
function confirmarBusqueda(estado, datos) {
  const busqueda = estado.escribiendo.trim().replace(/\s+/g, ' ');
  if (!busqueda) return { ...cerrar(estado), busqueda: '', sistema: estado.sistema === 'busqueda' ? 'todos' : estado.sistema };
  const resultados = datos.juegos.filter((juego) => coincide(juego.titulo, busqueda));
  return { ...cerrar(estado), busqueda, sistema: 'busqueda', seleccion: resultados[0]?.id ?? estado.seleccion };
}

function omitirPaso(estado) {
  return estado.ventana === 'configurar-control' && estado.mapeo ? { ...estado, mapeo: omitir(estado.mapeo) } : estado;
}

function cerrar(estado) {
  return { ...estado, ventana: null, foco: 0, error: null, mapeo: null, confirmar: null, prueba: { pulsados: [], ultimo: null } };
}

const conAjuste = (estado, cambio) => ({ ...estado, ajustes: { ...estado.ajustes, ...cambio }, confirmar: null });

function pulsar(estado, boton, datos) {
  if (estado.ventana === 'buscar') {
    if (boton === 'LISTO') return confirmarBusqueda(estado, datos);
    if (boton === 'BORRAR') return { ...estado, escribiendo: estado.escribiendo.slice(0, -1) };
    return escribir(estado, boton === 'ESPACIO' ? ' ' : boton);
  }
  const [grupo, ...resto] = boton.split('-');
  const opcion = resto.join('-');
  switch (grupo) {
    case 'crt':
      return conAjuste(estado, { crt: opcion === 'activado' });
    case 'neon':
      return conAjuste(estado, { neon: opcion });
    case 'animaciones':
      return conAjuste(estado, { animaciones: opcion === 'si' });
    case 'volumen': {
      const paso = opcion === 'mas' ? PASO_VOLUMEN : -PASO_VOLUMEN;
      return conAjuste(estado, { volumen: Math.min(100, Math.max(0, estado.ajustes.volumen + paso)) });
    }
    case 'tema':
      return conAjuste(estado, { tema: opcion });
    case 'salir':
      return conAjuste(estado, { salir: opcion });
    case 'imagen':
      return conAjuste(estado, { imagen: opcion });
    case 'continuar':
      return conAjuste(estado, { continuar: opcion === 'si' });
    case 'menu':
      return conAjuste(estado, { menu: opcion });
    default:
      break;
  }
  switch (boton) {
    case 'jugar':
      return { ...estado, ventana: 'lanzamiento', foco: 0 };
    case 'probar-control':
      return { ...estado, ventana: 'prueba-control', foco: 0, prueba: { pulsados: [], ultimo: null } };
    case 'configurar-control': {
      // El último mando que se movió; si no se ha movido ninguno, el primero conectado.
      const mando = estado.mandos.find(({ clave }) => clave === estado.ultimoMando) ?? estado.mandos[0];
      return { ...estado, ventana: 'configurar-control', foco: 0, mapeo: mando ? nuevoMapeo(mando) : null };
    }
    case 'restablecer':
      // Dos pulsaciones: la primera pide confirmar, la segunda devuelve los ajustes de fábrica.
      return estado.confirmar === 'restablecer'
        ? { ...estado, ajustes: { ...AJUSTES_INICIALES }, confirmar: null }
        : { ...estado, confirmar: 'restablecer' };
    case 'apagar':
    case 'reiniciar':
      // También con dos pulsaciones: apagar sin querer en medio de una partida no tiene vuelta atrás.
      return estado.confirmar === boton ? { ...estado, equipo: boton, confirmar: null } : { ...estado, confirmar: boton };
    case 'cerrar':
      return cerrar(estado);
    default:
      return estado;
  }
}
