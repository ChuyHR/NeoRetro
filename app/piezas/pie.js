// Pie de controles. Muestra las teclas o los botones de la entrada en uso (ajuste aprobado): con el
// mando, la leyenda del prototipo tal cual (A, B y MENÚ); con el teclado, sus teclas.
import { montar } from './dom.js';

const CRUCETA = '<svg width="46" height="46" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill="#5A6A96"></path></svg>';
const tecla = (texto) => `<span style="height: 38px; padding: 0 10px; border-radius: 8px; border: 3px solid #8FA8E8; box-sizing: border-box; display: flex; align-items: center; justify-content: center; color: #F5F7FF; font-size: 18px">${texto}</span>`;
const boton = (contenido) => `<span style="width: 38px; height: 38px; border-radius: 50%; border: 3px solid #8FA8E8; display: flex; align-items: center; justify-content: center; color: #F5F7FF">${contenido}</span>`;
const MENU = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="#F5F7FF" stroke-width="3" stroke-linecap="round"></path></svg>';

const LEYENDAS = {
  teclado: [
    { indicador: CRUCETA, separacion: 22, texto: 'NAVEGAR' },
    { indicador: tecla('ENTER'), separacion: 18, texto: 'SELECCIONAR' },
    { indicador: tecla('RETROCESO'), separacion: 18, texto: 'VOLVER' },
    { indicador: `<span style="display: flex; gap: 8px">${tecla('RE PÁG')}${tecla('AV PÁG')}</span>`, separacion: 18, texto: 'SISTEMA' },
  ],
  mando: [
    { indicador: CRUCETA, separacion: 22, texto: 'NAVEGAR' },
    { indicador: boton('A'), separacion: 18, texto: 'SELECCIONAR' },
    { indicador: boton('B'), separacion: 18, texto: 'VOLVER' },
    { indicador: boton(MENU), separacion: 18, texto: 'MENÚ' },
  ],
};

const leyenda = (entrada) => LEYENDAS[entrada]
  .map(({ indicador, separacion, texto }) => `<span style="display: flex; align-items: center; gap: ${separacion}px">${indicador}${texto}</span>`)
  .join('');

const LINEAS = '<div aria-hidden="true" style="display: flex; flex-direction: column; gap: 4px; width: 116px"><div style="height: 3px; background: #FF168C"></div><div style="height: 3px; background: #8B5CF6"></div><div style="height: 3px; background: #1769FF"></div><div style="height: 3px; background: #FFB020"></div></div>';

export function crearPie(lienzo) {
  const { controles } = montar(lienzo, `
  <footer style="position: absolute; left: 0; top: 1002px; width: 1920px; height: 2px; background: #1A2648"></footer>
  <div data-ref="controles" style="position: absolute; left: 46px; top: 1016px; display: flex; align-items: center; gap: 46px; font-family: 'Pixelify Sans', monospace; font-weight: 600; font-size: 23px; letter-spacing: 1px; color: #C9D2E8"></div>
  <div style="position: absolute; right: 30px; top: 1018px; display: flex; align-items: center; gap: 20px">
    ${LINEAS}
    <div style="font-family: 'Pixelify Sans', monospace; font-weight: 500; font-size: 20px; line-height: 1.2; letter-spacing: 1.5px; color: #8FA8E8; text-align: center">RETRO IS NOT A STYLE<br>IT’S A LIFESTYLE</div>
    ${LINEAS}
  </div>`);
  let pintada = null;

  return {
    actualizar({ estado }) {
      if (estado.entrada === pintada) return;
      controles.innerHTML = leyenda(estado.entrada);
      pintada = estado.entrada;
    },
  };
}
