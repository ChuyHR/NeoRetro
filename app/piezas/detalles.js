// Ventana de detalles del juego. El texto va a 24 px (ajuste aprobado; el prototipo usaba 21).
import { BOTONES } from '../estado.js';
import { montar } from './dom.js';
import { lineaDatos } from './ficha.js';
import { marcarFocoAlterno } from './foco.js';

// Una línea «Etiqueta: valor» que se oculta si el dato todavía no existe.
function rellenar(elemento, etiqueta, valor) {
  elemento.textContent = valor ? `${etiqueta}: ${valor}` : '';
  elemento.style.display = valor ? '' : 'none';
}

export function crearDetalles(lienzo, { despachar }) {
  const refs = montar(lienzo, `
  <div data-ref="capa" style="position: absolute; inset: 0; z-index: 100; background: rgba(2,4,10,0.82); display: none; align-items: center; justify-content: center">
    <div role="dialog" aria-label="Detalles del juego" style="position: relative; width: 900px; padding: 40px; border-radius: 22px; background: #0A1020; border: 2px solid #1E90FF; box-shadow: 0 0 50px #1769FF55; display: flex; gap: 36px">
      <div data-ref="portada" style="width: 240px; height: 320px; flex-shrink: 0; border-radius: 12px; border: 3px solid; overflow: hidden; display: flex; flex-direction: column">
        <div data-ref="arte" style="position: relative; flex: 1"><div data-ref="tituloPortada" style="position: absolute; left: 8%; right: 8%; bottom: 10%; font-family: 'Bungee', sans-serif; font-size: 28px; line-height: 0.95; text-align: center; color: #fff"></div></div>
        <div data-ref="banda" style="height: 40px; display: flex; align-items: center; justify-content: center; background: #08080F; font-weight: 700; font-size: 16px"></div>
      </div>
      <div style="flex: 1; display: flex; flex-direction: column; gap: 12px; font-family: 'Share Tech Mono', monospace; font-size: 24px">
        <span data-ref="titulo" style="font-family: 'Pixelify Sans', monospace; font-weight: 700; font-size: 38px"></span>
        <span data-ref="meta" style="color: #8FA8E8"></span>
        <span data-ref="plataforma"></span>
        <span data-ref="jugadores"></span>
        <span data-ref="controles"></span>
        <span data-ref="emulador"></span>
        <div style="display: flex; gap: 12px; margin-top: auto">
          <button data-ref="jugar" style="height: 52px; padding: 0 26px; border-radius: 10px; border: 3px solid #1E90FF; background: #0B2350; color: #F5F7FF; font-family: 'Pixelify Sans', monospace; font-weight: 700; font-size: 22px">JUGAR</button>
          <button data-ref="cerrar" style="height: 52px; padding: 0 26px; border-radius: 10px; border: 2px solid #2A3B70; background: #0E1730; color: #F5F7FF; font-family: 'Pixelify Sans', monospace; font-weight: 600; font-size: 22px">VOLVER AL INICIO</button>
        </div>
      </div>
    </div>
  </div>`);
  refs.jugar.addEventListener('click', () => despachar({ tipo: 'boton', valor: 'jugar' }));
  refs.cerrar.addEventListener('click', () => despachar({ tipo: 'boton', valor: 'cerrar' }));

  return {
    actualizar({ estado, juego, fondo }) {
      const visible = estado.ventana === 'detalles' && juego;
      refs.capa.style.display = visible ? 'flex' : 'none';
      if (!visible) return;
      const [principal, secundario] = juego.colores;
      const titulo = juego.titulo.toUpperCase();
      refs.portada.style.borderColor = principal;
      refs.arte.style.background = fondo;
      refs.tituloPortada.textContent = titulo;
      refs.tituloPortada.style.textShadow = `3px 3px 0 ${principal}`;
      refs.banda.textContent = juego.nombreSistema;
      refs.banda.style.color = secundario;
      refs.titulo.textContent = titulo;
      refs.meta.textContent = lineaDatos(juego);
      rellenar(refs.plataforma, 'Plataforma', juego.nombreSistema);
      rellenar(refs.jugadores, 'Jugadores', juego.jugadores);
      rellenar(refs.controles, 'Controles', juego.controles);
      rellenar(refs.emulador, 'Emulador', juego.emulador);
      const enfocado = BOTONES.detalles[estado.foco];
      marcarFocoAlterno(refs.jugar, enfocado === 'jugar');
      marcarFocoAlterno(refs.cerrar, enfocado === 'cerrar');
    },
  };
}
