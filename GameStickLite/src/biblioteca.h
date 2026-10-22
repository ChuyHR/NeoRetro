// Biblioteca del Game Stick: los juegos de roms/<carpeta>/, con lo que diga el gamelist.xml de esa
// carpeta (formato de EmulationStation, el que dejan RetroBat y Skraper) y sus imágenes. Todo se lee
// en el aparato: agregar un juego es copiar su archivo, y si se tienen, su gamelist e imágenes.
// Favoritos y recientes quedan en neo/datos-usuario.txt como «carpeta/archivo».
#pragma once
#include <stddef.h>
#include <stdint.h>

#define MAX_RECIENTES 20
#define MAX_VISTAS 16

typedef struct {
  const char *id, *barra, *etiqueta, *icono, *emulador, *extensiones;
  const char *carpetas[4];  // nombres posibles en roms/: el del Game Stick y el de Neo Arcade o RetroBat
  uint32_t color;           // de la portada que se genera cuando el juego no trae imagen
} Sistema;

extern const Sistema SISTEMAS[];
extern const int N_SISTEMAS;

typedef struct {
  char *archivo, *carpeta;  // roms/<carpeta>/<archivo>
  int sistema;
  char *titulo, *meta, *descripcion;
  char *gl_arte, *gl_captura;  // las rutas que trae el gamelist
  char *arte, *captura;        // ya resueltas: NULL sin buscar, "" si no hay
  int favorito, ficha_vieja;
} Juego;

enum { VISTA_TODOS = -1, VISTA_FAVORITOS = -2, VISTA_RECIENTES = -3 };

typedef struct {
  const char *nombre, *icono;
  int tipo;  // índice en SISTEMAS, o VISTA_*
  Juego **juegos;
  int n, elegido;
} Vista;

extern Vista vistas[MAX_VISTAS];
extern int n_vistas;

void biblioteca_leer(const char *carpeta_roms, const char *carpeta_neo, void (*anotar)(const char *, ...));
void clave_de(const Juego *j, char *clave, size_t tam);
int cambiar_favorito(Juego *j);  // 1 si quedó como favorito
void agregar_reciente(Juego *j);
const char *arte_de(Juego *j);     // imagen de la tarjeta, o NULL
const char *captura_de(Juego *j);  // imagen de la ficha, o NULL
void ficha_de(Juego *j);           // completa la ficha con neo/medios/*.txt si el gamelist no la trajo
