// El diseño es un lienzo fijo de 1920×1080. Se escala para caber completo en cualquier pantalla, sin
// deformarse y centrado; el margen que sobra en pantallas que no son 16:9 queda con el fondo.

export const ANCHO = 1920;
export const ALTO = 1080;

export function calcularEscala(anchoPantalla, altoPantalla) {
  const escala = Math.min(anchoPantalla / ANCHO, altoPantalla / ALTO);
  return {
    escala,
    x: (anchoPantalla - ANCHO * escala) / 2,
    y: (altoPantalla - ALTO * escala) / 2,
  };
}

export function ajustarLienzo(lienzo, ventana = window) {
  const aplicar = () => {
    const { escala, x, y } = calcularEscala(ventana.innerWidth, ventana.innerHeight);
    lienzo.style.transform = `translate(${x}px, ${y}px) scale(${escala})`;
  };
  aplicar();
  ventana.addEventListener('resize', aplicar);
}
