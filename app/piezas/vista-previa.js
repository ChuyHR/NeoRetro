// Vista previa: la captura del juego en cuanto se elige y su vídeo en bucle y sin sonido cuando lleva
// un segundo elegido, completos dentro del recuadro (sin recorte; un vídeo 4:3 queda con franjas a los
// lados). Sin medios, la escena de pelea del prototipo dibujada con los colores del juego. El efecto CRT
// va encima de todo.
import { montar } from './dom.js';

export const ESPERA_VIDEO_MS = 1000;
const fallidos = new Set(); // capturas y vídeos que no cargaron: no se vuelven a intentar

export function crearVistaPrevia(lienzo) {
  const refs = montar(lienzo, `
  <section aria-label="Vista previa" style="position: absolute; left: 1146px; top: 790px; width: 514px; height: 202px; box-sizing: border-box; padding: 10px; border-radius: 18px; background: #0A1330; border: 2px solid #23346A; box-shadow: 0 0 24px #1769FF44">
    <div data-ref="cielo" style="position: relative; width: 100%; height: 100%; border-radius: 8px; overflow: hidden">
      <div aria-hidden="true" style="position: absolute; left: 0; right: 0; bottom: 34px; height: 70px; display: flex; align-items: flex-end; gap: 6px; padding: 0 12px">
        <div style="width: 60px; height: 40px; background: #0E0A20"></div>
        <div style="width: 110px; height: 66px; background: #0E0A20; clip-path: polygon(0 30%, 50% 0, 100% 30%, 100% 100%, 0 100%)"></div>
        <div style="width: 70px; height: 52px; background: #0E0A20"></div>
        <div style="flex: 1"></div>
        <div style="width: 90px; height: 58px; background: #0E0A20"></div>
      </div>
      <div aria-hidden="true" style="position: absolute; left: 0; right: 0; bottom: 0; height: 36px; background: repeating-linear-gradient(90deg, #3A2A1A 0 38px, #4A3620 38px 40px)"></div>
      <div aria-hidden="true" style="position: absolute; left: 130px; bottom: 30px; width: 22px; height: 54px; background: #F5F7FF"></div>
      <div aria-hidden="true" style="position: absolute; left: 126px; bottom: 80px; width: 30px; height: 18px; background: #F5F7FF"></div>
      <div data-ref="rivalCuerpo" aria-hidden="true" style="position: absolute; right: 150px; bottom: 30px; width: 22px; height: 54px"></div>
      <div data-ref="rivalCabeza" aria-hidden="true" style="position: absolute; right: 146px; bottom: 80px; width: 30px; height: 18px"></div>
      <div style="position: absolute; left: 8px; right: 8px; top: 6px; display: flex; justify-content: space-between; font-family: 'Press Start 2P', monospace; font-size: 11px; color: #FFFFFF; text-shadow: 2px 2px 0 #000">
        <span>1P <span data-ref="puntos" style="color: #FFD23F"></span></span>
        <span>HI <span data-ref="record" style="color: #FFD23F"></span></span>
        <span>2P <span style="color: #FFD23F">000000</span></span>
      </div>
      <div aria-hidden="true" style="position: absolute; left: 8px; right: 8px; top: 24px; display: flex; align-items: center; gap: 10px">
        <div style="flex: 1; height: 10px; background: #FFD23F; border: 2px solid #000"></div>
        <span style="font-family: 'Press Start 2P', monospace; font-size: 12px; color: #FFFFFF; text-shadow: 2px 2px 0 #000">99</span>
        <div style="flex: 1; height: 10px; background: #FFD23F; border: 2px solid #000"></div>
      </div>
      <div data-ref="medios" aria-hidden="true" style="position: absolute; inset: 0; background: #000000; display: none">
        <img data-ref="captura" alt="" decoding="async" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; display: none">
        <video data-ref="video" muted loop playsinline preload="none" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; display: none"></video>
      </div>
      <div data-ref="crt" aria-hidden="true" style="position: absolute; inset: 0; background: repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.22) 2px, rgba(0,0,0,0.22) 3px); pointer-events: none"></div>
    </div>
  </section>`);

  let actual = null; // id del juego que se está mostrando
  let juegoActual = null;
  let enPausa = false; // con un emulador abierto el vídeo no corre
  let temporizador = null;
  const { medios, captura, video } = refs;

  function detenerVideo() {
    clearTimeout(temporizador);
    video.style.display = 'none';
    if (video.getAttribute('src')) {
      video.pause();
      video.removeAttribute('src');
      video.load(); // suelta el decodificador
    }
  }

  function programarVideo(juego) {
    if (!juego?.video || fallidos.has(juego.video)) return;
    temporizador = setTimeout(() => {
      if (actual !== juego.id || enPausa) return;
      video.src = juego.video;
      video.play().catch(() => {});
    }, ESPERA_VIDEO_MS);
  }

  function mostrarMedios(juego) {
    const conCaptura = Boolean(juego?.captura) && !fallidos.has(juego.captura);
    const conVideo = Boolean(juego?.video) && !fallidos.has(juego.video);
    medios.style.display = conCaptura || conVideo ? 'block' : 'none';
    captura.style.display = conCaptura ? 'block' : 'none';
    if (conCaptura) captura.src = juego.captura;
    else captura.removeAttribute('src');
  }

  // Si algo no carga se olvida y se vuelve a lo que quede: la captura, o la escena del prototipo.
  captura.addEventListener('error', () => {
    if (!captura.getAttribute('src')) return;
    fallidos.add(captura.getAttribute('src'));
    captura.style.display = 'none';
    const quedaVideo = Boolean(juegoActual?.video) && !fallidos.has(juegoActual.video);
    if (!quedaVideo) medios.style.display = 'none';
  });
  video.addEventListener('playing', () => { video.style.display = 'block'; });
  video.addEventListener('error', () => {
    if (!video.getAttribute('src')) return;
    fallidos.add(video.getAttribute('src'));
    detenerVideo();
    if (captura.style.display === 'none') medios.style.display = 'none';
  });

  return {
    actualizar({ juego, marcador, estado }) {
      refs.crt.style.display = estado.ajustes.crt ? '' : 'none';
      const pausar = estado.ventana === 'lanzamiento';
      const id = juego?.id ?? null;
      if (id !== actual) {
        detenerVideo();
        actual = id;
        juegoActual = juego;
        mostrarMedios(juego);
        if (!pausar) programarVideo(juego);
      }
      if (pausar && !enPausa) detenerVideo();
      if (!pausar && enPausa) programarVideo(juego);
      enPausa = pausar;
      if (!juego) return;
      const [principal, secundario, fondo] = juego.colores;
      refs.cielo.style.background = `linear-gradient(180deg, ${fondo} 0%, ${principal} 100%)`;
      refs.rivalCuerpo.style.background = secundario;
      refs.rivalCabeza.style.background = secundario;
      refs.puntos.textContent = marcador.puntos;
      refs.record.textContent = marcador.record;
    },
  };
}
