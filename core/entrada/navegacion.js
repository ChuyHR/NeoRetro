// Convierte controles pulsados y soltados en las acciones de la interfaz, las mismas que produce el
// teclado. Al mantener una dirección la repite: la primera vez tras esperaMs y luego cada cadaMs.
// El reloj se puede cambiar para probarla sin esperar de verdad.

const DIRECCIONES = new Set(['arriba', 'abajo', 'izquierda', 'derecha']);

export function crearNavegacion({ acciones, repeticion, emitir, reloj = globalThis }) {
  const sostenidos = new Map(); // control → temporizador de su repetición

  function repetir(control, accion, demora) {
    sostenidos.set(control, reloj.setTimeout(() => {
      emitir(accion);
      repetir(control, accion, repeticion.cadaMs);
    }, demora));
  }

  return {
    cambiar({ control, pulsado }) {
      const accion = acciones[control];
      if (!accion) return;
      if (!pulsado) {
        if (sostenidos.has(control)) reloj.clearTimeout(sostenidos.get(control));
        sostenidos.delete(control);
        return;
      }
      if (sostenidos.has(control)) return; // la cruceta y la palanca a la vez cuentan como una
      emitir(accion);
      if (DIRECCIONES.has(accion)) repetir(control, accion, repeticion.esperaMs);
      else sostenidos.set(control, null);
    },
    // Al abrir un emulador o desconectar el mando no debe quedar nada repitiéndose.
    soltarTodo() {
      for (const temporizador of sostenidos.values()) if (temporizador) reloj.clearTimeout(temporizador);
      sostenidos.clear();
    },
  };
}
