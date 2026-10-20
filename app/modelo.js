// Lo que cada pieza necesita para dibujarse, calculado a partir del estado. Funciones puras.
import { fondoPortada } from './arte.js';
import { juegosDelSistema, MENU } from './estado.js';

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

export function vistaDe(estado, datos, ahora = new Date()) {
  const lista = juegosDelSistema(datos.juegos, estado.sistema);
  const indice = Math.max(0, lista.findIndex((juego) => juego.id === estado.seleccion));
  const juego = lista[indice] ?? null;
  const activo = datos.sistemas.findIndex((sistema) => sistema.id === estado.sistema);
  return {
    estado,
    sistemas: datos.sistemas,
    ventanaSistemas: ventanaSistemas(datos.sistemas.length, activo),
    lista,
    indice,
    juego,
    ranuras: ranurasCarrusel(lista, indice),
    esFavorito: juego ? estado.favoritos.includes(juego.id) : false,
    fondo: juego ? fondoPortada(juego) : '',
    marcador: juego ? marcador(juego.id) : null,
    reloj: textosReloj(ahora),
    menu: MENU,
  };
}
