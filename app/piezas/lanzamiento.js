// Pantalla de lanzamiento: se ve mientras arranca el emulador y, si el juego no se pudo abrir, explica
// por qué. Al cerrarse el emulador la app vuelve sola a la pantalla principal.
import { montar } from './dom.js';
import { marcarFoco } from './foco.js';

export function crearLanzamiento(lienzo, { despachar }) {
  const refs = montar(lienzo, `
  <div data-ref="capa" style="position: absolute; inset: 0; z-index: 120; background: #000000; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 30px">
    <span data-ref="abriendo" style="font-family: 'Share Tech Mono', monospace; font-size: 22px; color: #8997B8"></span>
    <span data-ref="titulo" style="max-width: 1600px; text-align: center; font-family: 'Bungee', sans-serif; font-size: 80px; color: #FFFFFF; text-shadow: 0 0 30px #1E90FF"></span>
    <span data-ref="press" class="blink" style="font-family: 'Press Start 2P', monospace; font-size: 22px; color: #FFD23F">PRESS START</span>
    <span data-ref="error" style="display: none; max-width: 1100px; text-align: center; font-family: 'Share Tech Mono', monospace; font-size: 26px; line-height: 1.3; color: #D6DCF0"></span>
    <button data-ref="cerrar" style="height: 56px; padding: 0 30px; border-radius: 10px; border: 3px solid #1E90FF; background: #0B2350; color: #F5F7FF; font-family: 'Pixelify Sans', monospace; font-weight: 700; font-size: 24px">VOLVER AL LAUNCHER</button>
  </div>`);
  refs.cerrar.addEventListener('click', () => despachar({ tipo: 'boton', valor: 'cerrar' }));
  marcarFoco(refs.cerrar, true); // es el único botón: siempre tiene el foco

  return {
    actualizar({ estado, juego }) {
      const visible = estado.ventana === 'lanzamiento' && juego;
      refs.capa.style.display = visible ? 'flex' : 'none';
      if (!visible) return;
      const fallo = Boolean(estado.error);
      refs.abriendo.textContent = fallo ? 'No se pudo abrir el juego' : `Abriendo ${juego.emulador}…`;
      refs.abriendo.style.color = fallo ? '#FFB020' : '#8997B8';
      refs.titulo.textContent = juego.titulo.toUpperCase();
      refs.press.style.display = fallo ? 'none' : '';
      refs.error.style.display = fallo ? '' : 'none';
      refs.error.textContent = estado.error ?? '';
      refs.cerrar.textContent = fallo ? 'VOLVER AL INICIO' : 'VOLVER AL LAUNCHER';
    },
  };
}
