// Traduce teclas en acciones. La interfaz solo entiende acciones; cuando se retome la fase 4, el mando
// las producirá desde el núcleo. Esc no aparece porque en desarrollo cierra la app (core/main.js).

export const TECLAS = {
  ArrowLeft: 'izquierda',
  ArrowRight: 'derecha',
  ArrowUp: 'arriba',
  ArrowDown: 'abajo',
  Enter: 'aceptar',
  NumpadEnter: 'aceptar',
  Backspace: 'volver',
  PageUp: 'sistema-anterior',
  PageDown: 'sistema-siguiente',
};

export function escucharTeclado(destino, despachar) {
  destino.addEventListener('keydown', (evento) => {
    const accion = TECLAS[evento.code] ?? TECLAS[evento.key];
    if (!accion) return;
    evento.preventDefault();
    despachar(accion);
  });
}
