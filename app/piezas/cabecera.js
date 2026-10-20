// Cabecera: logo, cartel central, ciudad al atardecer y reloj con fecha.
import { montar } from './dom.js';

const EDIFICIOS = [60, 95, 70, 110, 80, 50, 100, 75, 115, 65, 90, 55, 105, 85];
const VENTANAS = [
  'linear-gradient(#00BFFF 0 0) 40% 25%/4px 4px no-repeat, linear-gradient(#FFD23F 0 0) 60% 60%/4px 4px no-repeat',
  'linear-gradient(#FF168C 0 0) 30% 30%/4px 4px no-repeat, linear-gradient(#00BFFF 0 0) 65% 55%/4px 4px no-repeat',
];

const ciudad = EDIFICIOS.map((alto, i) => `<div style="flex: 1; height: ${alto}px; background: #140A30; border-top: 2px solid #3A1A6A; background-image: ${VENTANAS[i % 2]}"></div>`).join('');

export function crearCabecera(lienzo) {
  const refs = montar(lienzo, `
  <header style="position: absolute; left: 0; top: 0; width: 1920px; height: 232px">
    <div style="position: absolute; left: 0; top: 0; width: 712px; height: 232px; background: #080D1F; clip-path: polygon(0 0, 712px 0, 712px 190px, 670px 232px, 0 232px); display: flex; align-items: center; gap: 22px; padding-left: 64px; box-sizing: border-box">
      <svg width="132" height="132" viewBox="0 0 64 64" role="img" aria-label="Logo Neo Arcade">
        <rect x="6" y="38" width="52" height="20" rx="5" fill="none" stroke="#00BFFF" stroke-width="4"></rect>
        <rect x="29" y="16" width="6" height="24" fill="#F5F7FF"></rect>
        <rect x="22" y="4" width="20" height="16" rx="3" fill="#FF168C"></rect>
        <rect x="14" y="45" width="8" height="6" fill="#FF168C"></rect>
        <rect x="42" y="45" width="8" height="6" fill="#00BFFF"></rect>
      </svg>
      <div style="display: flex; flex-direction: column; gap: 10px">
        <div style="font-family: 'Bungee', 'Arial Black', sans-serif; font-size: 70px; line-height: 1; color: #F5F7FF; text-shadow: 0 5px 0 #1769FF66">NEO ARCADE</div>
        <div style="display: flex; align-items: center; gap: 14px; font-family: 'Pixelify Sans', monospace; font-weight: 700; font-size: 40px; color: #FF168C; text-shadow: 0 0 14px #FF168C">
          <span style="width: 42px; height: 8px; border-top: 3px solid #FF168C; border-bottom: 3px solid #FF168C"></span>
          PLAY AGAIN
          <span style="width: 42px; height: 8px; border-top: 3px solid #FF168C; border-bottom: 3px solid #FF168C"></span>
        </div>
      </div>
    </div>

    <div style="position: absolute; left: 712px; top: 0; width: 520px; height: 232px; background: #0A0F2E">
      <div style="position: absolute; left: 40px; right: 40px; top: 18px; height: 12px; background: #FF168C; box-shadow: 0 0 18px #FF168C"></div>
      <div style="position: absolute; left: 22px; top: 0; width: 14px; height: 232px; background: #1769FF; opacity: 0.6"></div>
      <div style="position: absolute; right: 22px; top: 0; width: 14px; height: 232px; background: #FF168C; opacity: 0.6"></div>
      <div style="position: absolute; left: 76px; top: 56px; width: 368px; height: 150px; border-radius: 12px; background: #040A1C; border: 3px solid #1769FF; box-shadow: 0 0 22px #1769FF88, inset 0 0 30px #00BFFF22; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-family: 'Pixelify Sans', monospace; font-weight: 600; font-size: 24px; line-height: 1.15; color: #00BFFF; text-shadow: 0 0 10px #00BFFF">
        <span>RETRO GAMES</span>
        <span>MODERN FEEL</span>
        <span>NEO ARCADE</span>
        <svg width="40" height="28" viewBox="0 0 10 7" aria-hidden="true" style="margin-top: 6px"><rect x="4" y="0" width="2" height="2" fill="#00BFFF"></rect><rect x="4.5" y="2" width="1" height="2" fill="#00BFFF"></rect><rect x="1" y="4" width="8" height="3" fill="#00BFFF"></rect></svg>
      </div>
      <div style="position: absolute; left: 84px; bottom: 8px; width: 26px; height: 26px; border-radius: 50%; background: #FF168C; box-shadow: 0 0 12px #FF168C"></div>
      <div style="position: absolute; right: 84px; bottom: 8px; width: 26px; height: 26px; border-radius: 50%; background: #FF168C; box-shadow: 0 0 12px #FF168C"></div>
    </div>

    <div style="position: absolute; left: 1232px; top: 0; width: 440px; height: 232px; overflow: hidden; background: #1A0B3A">
      <div style="position: absolute; inset: 0; background: linear-gradient(180deg, #0B0F2A 0%, #3A1260 70%, #6A1A6A 100%)"></div>
      <div aria-hidden="true" style="position: absolute; left: 100px; top: 18px; width: 150px; height: 150px; border-radius: 50%; background: linear-gradient(180deg, #FFD23F 0%, #FF8A3D 45%, #FF168C 100%); box-shadow: 0 0 40px #FF168C88"></div>
      <div aria-hidden="true" style="position: absolute; left: 90px; top: 100px; width: 170px; display: flex; flex-direction: column; gap: 9px">
        <div style="height: 3px; background: #2A1050"></div>
        <div style="height: 4px; background: #2A1050"></div>
        <div style="height: 5px; background: #2A1050"></div>
        <div style="height: 6px; background: #2A1050"></div>
      </div>
      <div aria-hidden="true" style="position: absolute; left: 0; right: 0; bottom: 0; height: 120px; display: flex; align-items: flex-end; gap: 3px">${ciudad}</div>
      <div style="position: absolute; right: 8px; top: 122px; text-align: right; font-family: 'Kaushan Script', cursive; font-size: 34px; line-height: 1.15; color: #7FE3FF; text-shadow: 0 0 12px #00BFFF, 2px 2px 0 #000">Same games.<br>New adventures.</div>
    </div>

    <div style="position: absolute; right: 0; top: 0; width: 252px; height: 210px; background: #080D1F; clip-path: polygon(34px 0, 252px 0, 252px 210px, 34px 210px, 0 176px, 0 0); border-left: 2px solid #FF168C; box-sizing: border-box; padding: 24px 24px 0 46px; display: flex; flex-direction: column; gap: 8px">
      <div style="display: flex; align-items: center; justify-content: space-between">
        <span data-ref="hora" style="font-family: 'Pixelify Sans', monospace; font-weight: 600; font-size: 46px"></span>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#F5F7FF" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M2 8.5a15 15 0 0 1 20 0M5 12a10.5 10.5 0 0 1 14 0M8.5 15.5a5.5 5.5 0 0 1 7 0"></path><circle cx="12" cy="19" r="1.3" fill="#F5F7FF"></circle></svg>
      </div>
      <span data-ref="fecha" style="font-family: 'Pixelify Sans', monospace; font-weight: 500; font-size: 22px; color: #D6DCF0"></span>
      <div style="display: flex; align-items: center; gap: 12px; margin-top: 18px">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#8FA8E8" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="2" y="7.5" width="20" height="9.5" rx="4.75"></rect><path d="M7 10v5M4.5 12.5h5"></path><circle cx="16" cy="11" r="1"></circle><circle cx="18.5" cy="13.5" r="1"></circle></svg>
        <div style="display: flex; flex-direction: column; font-family: 'Share Tech Mono', monospace; font-size: 16px; line-height: 1.25; color: #8FA8E8"><span>NEO ARCADE V1</span><span>LINUX 6.1</span></div>
      </div>
    </div>
  </header>`);

  return {
    actualizar({ reloj }) {
      refs.hora.textContent = reloj.hora;
      refs.fecha.textContent = reloj.fecha;
    },
  };
}
