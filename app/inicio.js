// Arma la pantalla: crea las piezas en el orden del prototipo (que define qué queda encima), carga la
// biblioteca, conecta el teclado y vuelve a pintar cada vez que una acción cambia el estado.
// Con el puente del núcleo (core/preload.cjs) usa la biblioteca real y abre los juegos; sin él, como
// en las herramientas de comparación, usa los datos de ejemplo del prototipo.
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

const puente = window.neoArcade ?? null;
let datos = { sistemas: [], juegos: [] };
let estado = estadoInicial();
let enJuego = false; // mientras corre un emulador, el teclado no hace nada aquí

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
  const vista = vistaDe(estado, datos, new Date());
  for (const pieza of piezas) pieza.actualizar?.(vista);
}

function despachar(accion) {
  const anterior = estado;
  const siguiente = aplicar(estado, accion, datos);
  if (siguiente === estado) return;
  estado = siguiente;
  pintar();
  if (puente && estado.ventana === 'lanzamiento' && anterior.ventana !== 'lanzamiento') jugar();
}

async function jugar() {
  const juego = vistaDe(estado, datos).juego;
  if (!juego) return;
  enJuego = true;
  try {
    const resultado = await puente.jugar(juego.id);
    despachar(resultado.ok ? 'juego-terminado' : { tipo: 'error-lanzamiento', valor: resultado.mensaje });
  } finally {
    enJuego = false;
  }
}

async function arrancar() {
  if (puente) {
    try {
      datos = await puente.biblioteca();
    } catch (error) {
      console.error('No se pudo leer la biblioteca:', error);
    }
    estado = estadoInicial({ seleccion: datos.juegos[0]?.id ?? null });
  } else {
    datos = DATOS;
    estado = estadoInicial({ seleccion: 'sf2', favoritos: ['sf2'] });
  }
  pintar();
}

escucharTeclado(window, (accion) => {
  if (!enJuego) despachar(accion);
});
arrancar();
