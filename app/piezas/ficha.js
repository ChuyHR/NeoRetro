// Ficha del juego seleccionado y las dos líneas que la separan del menú y de la vista previa.
// La descripción va a 24 px (ajuste aprobado; el prototipo usaba 20) y se corta en tres líneas para
// no invadir el pie. Desde la fase 5 muestra la carátula del juego en lugar del ícono del mando.
import { ponerCaratula } from '../caratulas.js';
import { montar } from './dom.js';

// Desarrollador • año • género, con lo que haya; sin ningún dato, el nombre del sistema.
export function lineaDatos(juego) {
  return [juego.desarrollador, juego.anio, juego.genero].filter(Boolean).join(' • ') || juego.nombreSistema;
}

export function crearFicha(lienzo) {
  const refs = montar(lienzo, `
  <section aria-label="Juego seleccionado" style="position: absolute; left: 58px; top: 798px; width: 690px; height: 190px; display: flex; flex-direction: column; gap: 10px">
    <div style="display: flex; align-items: flex-start; gap: 28px">
      <span data-ref="icono" style="position: relative; display: block; width: 72px; height: 72px; flex-shrink: 0; margin-top: -2px"><svg data-ref="mando" width="72" height="72" viewBox="0 0 24 24" aria-hidden="true" style="display: block"><rect x="1.5" y="7" width="21" height="11" rx="5.5" fill="#4A5A8F"></rect><path d="M6.5 10v5.5M3.8 12.7h5.4" stroke="#0A1020" stroke-width="2"></path><circle cx="16" cy="11" r="1.3" fill="#0A1020"></circle><circle cx="18.6" cy="13.6" r="1.3" fill="#0A1020"></circle></svg></span>
      <div style="display: flex; flex-direction: column; gap: 8px">
        <span data-ref="titulo" style="font-family: 'Pixelify Sans', monospace; font-weight: 700; font-size: 40px; letter-spacing: 2px; line-height: 1"></span>
        <span data-ref="meta" style="font-family: 'Pixelify Sans', monospace; font-weight: 500; font-size: 22px; letter-spacing: 1px; color: #8FA8E8"></span>
      </div>
    </div>
    <p data-ref="descripcion" style="margin: 6px 0 0; max-width: 620px; font-family: 'Share Tech Mono', monospace; font-size: 24px; line-height: 1.3; color: #D6DCF0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden"></p>
  </section>
  <div aria-hidden="true" style="position: absolute; left: 746px; top: 800px; width: 2px; height: 182px; background: #1A2648"></div>
  <div aria-hidden="true" style="position: absolute; left: 1120px; top: 800px; width: 2px; height: 182px; background: #1A2648"></div>`);

  return {
    actualizar({ juego }) {
      // La carátula ocupa el lugar del ícono del mando; sin ella, o si no carga, vuelve el ícono.
      const conCaratula = ponerCaratula(refs.icono, juego, () => { refs.mando.style.display = 'block'; });
      refs.mando.style.display = conCaratula ? 'none' : 'block';
      refs.titulo.textContent = juego ? juego.titulo.toUpperCase() : '';
      refs.meta.textContent = juego ? lineaDatos(juego) : '';
      refs.descripcion.textContent = juego ? juego.descripcion : '';
    },
  };
}
