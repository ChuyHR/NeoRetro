// «Probar control»: enciende cada control mientras se mantiene pulsado y muestra el último código crudo,
// para saber si un botón llega y con qué número. Con el mando se sale manteniendo B dos segundos (B
// solo, se enciende como los demás); con el teclado, con Retroceso.
import { montar } from './dom.js';
import { marcarFoco } from './foco.js';

const CONTROLES = [
  ['arriba', 'ARRIBA'], ['abajo', 'ABAJO'], ['izquierda', 'IZQUIERDA'], ['derecha', 'DERECHA'],
  ['a', 'A'], ['b', 'B'], ['x', 'X'], ['y', 'Y'],
  ['lb', 'LB'], ['rb', 'RB'], ['lt', 'LT'], ['rt', 'RT'],
  ['view', 'VIEW'], ['menu', 'MENÚ'], ['l3', 'L3'], ['r3', 'R3'],
];
const CHIP = "height: 56px; border-radius: 10px; border: 3px solid #2A3B70; background: #0E1730; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #C9D2E8";

export function crearPruebaControl(lienzo, { despachar }) {
  const refs = montar(lienzo, `
  <div data-ref="capa" style="position: absolute; inset: 0; z-index: 110; background: rgba(2,4,10,0.82); display: none; align-items: center; justify-content: center">
    <div role="dialog" aria-label="Probar control" style="width: 900px; padding: 40px; border-radius: 22px; background: #0A1020; border: 2px solid var(--acento); box-shadow: 0 0 50px #1769FF55; display: flex; flex-direction: column; gap: 22px; font-family: 'Pixelify Sans', monospace">
      <span style="font-weight: 700; font-size: 38px">PROBAR CONTROL</span>
      <span data-ref="nombre" style="font-family: 'Share Tech Mono', monospace; font-size: 24px; color: #8FA8E8"></span>
      <div data-ref="rejilla" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px"></div>
      <span data-ref="ultimo" style="font-family: 'Share Tech Mono', monospace; font-size: 24px; color: #D6DCF0"></span>
      <span style="font-family: 'Share Tech Mono', monospace; font-size: 24px; color: #8997B8">Mantén B dos segundos para salir. Con el teclado, Retroceso.</span>
      <button data-ref="cerrar" style="align-self: flex-start; height: 52px; padding: 0 26px; border-radius: 10px; border: 3px solid var(--acento); background: #0B2350; color: #F5F7FF; font-family: 'Pixelify Sans', monospace; font-weight: 700; font-size: 22px">VOLVER AL INICIO</button>
    </div>
  </div>`);
  const chips = new Map(CONTROLES.map(([control, texto]) => {
    const chip = document.createElement('span');
    chip.setAttribute('style', CHIP);
    chip.textContent = texto;
    refs.rejilla.append(chip);
    return [control, chip];
  }));
  refs.cerrar.addEventListener('click', () => despachar({ tipo: 'boton', valor: 'cerrar' }));
  marcarFoco(refs.cerrar, true); // es el único botón

  return {
    actualizar({ estado }) {
      const visible = estado.ventana === 'prueba-control';
      refs.capa.style.display = visible ? 'flex' : 'none';
      if (!visible) return;
      const mando = estado.mandos.find(({ clave }) => clave === estado.ultimoMando) ?? estado.mandos[0];
      refs.nombre.textContent = mando ? mando.nombre : 'No hay ningún control conectado.';
      for (const [control, chip] of chips) {
        const pulsado = estado.prueba.pulsados.includes(control);
        Object.assign(chip.style, {
          borderColor: pulsado ? 'var(--acento)' : '#2A3B70',
          background: pulsado ? '#0B2350' : '#0E1730',
          color: pulsado ? '#FFFFFF' : '#C9D2E8',
          boxShadow: pulsado ? '0 0 22px color-mix(in srgb, var(--acento) 66.67%, transparent)' : 'none',
        });
      }
      refs.ultimo.textContent = estado.prueba.ultimo ? `Último: ${estado.prueba.ultimo}` : 'Pulsa cualquier botón del control.';
    },
  };
}
