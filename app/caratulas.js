// Carátulas reales en el carrusel, la ficha y Detalles. Nunca queda una imagen rota: si una no carga,
// se recuerda y desde ahí ese juego usa la portada de reemplazo del prototipo.
const rotas = new Set();
const precargadas = new Set();
const MAX_PRECARGADAS = 300; // las de los vecinos del carrusel; el navegador guarda las imágenes

export const tieneCaratula = (juego) => Boolean(juego?.caratula) && !rotas.has(juego.caratula);

// Pone la carátula del juego dentro del contenedor (que debe tener position: relative), completa y sin
// recorte (ajuste aprobado). Devuelve si la puso; si después falla al cargar, la quita y llama a alFallar.
export function ponerCaratula(contenedor, juego, alFallar) {
  let imagen = contenedor.querySelector(':scope > img[data-caratula]');
  if (!tieneCaratula(juego)) {
    imagen?.remove();
    return false;
  }
  if (!imagen) {
    imagen = document.createElement('img');
    imagen.dataset.caratula = '';
    imagen.alt = '';
    imagen.decoding = 'async';
    imagen.setAttribute('style', 'position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain');
    contenedor.prepend(imagen);
  }
  if (imagen.getAttribute('src') !== juego.caratula) {
    imagen.onerror = () => {
      rotas.add(juego.caratula);
      imagen.remove();
      alFallar();
    };
    imagen.src = juego.caratula;
  }
  return true;
}

// Pide por adelantado las carátulas que están por entrar al carrusel, para que no aparezcan tarde.
export function precargar(juegos) {
  for (const juego of juegos) {
    if (!tieneCaratula(juego) || precargadas.has(juego.caratula)) continue;
    if (precargadas.size >= MAX_PRECARGADAS) precargadas.clear();
    precargadas.add(juego.caratula);
    const imagen = new Image();
    imagen.decoding = 'async';
    imagen.onerror = () => rotas.add(juego.caratula);
    imagen.src = juego.caratula;
  }
}
