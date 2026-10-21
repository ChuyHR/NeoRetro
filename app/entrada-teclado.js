// Traduce teclas en acciones. La interfaz solo entiende acciones; el mando las produce desde el núcleo
// (core/entrada/). Esc no aparece porque en desarrollo cierra la app (core/main.js).

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
  Home: 'letra-anterior', // como LT y RT del mando
  End: 'letra-siguiente',
};

export function escucharTeclado(destino, despachar) {
  destino.addEventListener('keydown', (evento) => {
    const accion = TECLAS[evento.code] ?? TECLAS[evento.key];
    if (!accion) return;
    evento.preventDefault();
    despachar(accion);
  });
}
