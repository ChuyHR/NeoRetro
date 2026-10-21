// Estado de la pantalla y cómo cambia con cada acción (mover, aceptar, volver…). Son funciones puras:
// no tocan la página, para poder probarlas con Node y para que el teclado y el mando produzcan
// exactamente las mismas acciones.
import { asignar, esMovimiento, mapeoTerminado, nuevoMapeo, omitir } from './mapeo.js';

export const MENU = ['jugar', 'favorito', 'detalles', 'configuracion'];

// Botones de cada ventana, en el orden en que los recorren las flechas.
export const BOTONES = {
  detalles: ['jugar', 'cerrar'],
  configuracion: ['crt-activado', 'crt-desactivado', 'probar-control', 'configurar-control', 'cerrar'],
  lanzamiento: ['cerrar'],
  'prueba-control': ['cerrar'],
  'configurar-control': ['cerrar'],
};

// Sin selección se muestra el primer juego de la lista. La demostración del prototipo arranca con
// { seleccion: 'sf2', favoritos: ['sf2'] }.
export function estadoInicial({ seleccion = null, favoritos = [] } = {}) {
  return {
    sistema: 'todos',
    seleccion,
    favoritos,
    accion: 0,
    ventana: null,
    foco: 0,
    crt: true,
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

// Una acción es un texto ('derecha') o un objeto con valor ({ tipo: 'seleccionar', valor: 'zelda' }).
export function aplicar(estado, accion, datos) {
  const { tipo, valor } = typeof accion === 'string' ? { tipo: accion } : accion;
  const comun = deLosMandos(estado, tipo, valor);
  if (comun) return comun;
  return estado.ventana ? enVentana(estado, tipo, valor) : enPantalla(estado, tipo, valor, datos);
}

// Lo que avisan los mandos vale en cualquier pantalla.
function deLosMandos(estado, tipo, valor) {
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

function enPantalla(estado, tipo, valor, datos) {
  const lista = juegosDelSistema(datos.juegos, estado.sistema);
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
    case 'letra-anterior':
    case 'letra-siguiente':
      return saltarLetra(estado, lista, tipo === 'letra-siguiente');
    case 'seleccionar':
      return lista.some((juego) => juego.id === valor) ? { ...estado, seleccion: valor } : estado;
    case 'sistema-anterior':
    case 'sistema-siguiente': {
      const total = datos.sistemas.length;
      if (total === 0) return estado;
      const actual = datos.sistemas.findIndex((sistema) => sistema.id === estado.sistema);
      const paso = tipo === 'sistema-siguiente' ? 1 : -1;
      return elegirSistema(estado, datos.sistemas[(actual + paso + total) % total].id, datos);
    }
    case 'elegir-sistema':
      return elegirSistema(estado, valor, datos);
    default:
      return estado;
  }
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
      return { ...estado, ventana: 'configuracion', foco: estado.crt ? 0 : 1 };
    default:
      return estado;
  }
}

// Si el juego elegido no está en el sistema nuevo, se pasa al primero de ese sistema.
function elegirSistema(estado, id, datos) {
  const lista = juegosDelSistema(datos.juegos, id);
  const sigue = lista.some((juego) => juego.id === estado.seleccion);
  return { ...estado, sistema: id, seleccion: sigue ? estado.seleccion : (lista[0]?.id ?? estado.seleccion) };
}

function enVentana(estado, tipo, valor) {
  const botones = BOTONES[estado.ventana];
  switch (tipo) {
    case 'izquierda':
    case 'arriba':
      return { ...estado, foco: Math.max(0, estado.foco - 1) };
    case 'derecha':
    case 'abajo':
      return { ...estado, foco: Math.min(botones.length - 1, estado.foco + 1) };
    case 'aceptar':
      // En «Configurar control», Enter salta un paso que se puede saltar; al terminar, cierra.
      if (estado.ventana === 'configurar-control' && estado.mapeo && !mapeoTerminado(estado.mapeo)) return omitirPaso(estado);
      return pulsar(estado, botones[estado.foco]);
    case 'boton':
      return botones.includes(valor) ? pulsar({ ...estado, foco: botones.indexOf(valor) }, valor) : estado;
    case 'volver':
      return cerrar(estado);
    case 'ajustes':
      return estado.ventana === 'configuracion' ? cerrar(estado) : estado;
    case 'omitir-paso':
      return omitirPaso(estado);
    // Las dos siguientes las produce el lanzador, no el teclado.
    case 'juego-terminado':
      return cerrar(estado);
    case 'error-lanzamiento':
      return estado.ventana === 'lanzamiento' ? { ...estado, error: valor } : estado;
    default:
      return estado;
  }
}

function omitirPaso(estado) {
  return estado.ventana === 'configurar-control' && estado.mapeo ? { ...estado, mapeo: omitir(estado.mapeo) } : estado;
}

function cerrar(estado) {
  return { ...estado, ventana: null, foco: 0, error: null, mapeo: null, prueba: { pulsados: [], ultimo: null } };
}

function pulsar(estado, boton) {
  switch (boton) {
    case 'jugar':
      return { ...estado, ventana: 'lanzamiento', foco: 0 };
    case 'crt-activado':
      return { ...estado, crt: true };
    case 'crt-desactivado':
      return { ...estado, crt: false };
    case 'probar-control':
      return { ...estado, ventana: 'prueba-control', foco: 0, prueba: { pulsados: [], ultimo: null } };
    case 'configurar-control': {
      // El último mando que se movió; si no se ha movido ninguno, el primero conectado.
      const mando = estado.mandos.find(({ clave }) => clave === estado.ultimoMando) ?? estado.mandos[0];
      return { ...estado, ventana: 'configurar-control', foco: 0, mapeo: mando ? nuevoMapeo(mando) : null };
    }
    case 'cerrar':
      return cerrar(estado);
    default:
      return estado;
  }
}
