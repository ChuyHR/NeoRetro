// Carrusel de portadas. Cada portada toma al instante su lugar final, con las medidas del prototipo, y
// el desplazamiento se anima solo con transform y opacidad (técnica FLIP): la tarjeta gráfica lo
// resuelve sin recalcular la página en cada cuadro, lo que importa con la GPU de la MP80.
import { fondoPortada } from '../arte.js';
import { montar } from './dom.js';

const DURACION_MS = 300; // la misma transición de 0.3 s del prototipo
const SIN_GIRO = 'perspective(900px) rotateY(0deg)'; // equivale a 'none' y permite interpolar el giro

const ESTILO_CARTA = 'position: absolute; padding: 0; border-radius: 12px; background: #050914; overflow: hidden; display: flex; flex-direction: column';
const MARCADO_CARTA = `<span style="position: relative; flex: 1; display: block"><span style="position: absolute; inset: 0; background: linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.75) 100%)"></span><span style="position: absolute; left: 8%; right: 8%; bottom: 10%; font-family: 'Bungee', 'Arial Black', sans-serif; line-height: 0.95; color: #FFFFFF; text-transform: uppercase; text-align: center; word-break: break-word"></span></span><span style="display: flex; align-items: center; justify-content: center; background: #08080F; font-family: 'Pixelify Sans', monospace; font-weight: 700; letter-spacing: 1px; white-space: nowrap"></span>`;

