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
  imagen: 'crt',
  continuar: true,
  menu: 'mantener-select',
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

// Imagen de los juegos retro: el perfil de config/visual.json que se usa en los sistemas que tienen uno
// (docs/visual-profiles.md). «nitido» ganó en el laboratorio; el usuario pidió de fábrica el CRT que se
// le recomendó (crt-hyllian-fast), el más nítido y ligero de los CRT a pantalla completa.
export const IMAGENES = {
  original: 'ORIGINAL',
  nitido: 'NÍTIDA',
  crt: 'CRT',
  'crt-suave': 'CRT SUAVE',
};

// Combinación del mando que pausa el juego y abre el menú de RetroArch (guardar, cargar, reiniciar).
// Mantener Select es la moneda en un tablero: se aprieta un instante para meter créditos, no 2 s.
export const MENUS_JUEGO = {
  'mantener-select': 'MANTENER SELECT',
  ninguno: 'DESACTIVADO',
};

export const PASO_VOLUMEN = 10;
