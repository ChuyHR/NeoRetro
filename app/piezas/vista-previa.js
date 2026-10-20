// Vista previa: una escena de pelea dibujada con los colores del juego y, si está activo, el efecto CRT.
// La fase 5 la reemplaza por la captura y el vídeo del juego.
import { montar } from './dom.js';

export function crearVistaPrevia(lienzo) {
  const refs = montar(lienzo, `
  <section aria-label="Vista previa" style="position: absolute; left: 1146px; top: 790px; width: 514px; height: 202px; box-sizing: border-box; padding: 10px; border-radius: 18px; background: #0A1330; border: 2px solid #23346A; box-shadow: 0 0 24px #1769FF44">
    <div data-ref="cielo" style="position: relative; width: 100%; height: 100%; border-radius: 8px; overflow: hidden">
      <div aria-hidden="true" style="position: absolute; left: 0; right: 0; bottom: 34px; height: 70px; display: flex; align-items: flex-end; gap: 6px; padding: 0 12px">
        <div style="width: 60px; height: 40px; background: #0E0A20"></div>
        <div style="width: 110px; height: 66px; background: #0E0A20; clip-path: polygon(0 30%, 50% 0, 100% 30%, 100% 100%, 0 100%)"></div>
        <div style="width: 70px; height: 52px; background: #0E0A20"></div>
        <div style="flex: 1"></div>
        <div style="width: 90px; height: 58px; background: #0E0A20"></div>
      </div>
      <div aria-hidden="true" style="position: absolute; left: 0; right: 0; bottom: 0; height: 36px; background: repeating-linear-gradient(90deg, #3A2A1A 0 38px, #4A3620 38px 40px)"></div>
      <div aria-hidden="true" style="position: absolute; left: 130px; bottom: 30px; width: 22px; height: 54px; background: #F5F7FF"></div>
      <div aria-hidden="true" style="position: absolute; left: 126px; bottom: 80px; width: 30px; height: 18px; background: #F5F7FF"></div>
      <div data-ref="rivalCuerpo" aria-hidden="true" style="position: absolute; right: 150px; bottom: 30px; width: 22px; height: 54px"></div>
      <div data-ref="rivalCabeza" aria-hidden="true" style="position: absolute; right: 146px; bottom: 80px; width: 30px; height: 18px"></div>
      <div style="position: absolute; left: 8px; right: 8px; top: 6px; display: flex; justify-content: space-between; font-family: 'Press Start 2P', monospace; font-size: 11px; color: #FFFFFF; text-shadow: 2px 2px 0 #000">
        <span>1P <span data-ref="puntos" style="color: #FFD23F"></span></span>
        <span>HI <span data-ref="record" style="color: #FFD23F"></span></span>
        <span>2P <span style="color: #FFD23F">000000</span></span>
      </div>
      <div aria-hidden="true" style="position: absolute; left: 8px; right: 8px; top: 24px; display: flex; align-items: center; gap: 10px">
        <div style="flex: 1; height: 10px; background: #FFD23F; border: 2px solid #000"></div>
        <span style="font-family: 'Press Start 2P', monospace; font-size: 12px; color: #FFFFFF; text-shadow: 2px 2px 0 #000">99</span>
        <div style="flex: 1; height: 10px; background: #FFD23F; border: 2px solid #000"></div>
      </div>
      <div data-ref="crt" aria-hidden="true" style="position: absolute; inset: 0; background: repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.22) 2px, rgba(0,0,0,0.22) 3px); pointer-events: none"></div>
    </div>
  </section>`);

  return {
    actualizar({ juego, marcador, estado }) {
      refs.crt.style.display = estado.crt ? '' : 'none';
      if (!juego) return;
      const [principal, secundario, fondo] = juego.colores;
      refs.cielo.style.background = `linear-gradient(180deg, ${fondo} 0%, ${principal} 100%)`;
      refs.rivalCuerpo.style.background = secundario;
      refs.rivalCabeza.style.background = secundario;
      refs.puntos.textContent = marcador.puntos;
      refs.record.textContent = marcador.record;
    },
  };
}
