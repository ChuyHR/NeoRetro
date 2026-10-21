// Ajustes de Configuración: valores de fábrica y opciones. Son los mismos que valida el núcleo al
// guardarlos (core/almacenamiento/almacenamiento.js); pruebas/almacenamiento.test.js comprueba que
// coincidan.

export const AJUSTES_INICIALES = Object.freeze({
  crt: true,
  neon: 'alto',
  animaciones: true,
  volumen: 70,
  tema: 'azul',
  salir: 'select-start',
});

// Colores del tema, tomados de la paleta del prototipo. El azul es el de fábrica.
export const TEMAS = {
  azul: '#1E90FF',
  magenta: '#FF168C',
  violeta: '#8B5CF6',
  naranja: '#FFB020',
};

// Combinación del mando para salir de un juego; core/main.js la escribe en RetroArch antes de abrirlo.
export const SALIDAS = {
  'select-start': 'SELECT + START',
  'mantener-start': 'MANTENER START',
  'lr-select-start': 'LB + RB + SELECT + START',
};

export const PASO_VOLUMEN = 10;
