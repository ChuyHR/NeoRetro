// Adornos fijos del prototipo: las franjas de los costados y el «INSERT COIN» junto a la vista previa.
import { montar } from './dom.js';

export function crearLaterales(lienzo) {
  montar(lienzo, `
  <div aria-hidden="true" style="position: absolute; left: 0; top: 230px; width: 70px; height: 560px; display: flex; flex-direction: column; gap: 16px; opacity: 0.35">
    <div style="height: 150px; background: #3A1030; border-right: 3px solid #FF168C"></div>
    <div style="height: 120px; background: #10204A; border-right: 3px solid #1769FF"></div>
    <div style="height: 180px; background: #3A2410; border-right: 3px solid #FFB020"></div>
  </div>
  <div aria-hidden="true" style="position: absolute; right: 0; top: 230px; width: 60px; height: 560px; display: flex; flex-direction: column; gap: 16px; opacity: 0.35">
    <div style="height: 130px; background: #3A1030; border-left: 3px solid #FF168C"></div>
    <div style="height: 200px; background: #10204A; border-left: 3px solid #00BFFF"></div>
    <div style="height: 140px; background: #2A1040; border-left: 3px solid #8B5CF6"></div>
  </div>`);
  return {};
}

export function crearMoneda(lienzo) {
  montar(lienzo, `
  <div aria-hidden="true" style="position: absolute; left: 1700px; top: 784px; width: 200px; height: 210px">
    <div style="position: absolute; left: 10px; top: 4px; transform: rotate(-12deg); font-family: 'Kaushan Script', cursive; font-size: 44px; line-height: 0.9; color: #FF168C; text-shadow: 0 0 14px #FF168C; text-align: center">INSERT<br>COIN</div>
    <svg width="26" height="22" viewBox="0 0 24 22" style="position: absolute; left: 80px; top: 104px"><path d="M12 21 2.5 11.5a5.5 5.5 0 0 1 9.5-6 5.5 5.5 0 0 1 9.5 6z" fill="none" stroke="#FF168C" stroke-width="2.6"></path></svg>
    <svg width="92" height="130" viewBox="0 0 46 65" style="position: absolute; left: 100px; top: 74px; filter: drop-shadow(0 0 6px #00BFFF)"><path d="M10 2h22l6 8v53H8V20l-4-4V8z" fill="none" stroke="#00BFFF" stroke-width="2.2" stroke-linejoin="round"></path><rect x="12" y="12" width="20" height="16" fill="none" stroke="#00BFFF" stroke-width="2"></rect><path d="M8 34h30M14 40h6M26 40h4M12 50h22" stroke="#00BFFF" stroke-width="2"></path></svg>
  </div>`);
  return {};
}
