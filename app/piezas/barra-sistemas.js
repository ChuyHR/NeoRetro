// Barra de sistemas: muestra hasta 12 y se desplaza para que el activo quede a la vista.
import { ICONOS_SISTEMA } from '../iconos.js';
import { montar } from './dom.js';

const ESTILO_BOTON = "display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border-radius: 14px; border: 4px solid transparent; font-family: 'Pixelify Sans', monospace; font-weight: 600; font-size: 21px; letter-spacing: 0.5px; padding: 0";
const ACTIVO = { borde: 'var(--acento)', fondo: '#0B1A3A', brillo: '0 0 22px color-mix(in srgb, var(--acento) 66.67%, transparent), inset 0 0 16px color-mix(in srgb, var(--acento) 20%, transparent)', color: '#FFFFFF' };
const INACTIVO = { borde: 'transparent', fondo: 'transparent', brillo: 'none', color: '#C9D2E8' };

export function crearBarraSistemas(lienzo, { despachar }) {
  const { barra } = montar(lienzo, `
  <nav data-ref="barra" aria-label="Sistemas" style="position: absolute; left: 30px; top: 238px; width: 1860px; height: 128px; box-sizing: border-box; padding: 10px; border-radius: 16px; background: #0A1020; border: 2px solid #1A2648; box-shadow: 0 10px 30px #0008; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 0"></nav>`);
  const botones = new Map();
  let ventanaPintada = '';

  function pintarVentana(sistemas, inicio, fin) {
    barra.replaceChildren();
    botones.clear();
    for (const sistema of sistemas.slice(inicio, fin)) {
      const boton = document.createElement('button');
      boton.setAttribute('style', ESTILO_BOTON);
      boton.innerHTML = `${ICONOS_SISTEMA[sistema.id] ?? ''}<span></span>`;
      boton.lastElementChild.textContent = sistema.nombre;
      boton.addEventListener('click', () => despachar({ tipo: 'elegir-sistema', valor: sistema.id }));
      barra.append(boton);
      botones.set(sistema.id, boton);
    }
  }

  return {
    actualizar({ sistemas, ventanaSistemas: { inicio, fin }, estado }) {
      // Se vuelve a dibujar al desplazarse y también cuando aparece un filtro o cambia la búsqueda.
      const clave = sistemas.slice(inicio, fin).map(({ id, nombre }) => `${id}:${nombre}`).join('|');
      if (clave !== ventanaPintada) {
        pintarVentana(sistemas, inicio, fin);
        ventanaPintada = clave;
      }
      for (const [id, boton] of botones) {
        const activo = id === estado.sistema;
        const tono = activo ? ACTIVO : INACTIVO;
        boton.setAttribute('aria-pressed', String(activo));
        Object.assign(boton.style, {
          borderColor: tono.borde,
          background: tono.fondo,
          boxShadow: tono.brillo,
          color: tono.color,
        });
      }
    },
  };
}
