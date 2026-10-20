// Ventana de configuración. Por ahora solo el efecto CRT, como el prototipo; la fase 6 agrega el resto.
// El borde azul marca la opción elegida y el brillo marca el foco.
import { BOTONES } from '../estado.js';
import { montar } from './dom.js';
import { marcarFoco } from './foco.js';

const BOTON_OPCION = "height: 48px; padding: 0 22px; border-radius: 10px; border: 3px solid #2A3B70; background: #0E1730; color: #F5F7FF; font-family: 'Pixelify Sans', monospace; font-size: 20px";

export function crearConfiguracion(lienzo, { despachar }) {
  const refs = montar(lienzo, `
  <div data-ref="capa" style="position: absolute; inset: 0; z-index: 100; background: rgba(2,4,10,0.82); display: none; align-items: center; justify-content: center">
    <div role="dialog" aria-label="Configuración" style="width: 720px; padding: 40px; border-radius: 22px; background: #0A1020; border: 2px solid #1E90FF; box-shadow: 0 0 50px #1769FF55; display: flex; flex-direction: column; gap: 24px; font-family: 'Pixelify Sans', monospace">
      <span style="font-weight: 700; font-size: 38px">CONFIGURACIÓN</span>
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 24px">
        <span>Efecto CRT</span>
        <div style="display: flex; gap: 10px">
          <button data-ref="activado" style="${BOTON_OPCION}">ACTIVADO</button>
          <button data-ref="desactivado" style="${BOTON_OPCION}">DESACTIVADO</button>
        </div>
      </div>
      <button data-ref="cerrar" style="align-self: flex-start; height: 52px; padding: 0 26px; border-radius: 10px; border: 3px solid #1E90FF; background: #0B2350; color: #F5F7FF; font-family: 'Pixelify Sans', monospace; font-weight: 700; font-size: 22px">VOLVER AL INICIO</button>
    </div>
  </div>`);
  refs.activado.addEventListener('click', () => despachar({ tipo: 'boton', valor: 'crt-activado' }));
  refs.desactivado.addEventListener('click', () => despachar({ tipo: 'boton', valor: 'crt-desactivado' }));
  refs.cerrar.addEventListener('click', () => despachar({ tipo: 'boton', valor: 'cerrar' }));

  return {
    actualizar({ estado }) {
      const visible = estado.ventana === 'configuracion';
      refs.capa.style.display = visible ? 'flex' : 'none';
      if (!visible) return;
      refs.activado.style.borderColor = estado.crt ? '#1E90FF' : '#2A3B70';
      refs.desactivado.style.borderColor = estado.crt ? '#2A3B70' : '#1E90FF';
      const enfocado = BOTONES.configuracion[estado.foco];
      marcarFoco(refs.activado, enfocado === 'crt-activado');
      marcarFoco(refs.desactivado, enfocado === 'crt-desactivado');
      marcarFoco(refs.cerrar, enfocado === 'cerrar');
    },
  };
}