export function crearCarrusel(lienzo, { despachar }) {
  const refs = montar(lienzo, `
  <section data-ref="seccion" aria-label="Juegos" style="position: absolute; left: 0; top: 452px; width: 1920px; height: 400px">
    <div data-ref="marca" aria-hidden="true" style="position: absolute; left: 920px; top: -8px; width: 90px; height: 6px; background: #FF3B3B; z-index: 40"></div>
    <button data-ref="anterior" aria-label="Juego anterior" style="position: absolute; left: 10px; top: 112px; width: 44px; height: 76px; padding: 0; border: 0; background: transparent; z-index: 50">
      <svg width="34" height="60" viewBox="0 0 34 60" aria-hidden="true"><path d="M30 2 4 30l26 28z" fill="#1E90FF"></path></svg>
    </button>
    <button data-ref="siguiente" aria-label="Juego siguiente" style="position: absolute; right: 10px; top: 112px; width: 44px; height: 76px; padding: 0; border: 0; background: transparent; z-index: 50">
      <svg width="34" height="60" viewBox="0 0 34 60" aria-hidden="true"><path d="M4 2l26 28L4 58z" fill="#1E90FF"></path></svg>
    </button>
    <div data-ref="vacio" style="position: absolute; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 10px; font-size: 28px">
      <span>No hay juegos en este sistema</span>
      <span style="font-family: 'Share Tech Mono', monospace; font-size: 20px; color: #8997B8">Añade juegos a su carpeta y aparecerán aquí</span>
    </div>
    <div data-ref="sinJuegos" style="position: absolute; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 10px; font-size: 28px">
      <span>Todavía no hay juegos</span>
      <span style="max-width: 1200px; text-align: center; font-family: 'Share Tech Mono', monospace; font-size: 24px; line-height: 1.3; color: #8997B8">Copia tus juegos en la carpeta roms, cada sistema en su propia carpeta (arcade, snes, psx…), y vuelve a abrir Neo Arcade.</span>
    </div>
  </section>`);
  refs.anterior.addEventListener('click', () => despachar('izquierda'));
  refs.siguiente.addEventListener('click', () => despachar('derecha'));

  const cartas = new Map(); // id del juego → carta

  function crearCarta(juego) {
    const boton = document.createElement('button');
    boton.className = 'reflect';
    boton.setAttribute('style', ESTILO_CARTA);
    boton.innerHTML = MARCADO_CARTA;
    const [arte, banda] = boton.children;
    const titulo = arte.lastElementChild;
    arte.style.background = fondoPortada(juego);
    titulo.textContent = juego.titulo;
    titulo.style.textShadow = `3px 3px 0 ${juego.colores[0]}, 0 0 16px #000`;
    banda.textContent = juego.nombreSistema;
    banda.style.color = juego.colores[1];
    const carta = { boton, titulo, banda, caja: null, central: false };
    boton.addEventListener('click', () =>
      despachar(carta.central ? { tipo: 'ejecutar', valor: 'jugar' } : { tipo: 'seleccionar', valor: juego.id }));
    refs.seccion.insertBefore(boton, refs.marca);
    return carta;
  }

  function colocar(carta, ranura) {
    const { juego, central } = ranura;
    const largo = juego.titulo.length > 18;
    Object.assign(carta.boton.style, {
      left: `${ranura.left}px`,
      top: `${ranura.top}px`,
      width: `${ranura.ancho}px`,
      height: `${ranura.alto}px`,
      transform: ranura.giro,
      opacity: String(ranura.opacidad),
      zIndex: String(ranura.z),
      border: central ? '5px solid #1E90FF' : `3px solid ${juego.colores[0]}AA`,
      boxShadow: central ? '0 0 34px #1E90FFCC, 0 0 80px #1769FF66' : '0 14px 30px rgba(0,0,0,0.6)',
    });
    carta.titulo.style.fontSize = central ? (largo ? '40px' : '58px') : (largo ? '18px' : '26px');
    carta.banda.style.height = central ? '62px' : '36px';
    carta.banda.style.fontSize = central ? '30px' : (ranura.ancho < 170 ? '14px' : '17px');
    carta.boton.setAttribute('aria-label', juego.titulo + (central ? ', seleccionado' : ''));
    carta.central = central;
  }

  function animar(carta, antes, despues) {
    if (antes.left === despues.left && antes.top === despues.top && antes.ancho === despues.ancho) return;
    const dx = antes.left + antes.ancho / 2 - (despues.left + despues.ancho / 2);
    const dy = antes.top + antes.alto / 2 - (despues.top + despues.alto / 2);
    const giro = (valor) => (valor === 'none' ? SIN_GIRO : valor);
    for (const animacion of carta.boton.getAnimations()) animacion.cancel();
    carta.boton.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${antes.ancho / despues.ancho}, ${antes.alto / despues.alto}) ${giro(antes.giro)}`, opacity: antes.opacidad },
      { transform: `translate(0px, 0px) scale(1, 1) ${giro(despues.giro)}`, opacity: despues.opacidad },
    ], { duration: DURACION_MS, easing: 'ease' });
  }

  return {
    actualizar({ ranuras, lista, sistemas }) {
      const presentes = new Set();
      for (const ranura of ranuras) {
        presentes.add(ranura.juego.id);
        const carta = cartas.get(ranura.juego.id) ?? crearCarta(ranura.juego);
        cartas.set(ranura.juego.id, carta);
        const antes = carta.caja;
        colocar(carta, ranura);
        carta.caja = { left: ranura.left, top: ranura.top, ancho: ranura.ancho, alto: ranura.alto, giro: ranura.giro, opacidad: ranura.opacidad };
        if (antes) animar(carta, antes, carta.caja);
      }
      for (const [id, carta] of cartas) {
        if (presentes.has(id)) continue;
        carta.boton.remove();
        cartas.delete(id);
      }
      refs.marca.style.display = lista.length ? '' : 'none';
      // Sin ningún sistema en la barra, la biblioteca entera está vacía y se explica dónde van los juegos.
      // Este aviso no existe en el prototipo; el de un sistema vacío es el suyo, tal cual.
      const bibliotecaVacia = sistemas.length === 0;
      refs.vacio.style.display = lista.length || bibliotecaVacia ? 'none' : 'flex';
      refs.sinJuegos.style.display = bibliotecaVacia ? 'flex' : 'none';
    },
  };
}
