// Lo que cada pieza necesita para dibujarse, calculado a partir del estado. Funciones puras.
import { fondoPortada } from './arte.js';
import { coincide, juegosDeLaVista, MENU, sistemasDeLaBarra } from './estado.js';

export const TOP_CARRUSEL = 452;

// Lugares del carrusel por desplazamiento respecto al juego central, con los valores del prototipo:
// [left, top en el lienzo, ancho, alto, giro, opacidad]. Los extremos (-4 y +5) son transparentes y
// sirven para que las portadas entren y salgan deslizándose.
export const RANURAS = {
  '-4': [-200, 474, 154, 238, 'perspective(900px) rotateY(10deg)', 0],
  '-3': [79, 464, 194, 250, 'perspective(900px) rotateY(10deg)', 1],
  '-2': [290, 450, 206, 267, 'perspective(900px) rotateY(8deg)', 1],
  '-1': [512, 436, 188, 284, 'perspective(900px) rotateY(16deg)', 1],
  0: [719, 382, 427, 375, 'none', 1],
  1: [1162, 436, 190, 284, 'perspective(900px) rotateY(-16deg)', 1],
  2: [1366, 450, 178, 267, 'perspective(900px) rotateY(-12deg)', 1],
  3: [1556, 464, 140, 250, 'perspective(900px) rotateY(-14deg)', 1],
  4: [1709, 474, 154, 238, 'perspective(900px) rotateY(-10deg)', 1],
  5: [1960, 474, 154, 238, 'perspective(900px) rotateY(-10deg)', 0],
};

export function ranurasCarrusel(lista, indice) {
  const ranuras = [];
  lista.forEach((juego, posicion) => {
    const desplazamiento = posicion - indice;
    const ranura = RANURAS[desplazamiento];
    if (!ranura) return;
    const [left, top, ancho, alto, giro, opacidad] = ranura;
    ranuras.push({
      juego,
      desplazamiento,
      central: desplazamiento === 0,
      left,
      top: top - TOP_CARRUSEL,
      ancho,
      alto,
      giro,
      opacidad,
      z: 20 - Math.abs(desplazamiento),
    });
  });
  return ranuras;
}

// La barra muestra 12 sistemas; si hay más, se desplaza para que el activo quede a la vista.
export const SISTEMAS_VISIBLES = 12;

export function ventanaSistemas(total, activo, visibles = SISTEMAS_VISIBLES) {
  if (total <= visibles) return { inicio: 0, fin: total };
  const inicio = Math.min(Math.max(0, activo - (visibles / 2 - 1)), total - visibles);
  return { inicio, fin: inicio + visibles };
}

const DIAS = ['DOM.', 'LUN.', 'MAR.', 'MIÉ.', 'JUE.', 'VIE.', 'SÁB.'];
const MESES = ['ENE.', 'FEB.', 'MAR.', 'ABR.', 'MAY.', 'JUN.', 'JUL.', 'AGO.', 'SEP.', 'OCT.', 'NOV.', 'DIC.'];

export function textosReloj(fecha) {
  const dosCifras = (numero) => String(numero).padStart(2, '0');
  return {
    hora: `${dosCifras(fecha.getHours())}:${dosCifras(fecha.getMinutes())}`,
    fecha: `${DIAS[fecha.getDay()]} ${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`,
  };
}

// Marcador de adorno de la vista previa: fijo por juego, como en el prototipo.
export function marcador(id) {
  const suma = [...id].reduce((total, letra) => total + letra.charCodeAt(0), 0);
  return {
    puntos: String(((suma * 37) % 9000) + 1000).padStart(5, ' '),
    record: String(((suma * 211) % 90000) + 10000),
  };
}

// Cuándo se jugó por última vez, para Detalles: «hoy a las 19:05», «ayer a las 9:30» o «12 OCT. 2026».
export function textoUltimaPartida(fecha, ahora = new Date()) {
  if (!fecha) return null;
  const cuando = new Date(fecha);
  const dosCifras = (numero) => String(numero).padStart(2, '0');
  const hora = `${cuando.getHours()}:${dosCifras(cuando.getMinutes())}`;
  const dia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((dia(ahora) - dia(cuando)) / 86400000);
  if (dias === 0) return `hoy a las ${hora}`;
  if (dias === 1) return `ayer a las ${hora}`;
  return `${cuando.getDate()} ${MESES[cuando.getMonth()]} ${cuando.getFullYear()}`;
}

// Cuánto se ha jugado, para Detalles: «1 vez, 12 min», «5 veces, 3 h 20 min». Menos de un minuto no
// se cuenta como tiempo: suele ser un juego que se abrió y se cerró enseguida.
export function textoTiempoJugado(partida) {
  if (!partida?.veces) return null;
  const veces = partida.veces === 1 ? '1 vez' : `${partida.veces} veces`;
  const minutos = Math.floor(partida.segundos / 60);
  if (minutos < 1) return veces;
  const horas = Math.floor(minutos / 60);
  const tiempo = horas ? `${horas} h${minutos % 60 ? ` ${minutos % 60} min` : ''}` : `${minutos} min`;
  return `${veces}, ${tiempo}`;
}

export function vistaDe(estado, datos, ahora = new Date()) {
  const lista = juegosDeLaVista(datos, estado);
  const indice = Math.max(0, lista.findIndex((juego) => juego.id === estado.seleccion));
  const juego = lista[indice] ?? null;
  const sistemas = sistemasDeLaBarra(datos, estado);
  const activo = sistemas.findIndex((sistema) => sistema.id === estado.sistema);
  const reciente = juego ? estado.recientes.find(({ id }) => id === juego.id) : null;
  return {
    estado,
    sistemas,
    ventanaSistemas: ventanaSistemas(sistemas.length, activo),
    lista,
    indice,
    juego,
    ranuras: ranurasCarrusel(lista, indice),
    esFavorito: juego ? estado.favoritos.includes(juego.id) : false,
    ultimaPartida: textoUltimaPartida(reciente?.fecha, ahora),
    tiempoJugado: juego ? textoTiempoJugado(estado.partidas?.[juego.id]) : null,
    // «Buscar» muestra cuántos juegos coinciden con lo que se lleva escrito.
    resultados: estado.ventana === 'buscar' && estado.escribiendo.trim()
      ? datos.juegos.filter((candidato) => coincide(candidato.titulo, estado.escribiendo)).length
      : null,
    fondo: juego ? fondoPortada(juego) : '',
    marcador: juego ? marcador(juego.id) : null,
    reloj: textosReloj(ahora),
    menu: MENU,
  };
}
