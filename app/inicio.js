// Arma la pantalla: crea las piezas en el orden del prototipo (que define qué queda encima), conecta
// el teclado y vuelve a pintar cada vez que una acción cambia el estado.
import { DATOS } from './datos-ejemplo.js';
import { escucharTeclado } from './entrada-teclado.js';
import { aplicar, estadoInicial, MENU } from './estado.js';
import { ajustarLienzo } from './lienzo.js';
import { vistaDe } from './modelo.js';
import { crearAcciones } from './piezas/acciones.js';
import { crearBarraSistemas } from './piezas/barra-sistemas.js';
import { crearCabecera } from './piezas/cabecera.js';
import { crearCarrusel } from './piezas/carrusel.js';
import { crearConfiguracion } from './piezas/configuracion.js';
import { crearLaterales, crearMoneda } from './piezas/decoracion.js';
import { crearDetalles } from './piezas/detalles.js';
import { crearFicha } from './piezas/ficha.js';
import { crearLanzamiento } from './piezas/lanzamiento.js';
import { crearPie } from './piezas/pie.js';
import { crearVistaPrevia } from './piezas/vista-previa.js';

const lienzo = document.getElementById('lienzo');
ajustarLienzo(lienzo);

let estado = estadoInicial();
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
  crearLanzamiento(lienzo, contexto),
];

function pintar() {
  const vista = vistaDe(estado, DATOS, new Date());
  for (const pieza of piezas) pieza.actualizar?.(vista);
}

function despachar(accion) {
  const siguiente = aplicar(estado, accion, DATOS);
  if (siguiente === estado) return;
  estado = siguiente;
  pintar();
}

escucharTeclado(window, despachar);
pintar();
