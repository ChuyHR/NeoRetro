// Sonidos cortos de navegación, generados en el momento con la Web Audio API (no hay archivos de audio):
// un pulso al moverse, dos notas al cambiar de sistema, un arpegio al aceptar, dos notas bajando al
// volver. Suenan con el volumen de Configuración; en 0 no suena nada.

// [frecuencia en Hz, duración en segundos] de cada nota, en orden.
export const NOTAS = {
  mover: [[880, 0.035]],
  sistema: [[660, 0.05], [990, 0.06]],
  aceptar: [[523, 0.05], [784, 0.05], [1046, 0.09]],
  volver: [[660, 0.05], [440, 0.08]],
  favorito: [[1046, 0.05], [1568, 0.1]],
  error: [[196, 0.2]],
};

const GANANCIA_MAXIMA = 0.08; // con el volumen al 100 %: los pulsos cuadrados suenan fuerte

// Qué sonido corresponde a un cambio de estado, o null. Función pura (se prueba con Node).
export function sonidoDelCambio(anterior, estado) {
  if (estado.error && !anterior.error) return 'error';
  if (estado.mapeo && anterior.mapeo && estado.mapeo.paso !== anterior.mapeo.paso) return 'aceptar';
  if (!anterior.ventana && estado.ventana) return 'aceptar';
  if (anterior.ventana && !estado.ventana) return anterior.ventana === 'lanzamiento' ? null : 'volver';
  if (estado.favoritos.length !== anterior.favoritos.length) return 'favorito';
  if (estado.sistema !== anterior.sistema) return 'sistema';
  if (estado.ajustes !== anterior.ajustes) return 'aceptar';
  if (estado.seleccion !== anterior.seleccion || estado.accion !== anterior.accion
    || estado.foco !== anterior.foco || estado.escribiendo !== anterior.escribiendo) return 'mover';
  return null;
}

export function crearSonidos() {
  let contexto = null;
  return {
    tocar(nombre, volumen) {
      if (!nombre || !volumen || !NOTAS[nombre]) return;
      contexto ??= new AudioContext();
      if (contexto.state === 'suspended') contexto.resume();
      const pico = GANANCIA_MAXIMA * (volumen / 100);
      let inicio = contexto.currentTime;
      for (const [frecuencia, duracion] of NOTAS[nombre]) {
        const oscilador = contexto.createOscillator();
        oscilador.type = 'square';
        oscilador.frequency.value = frecuencia;
        const envolvente = contexto.createGain();
        envolvente.gain.setValueAtTime(0, inicio);
        envolvente.gain.linearRampToValueAtTime(pico, inicio + 0.005);
        envolvente.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
        oscilador.connect(envolvente).connect(contexto.destination);
        oscilador.start(inicio);
        oscilador.stop(inicio + duracion + 0.01);
        inicio += duracion * 0.8;
      }
    },
  };
}
