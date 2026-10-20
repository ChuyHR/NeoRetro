// Estado de la pantalla y cómo cambia con cada acción (mover, aceptar, volver…). Son funciones puras:
// no tocan la página, para poder probarlas con Node y para que el teclado y, cuando se retome la
// fase 4, el mando produzcan exactamente las mismas acciones.

export const MENU = ['jugar', 'favorito', 'detalles', 'configuracion'];

// Botones de cada ventana, en el orden en que los recorren las flechas.
export const BOTONES = {
  detalles: ['jugar', 'cerrar'],
  configuracion: ['crt-activado', 'crt-desactivado', 'cerrar'],
  lanzamiento: ['cerrar'],
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
  };
}

export function juegosDelSistema(juegos, sistema) {
  return sistema === 'todos' ? juegos : juegos.filter((juego) => juego.sistema === sistema);
}

// Una acción es un texto ('derecha') o un objeto con valor ({ tipo: 'seleccionar', valor: 'zelda' }).
export function aplicar(estado, accion, datos) {
  const { tipo, valor } = typeof accion === 'string' ? { tipo: accion } : accion;
  return estado.ventana ? enVentana(estado, tipo, valor) : enPantalla(estado, tipo, valor, datos);
}

function enPantalla(estado, tipo, valor, datos) {
  const lista = juegosDelSistema(datos.juegos, estado.sistema);
  switch (tipo) {
    case 'izquierda':
    case 'derecha': {
      if (!lista.length) return estado;
      const actual = Math.max(0, lista.findIndex((juego) => juego.id === estado.seleccion));
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
      return pulsar(estado, botones[estado.foco]);
    case 'boton':
      return botones.includes(valor) ? pulsar({ ...estado, foco: botones.indexOf(valor) }, valor) : estado;
    case 'volver':
      return cerrar(estado);
    // Las dos siguientes las produce el lanzador, no el teclado.
    case 'juego-terminado':
      return cerrar(estado);
    case 'error-lanzamiento':
      return estado.ventana === 'lanzamiento' ? { ...estado, error: valor } : estado;
    default:
      return estado;
  }
}

function cerrar(estado) {
  return { ...estado, ventana: null, foco: 0, error: null };
}

function pulsar(estado, boton) {
  switch (boton) {
    case 'jugar':
      return { ...estado, ventana: 'lanzamiento', foco: 0 };
    case 'crt-activado':
      return { ...estado, crt: true };
    case 'crt-desactivado':
      return { ...estado, crt: false };
    case 'cerrar':
      return cerrar(estado);
    default:
      return estado;
  }
}
