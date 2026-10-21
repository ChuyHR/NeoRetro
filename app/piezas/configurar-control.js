// «Configurar control»: pide uno por uno los controles que usa Neo Arcade y guarda qué botón o eje del
// mando es cada uno. Se abre sola con un mando que no sigue la norma de Linux para mandos (palancas y
// tableros de arcade) y también desde Configuración, para rehacer el mapeo de cualquiera.
import { mapeoTerminado, PASOS_MAPEO } from '../mapeo.js';
import { montar } from './dom.js';
import { marcarFoco } from './foco.js';

export const ESPERA_OMITIR_MS = 6000; // un paso opcional se salta solo si no llega nada en este tiempo

export function crearConfigurarControl(lienzo, { despachar }) {
  const refs = montar(lienzo, `
  <div data-ref="capa" style="position: absolute; inset: 0; z-index: 110; background: rgba(2,4,10,0.82); display: none; align-items: center; justify-content: center">
    <div role="dialog" aria-label="Configurar control" style="width: 900px; padding: 40px; border-radius: 22px; background: #0A1020; border: 2px solid #1E90FF; box-shadow: 0 0 50px #1769FF55; display: flex; flex-direction: column; gap: 22px; font-family: 'Pixelify Sans', monospace">
      <span style="font-weight: 700; font-size: 38px">CONFIGURAR CONTROL</span>
      <span data-ref="nombre" style="font-family: 'Share Tech Mono', monospace; font-size: 24px; color: #8FA8E8"></span>
      <span data-ref="paso" style="font-family: 'Share Tech Mono', monospace; font-size: 24px; color: #8997B8"></span>
      <span data-ref="pedido" style="font-family: 'Bungee', sans-serif; font-size: 52px; color: #FFFFFF; text-shadow: 0 0 24px #1E90FF"></span>
      <span data-ref="ayuda" style="font-family: 'Share Tech Mono', monospace; font-size: 24px; line-height: 1.3; color: #D6DCF0"></span>
      <button data-ref="cerrar" style="align-self: flex-start; height: 52px; padding: 0 26px; border-radius: 10px; border: 3px solid #1E90FF; background: #0B2350; color: #F5F7FF; font-family: 'Pixelify Sans', monospace; font-weight: 700; font-size: 22px">VOLVER AL INICIO</button>
    </div>
  </div>`);
  refs.cerrar.addEventListener('click', () => despachar({ tipo: 'boton', valor: 'cerrar' }));
  marcarFoco(refs.cerrar, true);

  return {
    actualizar({ estado }) {
      const visible = estado.ventana === 'configurar-control';
      refs.capa.style.display = visible ? 'flex' : 'none';
      if (!visible) return;
      const { mapeo } = estado;
      if (!mapeo) {
        refs.nombre.textContent = '';
        refs.paso.textContent = '';
        refs.pedido.textContent = 'CONECTA UN CONTROL';
        refs.ayuda.textContent = 'No hay ningún control conectado. Conéctalo por USB o Bluetooth y vuelve a abrir esta pantalla.';
        return;
      }
      refs.nombre.textContent = mapeo.nombre;
      if (mapeoTerminado(mapeo)) {
        refs.paso.textContent = '';
        refs.pedido.textContent = 'LISTO';
        refs.ayuda.textContent = 'Tu control ya funciona en Neo Arcade y dentro de los juegos.';
        return;
      }
      const [, etiqueta, opcional] = PASOS_MAPEO[mapeo.paso];
      refs.paso.textContent = `Paso ${mapeo.paso + 1} de ${PASOS_MAPEO.length}`;
      refs.pedido.textContent = `PULSA ${etiqueta}`;
      refs.ayuda.textContent = opcional
        ? `Si tu control no tiene este botón, espera ${ESPERA_OMITIR_MS / 1000} segundos y se salta solo. Con el teclado: Enter salta, Retroceso cancela.`
        : 'Mueve la palanca o la cruceta, o pulsa el botón. Con el teclado: Retroceso cancela.';
    },
  };
}
