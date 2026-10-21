// Ventana de configuración. Del prototipo viene el efecto CRT y su estilo; lo demás (neón, animaciones,
// volumen, color del tema, combinación para salir, el mando y Restablecer) sigue ese mismo estilo. Cada
// fila es un ajuste: el borde del color del tema marca la opción elegida y el brillo marca el foco.
import { SALIDAS, TEMAS } from '../ajustes.js';
import { BOTONES } from '../estado.js';
import { montar } from './dom.js';
import { marcarFoco } from './foco.js';

const BOTON_OPCION = "height: 48px; padding: 0 22px; border-radius: 10px; border: 3px solid #2A3B70; background: #0E1730; color: #F5F7FF; font-family: 'Pixelify Sans', monospace; font-size: 20px; white-space: nowrap";
const FILA = 'display: flex; align-items: center; justify-content: space-between; gap: 24px; font-size: 24px';
const punto = (color) => `<span style="display: inline-block; width: 16px; height: 16px; border-radius: 50%; background: ${color}; margin-right: 10px; vertical-align: -2px"></span>`;
const boton = (valor, texto) => `<button data-boton="${valor}" style="${BOTON_OPCION}">${texto}</button>`;

const NOMBRES_TEMA = { azul: 'AZUL', magenta: 'MAGENTA', violeta: 'VIOLETA', naranja: 'NARANJA' };

export function crearConfiguracion(lienzo, { despachar }) {
  const refs = montar(lienzo, `
  <div data-ref="capa" style="position: absolute; inset: 0; z-index: 100; background: rgba(2,4,10,0.82); display: none; align-items: center; justify-content: center">
    <div role="dialog" aria-label="Configuración" style="width: 1100px; box-sizing: border-box; padding: 40px; border-radius: 22px; background: #0A1020; border: 2px solid var(--acento); box-shadow: 0 0 50px #1769FF55; display: flex; flex-direction: column; gap: 14px; font-family: 'Pixelify Sans', monospace">
      <span style="font-weight: 700; font-size: 38px; margin-bottom: 6px">CONFIGURACIÓN</span>
      <div style="${FILA}"><span>Efecto CRT</span><div style="display: flex; gap: 10px">${boton('crt-activado', 'ACTIVADO')}${boton('crt-desactivado', 'DESACTIVADO')}</div></div>
      <div style="${FILA}"><span>Brillo neón</span><div style="display: flex; gap: 10px">${boton('neon-alto', 'ALTO')}${boton('neon-bajo', 'BAJO')}</div></div>
      <div style="${FILA}"><span>Animaciones</span><div style="display: flex; gap: 10px">${boton('animaciones-si', 'ACTIVADAS')}${boton('animaciones-no', 'DESACTIVADAS')}</div></div>
      <div style="${FILA}"><span>Volumen</span><div style="display: flex; align-items: center; gap: 10px">${boton('volumen-menos', '-')}<span data-ref="volumen" style="min-width: 90px; text-align: center"></span>${boton('volumen-mas', '+')}</div></div>
      <div style="${FILA}"><span>Color del tema</span><div style="display: flex; gap: 10px">${Object.entries(TEMAS).map(([tema, color]) => boton(`tema-${tema}`, `${punto(color)}${NOMBRES_TEMA[tema]}`)).join('')}</div></div>
      <div style="${FILA}"><span>Salir del juego</span><div style="display: flex; gap: 10px">${Object.entries(SALIDAS).map(([salida, texto]) => boton(`salir-${salida}`, texto)).join('')}</div></div>
      <div style="${FILA}"><span>Control</span><div style="display: flex; gap: 10px">${boton('probar-control', 'PROBAR')}${boton('configurar-control', 'CONFIGURAR')}</div></div>
      <span data-ref="mandos" style="margin-top: -6px; font-family: 'Share Tech Mono', monospace; font-size: 24px; color: #8997B8"></span>
      <div style="display: flex; gap: 14px; margin-top: 10px">
        <button data-boton="restablecer" style="height: 52px; padding: 0 26px; border-radius: 10px; border: 2px solid #2A3B70; background: #0E1730; color: #F5F7FF; font-family: 'Pixelify Sans', monospace; font-weight: 600; font-size: 22px"></button>
        <button data-boton="cerrar" style="height: 52px; padding: 0 26px; border-radius: 10px; border: 3px solid var(--acento); background: #0B2350; color: #F5F7FF; font-family: 'Pixelify Sans', monospace; font-weight: 700; font-size: 22px">VOLVER AL INICIO</button>
      </div>
    </div>
  </div>`);
  const botones = new Map([...refs.capa.querySelectorAll('[data-boton]')].map((elemento) => [elemento.dataset.boton, elemento]));
  for (const [valor, elemento] of botones) {
    elemento.addEventListener('click', () => despachar({ tipo: 'boton', valor }));
  }

  // La opción que está en uso en cada fila de ajustes.
  const elegidas = (ajustes) => new Set([
    ajustes.crt ? 'crt-activado' : 'crt-desactivado',
    `neon-${ajustes.neon}`,
    ajustes.animaciones ? 'animaciones-si' : 'animaciones-no',
    `tema-${ajustes.tema}`,
    `salir-${ajustes.salir}`,
  ]);

  return {
    actualizar({ estado }) {
      const visible = estado.ventana === 'configuracion';
      refs.capa.style.display = visible ? 'flex' : 'none';
      if (!visible) return;
      const enUso = elegidas(estado.ajustes);
      for (const [valor, elemento] of botones) {
        if (valor === 'restablecer' || valor === 'cerrar') continue;
        elemento.style.borderColor = enUso.has(valor) ? 'var(--acento)' : '#2A3B70';
      }
      refs.volumen.textContent = `${estado.ajustes.volumen} %`;
      botones.get('restablecer').textContent = estado.confirmar === 'restablecer' ? 'PULSA OTRA VEZ PARA RESTABLECER' : 'RESTABLECER AJUSTES';
      const nombres = estado.mandos.map(({ nombre }) => nombre);
      refs.mandos.textContent = nombres.length ? `Conectado: ${nombres.join(', ')}` : 'No hay ningún control conectado.';
      const enfocado = BOTONES.configuracion[estado.foco];
      for (const [valor, elemento] of botones) marcarFoco(elemento, enfocado === valor);
    },
  };
}
