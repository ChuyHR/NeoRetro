// Pantalla del Game Stick: dibujo directo en /dev/fb0 (OSD de Amlogic), texto con una fuente 8x8 y
// captura en PNG. Sin /dev/fb0 y con NEO_SIMULAR=1 dibuja en memoria (pruebas en la laptop con QEMU).
#pragma once
#include <linux/fb.h>
#include <stddef.h>
#include <stdint.h>

typedef struct {
  uint8_t *fb;      // memoria del framebuffer, o NULL al simular
  uint8_t *lienzo;  // donde se dibuja; mostrar() lo copia entero al framebuffer
  size_t tam;
  int ancho, alto, bpp, paso;
  int simulada;
  int fd, doble, pagina;  // con doble búfer se dibuja en la página que no se ve y luego se muestra
  struct fb_var_screeninfo var;
} Pantalla;

extern Pantalla pantalla;

// registrar: función para anotar lo que se averigua de la pantalla (puede ser NULL).
int abrir_pantalla(void (*registrar)(const char *formato, ...));
uint32_t color(int r, int g, int b);
void punto(int x, int y, uint32_t c);
void rectangulo(int x, int y, int w, int h, uint32_t c);
void marco(int x, int y, int w, int h, int grosor, uint32_t c);
int texto(int x, int y, int escala, uint32_t c, const char *utf8);
void mostrar(void);
void limpiar_pantalla(void);  // negro en el lienzo y en el framebuffer (en sus dos páginas)
// Si el framebuffer tiene dos páginas, mostrar() alterna entre ellas: el cuadro cambia de una vez,
// sin verse a medio pintar. Lo usa el menú, que anima el carrusel.
void activar_doble_bufer(void);
// Otro programa (un emulador) dejó a la vista la primera página.
void pantalla_tras_otro_programa(void);
void guardar_png(const char *ruta);
