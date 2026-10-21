// «Buscar»: un teclado en pantalla para el mando (cruceta para moverse, A para pulsar la tecla, B borra)
// y escritura directa con el teclado físico (Enter busca, Retroceso borra). Muestra cuántos juegos
// coinciden mientras se escribe. Al buscar, el resultado aparece al final de la barra de sistemas.
import { BOTONES, FILAS_TECLADO } from '../estado.js';
import { montar } from './dom.js';
import { marcarFocoAlterno } from './foco.js';

const TECLA = "height: 60px; border-radius: 10px; border: 2px solid #2A3B70; background: #0E1730; color: #F5F7FF; font-family: 'Pixelify Sans', monospace; font-weight: 600; font-size: 26px; padding: 0";

export function crearBuscar(lienzo, { despachar }) {
  const refs = montar(lienzo, `
  <div data-ref="capa" style="position: absolute; inset: 0; z-index: 100; background: rgba(2,4,10,0.82); display: none; align-items: center; justify-content: center">
    <div role="dialog" aria-label="Buscar" style="width: 960px; box-sizing: border-box; padding: 40px; border-radius: 22px; background: #0A1020; border: 2px solid var(--acento); box-shadow: 0 0 50px #1769FF55; display: flex; flex-direction: column; gap: 20px; font-family: 'Pixelify Sans', monospace">
      <span style="font-weight: 700; font-size: 38px">BUSCAR</span>
      <div style="height: 64px; box-sizing: border-box; padding: 0 20px; border-radius: 10px; border: 3px solid var(--acento); background: #050914; display: flex; align-items: center; font-size: 32px; letter-spacing: 2px">
        <span data-ref="texto"></span><span class="blink" style="color: var(--acento)">_</span>
      </div>
      <span data-ref="resultados" style="font-family: 'Share Tech Mono', monospace; font-size: 24px; color: #8FA8E8"></span>
      <div data-ref="teclado" style="display: flex; flex-direction: column; gap: 10px"></div>
      <span data-ref="ayuda" style="font-family: 'Share Tech Mono', monospace; font-size: 24px; color: #8997B8"></span>
    </div>
  </div>`);
  const teclas = new Map();
  for (const fila of FILAS_TECLADO) {
    const renglon = document.createElement('div');
    renglon.setAttribute('style', `display: grid; grid-template-columns: repeat(${fila.length}, 1fr); gap: 10px`);
    for (const tecla of fila) {
      const boton = document.createElement('button');
      boton.setAttribute('style', TECLA);
      boton.textContent = tecla;
      boton.addEventListener('click', () => despachar({ tipo: 'boton', valor: tecla }));
      renglon.append(boton);
      teclas.set(tecla, boton);
    }
    refs.teclado.append(renglon);
  }

  return {
    actualizar({ estado, resultados }) {
      const visible = estado.ventana === 'buscar';
      refs.capa.style.display = visible ? 'flex' : 'none';
      if (!visible) return;
      refs.texto.textContent = estado.escribiendo;
      refs.resultados.textContent = resultados === null
        ? 'Escribe parte del nombre de un juego.'
        : `${resultados} ${resultados === 1 ? 'juego coincide' : 'juegos coinciden'}`;
      refs.ayuda.textContent = estado.entrada === 'mando'
        ? 'A pulsa la tecla marcada. B borra; sin nada escrito, vuelve.'
        : 'Escribe con el teclado. Enter busca; Retroceso borra y, sin nada escrito, vuelve.';
      const enfocada = BOTONES.buscar[estado.foco];
      for (const [tecla, boton] of teclas) marcarFocoAlterno(boton, tecla === enfocada);
    },
  };
}
