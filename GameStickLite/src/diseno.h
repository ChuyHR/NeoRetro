// Pantallas del menú dibujadas por Neo Arcade (scripts/capturar-diseno.mjs y convertir-diseno.py):
// archivos .frm de neo/diseno/ con píxeles RGB565 comprimidos con LZ4, que se descomprimen directo en
// el lienzo de la pantalla.
#pragma once

#define DISENO_MAX_VISTAS 16

typedef struct {
  char id[24], nombre[48];
  int n;
  char **claves;   // «carpeta/archivo» de la tarjeta, en el orden de Neo Arcade
  char **titulos;
} VistaDiseno;

typedef struct {
  VistaDiseno vistas[DISENO_MAX_VISTAS];
  int n_vistas;
} Diseno;

// Lee neo/diseno/indice.txt. Devuelve 0 si hay diseño y la pantalla es la de las capturas
// (1280×720 en RGB565); si no, el menú usa su dibujo propio.
int diseno_abrir(Diseno *d, const char *carpeta_neo, void (*registrar)(const char *formato, ...));
// Pinta una pieza (pantalla completa o una zona) en el lienzo. ruta es relativa a neo/diseno/.
int diseno_pintar(const char *ruta);
// Deja en memoria una pieza que probablemente se pinte pronto (la pantalla del juego vecino).
void diseno_precargar(const char *ruta);
// Índice de la clave en la vista, o -1.
int diseno_buscar(const VistaDiseno *v, const char *clave);
