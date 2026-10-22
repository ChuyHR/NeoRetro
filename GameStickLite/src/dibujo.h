// Dibujo en RGB565, el formato de la pantalla del Game Stick: rectángulos con esquinas redondeadas y
// bordes suaves, halos de brillo, degradados, círculos, máscaras (íconos y letras) e imágenes.
// Todo respeta un recorte. Los colores van en RGB565 y las transparencias de 0 (nada) a 255 (opaco).
#pragma once
#include <stdint.h>

#define RGB565(hex) ((uint16_t)((((hex) >> 8) & 0xF800) | (((hex) >> 5) & 0x07E0) | (((hex) >> 3) & 0x001F)))

typedef struct {
  uint16_t *px;
  int ancho, alto, paso;  // paso en píxeles
  int x0, y0, x1, y1;     // recorte: se dibuja en [x0, x1) × [y0, y1)
} Lienzo;

extern Lienzo lz;

void lienzo_usar(uint16_t *px, int ancho, int alto, int paso);
void recortar(int x, int y, int w, int h);
void sin_recorte(void);

void d_rect(int x, int y, int w, int h, uint16_t c, int alfa);
void d_redondeado(int x, int y, int w, int h, int r, uint16_t c, int alfa);
void d_borde(int x, int y, int w, int h, int r, int grosor, uint16_t c, int alfa);
// Brillo alrededor de un rectángulo redondeado, de `tam` píxeles hacia afuera.
void d_halo(int x, int y, int w, int h, int r, int tam, uint16_t c, int intensidad);
// Pinta de `c` lo que queda fuera de las esquinas redondeadas: recorta en curva una imagen ya pintada.
void d_esquinas(int x, int y, int w, int h, int r, uint16_t c);
void d_degradado(int x, int y, int w, int h, uint16_t arriba, uint16_t abajo, int alfa);
void d_circulo(int cx, int cy, int r, uint16_t c, int alfa);
void d_mascara(const uint8_t *m, int mw, int mh, int x, int y, uint16_t c, int alfa);
void d_imagen(const uint16_t *img, int iw, int ih, int x, int y, int alfa);
void d_imagen_alfa(const uint16_t *img, const uint8_t *a, int iw, int ih, int x, int y);
void d_imagen_escalada(const uint16_t *img, int iw, int ih, int x, int y, int w, int h, int alfa);
// La imagen en un trapecio: alto h_izq a la izquierda y h_der a la derecha, centrados en y + alto/2.
// Es la tarjeta de la orilla del carrusel, girada.
void d_imagen_trapecio(const uint16_t *img, int iw, int ih, int x, int y, int w, int h_izq, int h_der, int alfa);
uint16_t mezclar(uint16_t fondo, uint16_t c, int alfa);
