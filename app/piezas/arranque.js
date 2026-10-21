// Animación de arranque: el logo de Neo Arcade de la cabecera, en grande, sobre el fondo del lienzo,
// durante dos segundos; después se desvanece y deja ver la pantalla principal, que entra subiendo un
// poco. Con las animaciones apagadas, el logo aparece y se quita sin movimiento. Mientras se ve, la
// biblioteca termina de cargar; si tarda más, el logo espera.
import { montar } from './dom.js';

export const DURACION_ARRANQUE_MS = 2000;
const ENTRADA_MS = 400;
const SALIDA_MS = 400;

export function crearArranque(lienzo) {
  const refs = montar(lienzo, `
  <div data-ref="capa" aria-hidden="true" style="position: absolute; inset: 0; z-index: 300; background: #050914; display: flex; align-items: center; justify-content: center">
    <div data-ref="logo" style="display: flex; align-items: center; gap: 44px">
      <svg width="264" height="264" viewBox="0 0 64 64">
        <rect x="6" y="38" width="52" height="20" rx="5" fill="none" stroke="#00BFFF" stroke-width="4"></rect>
        <rect x="29" y="16" width="6" height="24" fill="#F5F7FF"></rect>
        <rect x="22" y="4" width="20" height="16" rx="3" fill="#FF168C"></rect>
        <rect x="14" y="45" width="8" height="6" fill="#FF168C"></rect>
        <rect x="42" y="45" width="8" height="6" fill="#00BFFF"></rect>
      </svg>
      <div style="display: flex; flex-direction: column; gap: 20px">
        <div style="font-family: 'Bungee', 'Arial Black', sans-serif; font-size: 140px; line-height: 1; color: #F5F7FF; text-shadow: 0 10px 0 #1769FF66">NEO ARCADE</div>
        <div style="display: flex; align-items: center; gap: 28px; font-family: 'Pixelify Sans', monospace; font-weight: 700; font-size: 80px; color: #FF168C; text-shadow: 0 0 28px #FF168C">
          <span style="width: 84px; height: 16px; border-top: 6px solid #FF168C; border-bottom: 6px solid #FF168C"></span>
          PLAY AGAIN
          <span style="width: 84px; height: 16px; border-top: 6px solid #FF168C; border-bottom: 6px solid #FF168C"></span>
        </div>
      </div>
    </div>
  </div>`);
  const inicio = performance.now();
  refs.logo.animate([{ opacity: 0, transform: 'scale(0.92)' }, { opacity: 1, transform: 'scale(1)' }], { duration: ENTRADA_MS, easing: 'ease-out' });

  return {
    // listo: promesa de que la pantalla principal ya tiene sus datos. principal: lo que entra al final.
    async terminar({ listo, animado, principal }) {
      await listo;
      const falta = DURACION_ARRANQUE_MS - SALIDA_MS - (performance.now() - inicio);
      if (falta > 0) await new Promise((hecho) => setTimeout(hecho, falta));
      if (!animado) {
        refs.capa.remove();
        return;
      }
      for (const elemento of principal) {
        elemento.animate([{ transform: 'translateY(30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: SALIDA_MS + 200, easing: 'ease-out' });
      }
      await refs.capa.animate([{ opacity: 1 }, { opacity: 0 }], { duration: SALIDA_MS, easing: 'ease-in', fill: 'forwards' }).finished;
      refs.capa.remove();
    },
  };
}
