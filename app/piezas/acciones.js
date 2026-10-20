// Menú de acciones del juego: Jugar, Favoritos, Detalles y Configuración. Se recorre con arriba y abajo.
import { ICONOS_ACCION } from '../iconos.js';
import { montar } from './dom.js';

const ETIQUETAS = { jugar: 'JUGAR', favorito: 'FAVORITOS', detalles: 'DETALLES', configuracion: 'CONFIGURACIÓN' };
const ESTILO_BOTON = "height: 42px; display: flex; align-items: center; gap: 18px; padding: 0 14px; border-radius: 10px; border: 3px solid transparent; color: #F5F7FF; font-family: 'Pixelify Sans', monospace; font-weight: 600; font-size: 23px; letter-spacing: 1px; text-align: left";
const ESTRELLA = { si: '#FFD23F', no: '#A9B3CC' };

export function crearAcciones(lienzo, { despachar, menu }) {
  const { lista } = montar(lienzo, `
  <div data-ref="lista" role="menu" aria-label="Acciones" style="position: absolute; left: 774px; top: 808px; width: 320px; display: flex; flex-direction: column; gap: 6px"></div>`);

  const botones = menu.map((nombre) => {
    const boton = document.createElement('button');
    boton.setAttribute('role', 'menuitem');
    boton.setAttribute('style', ESTILO_BOTON);
    boton.innerHTML = `${ICONOS_ACCION[nombre](ESTRELLA.no)}<span></span>`;
    boton.lastElementChild.textContent = ETIQUETAS[nombre];
    boton.addEventListener('click', () => despachar({ tipo: 'ejecutar', valor: nombre }));
    lista.append(boton);
    return boton;
  });
  const estrella = botones[menu.indexOf('favorito')].querySelector('path');

  return {
    actualizar({ estado, esFavorito }) {
      botones.forEach((boton, indice) => {
        const activo = indice === estado.accion;
        Object.assign(boton.style, {
          borderColor: activo ? '#1E90FF' : 'transparent',
          background: activo ? '#0B1A3A' : 'transparent',
          boxShadow: activo ? '0 0 16px #1E90FF88' : 'none',
        });
      });
      estrella.setAttribute('fill', esFavorito ? ESTRELLA.si : ESTRELLA.no);
    },
  };
}
