#include "dibujo.h"

#include <math.h>
#include <stdlib.h>
#include <string.h>

Lienzo lz;

void lienzo_usar(uint16_t *px, int ancho, int alto, int paso) {
  lz = (Lienzo){px, ancho, alto, paso, 0, 0, ancho, alto};
}

void recortar(int x, int y, int w, int h) {
  lz.x0 = x < 0 ? 0 : x;
  lz.y0 = y < 0 ? 0 : y;
  lz.x1 = x + w > lz.ancho ? lz.ancho : x + w;
  lz.y1 = y + h > lz.alto ? lz.alto : y + h;
}

void sin_recorte(void) {
  lz.x0 = lz.y0 = 0;
  lz.x1 = lz.ancho;
  lz.y1 = lz.alto;
}

// Mezcla en RGB565 con una sola multiplicación: los tres canales se separan en una palabra de 32 bits
// con espacio entre ellos.
static inline uint16_t mezcla32(uint16_t f, uint16_t c, unsigned a32) {
  uint32_t fx = (f | ((uint32_t)f << 16)) & 0x07E0F81Fu;
  uint32_t cx = (c | ((uint32_t)c << 16)) & 0x07E0F81Fu;
  uint32_t r = ((((cx - fx) * a32) >> 5) + fx) & 0x07E0F81Fu;
  return (uint16_t)(r | (r >> 16));
}

uint16_t mezclar(uint16_t fondo, uint16_t c, int alfa) {
  if (alfa >= 255) return c;
  if (alfa <= 0) return fondo;
  return mezcla32(fondo, c, (unsigned)(alfa * 32 + 128) >> 8);
}

static inline void poner(int x, int y, uint16_t c, int alfa) {
  if (x < lz.x0 || y < lz.y0 || x >= lz.x1 || y >= lz.y1 || alfa <= 0) return;
  uint16_t *p = lz.px + (size_t)y * lz.paso + x;
  *p = alfa >= 255 ? c : mezcla32(*p, c, (unsigned)(alfa * 32 + 128) >> 8);
}

static void tramo(int x, int y, int w, uint16_t c, int alfa) {
  if (y < lz.y0 || y >= lz.y1 || alfa <= 0) return;
  if (x < lz.x0) { w -= lz.x0 - x; x = lz.x0; }
  if (x + w > lz.x1) w = lz.x1 - x;
  if (w <= 0) return;
  uint16_t *p = lz.px + (size_t)y * lz.paso + x;
  if (alfa >= 255) {
    for (int i = 0; i < w; i++) p[i] = c;
  } else {
    unsigned a32 = (unsigned)(alfa * 32 + 128) >> 8;
    for (int i = 0; i < w; i++) p[i] = mezcla32(p[i], c, a32);
  }
}

void d_rect(int x, int y, int w, int h, uint16_t c, int alfa) {
  for (int j = y; j < y + h; j++) tramo(x, j, w, c, alfa);
}

// Distancia con signo de (px, py) a un rectángulo redondeado: negativa adentro.
static float distancia(float px, float py, float x, float y, float w, float h, float r) {
  float hx = w / 2, hy = h / 2;
  float qx = fabsf(px - (x + hx)) - (hx - r), qy = fabsf(py - (y + hy)) - (hy - r);
  float ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0;
  float dentro = qx > qy ? qx : qy;
  return sqrtf(ox * ox + oy * oy) + (dentro < 0 ? dentro : 0) - r;
}

static inline int cobertura(float d) {  // de la distancia al borde, cuánto del píxel cae adentro (0..255)
  float c = 0.5f - d;
  return c <= 0 ? 0 : c >= 1 ? 255 : (int)(c * 255);
}

void d_redondeado(int x, int y, int w, int h, int r, uint16_t c, int alfa) {
  if (w <= 0 || h <= 0) return;
  if (r * 2 > w) r = w / 2;
  if (r * 2 > h) r = h / 2;
  for (int j = y; j < y + h; j++) {
    if (j < lz.y0 || j >= lz.y1) continue;
    if (j >= y + r && j < y + h - r) {
      tramo(x, j, w, c, alfa);
      continue;
    }
    for (int i = x; i < x + r; i++) poner(i, j, c, cobertura(distancia(i + .5f, j + .5f, x, y, w, h, r)) * alfa / 255);
    tramo(x + r, j, w - 2 * r, c, alfa);
    for (int i = x + w - r; i < x + w; i++)
      poner(i, j, c, cobertura(distancia(i + .5f, j + .5f, x, y, w, h, r)) * alfa / 255);
  }
}

void d_borde(int x, int y, int w, int h, int r, int g, uint16_t c, int alfa) {
  if (w <= 0 || h <= 0) return;
  int ri = r - g > 0 ? r - g : 0, banda = (r > g ? r : g) + 1;
  for (int j = y; j < y + h; j++) {
    if (j < lz.y0 || j >= lz.y1) continue;
    int toda = j < y + banda || j >= y + h - banda;
    for (int i = x; i < x + w; i++) {
      if (!toda && i == x + banda && x + w - banda > i) i = x + w - banda;  // el centro de un renglón intermedio no lleva borde
      if (i < lz.x0 || i >= lz.x1) continue;
      int fuera = cobertura(distancia(i + .5f, j + .5f, x, y, w, h, r));
      int dentro = cobertura(distancia(i + .5f, j + .5f, x + g, y + g, w - 2 * g, h - 2 * g, ri));
      if (fuera > dentro) poner(i, j, c, (fuera - dentro) * alfa / 255);
    }
  }
}

void d_esquinas(int x, int y, int w, int h, int r, uint16_t c) {
  for (int j = y; j < y + h; j++) {
    if (j >= y + r && j < y + h - r) continue;
    for (int k = 0; k < 2; k++)
      for (int i = k ? x + w - r : x; i < (k ? x + w : x + r); i++)
        poner(i, j, c, 255 - cobertura(distancia(i + .5f, j + .5f, x, y, w, h, r)));
  }
}

// Los halos se calculan una vez por tamaño y se guardan: el mismo halo se pinta en cada cuadro.
typedef struct {
  int w, h, r, tam;
  uint8_t *m;
} Halo;
#define HALOS 24
static Halo halos[HALOS];
static int siguiente_halo;

static const Halo *halo(int w, int h, int r, int tam) {
  for (int k = 0; k < HALOS; k++)
    if (halos[k].m && halos[k].w == w && halos[k].h == h && halos[k].r == r && halos[k].tam == tam) return &halos[k];
  Halo *nuevo = &halos[siguiente_halo];
  siguiente_halo = (siguiente_halo + 1) % HALOS;
  free(nuevo->m);
  int W = w + 2 * tam, H = h + 2 * tam;
  nuevo->m = calloc((size_t)W * H, 1);
  if (!nuevo->m) return NULL;
  *nuevo = (Halo){w, h, r, tam, nuevo->m};
  for (int j = 0; j < H; j++)
    for (int i = 0; i < W; i++) {
      float d = distancia(i + .5f, j + .5f, tam, tam, w, h, r);
      if (d <= 0 || d >= tam) continue;
      float v = 1 - d / tam;
      nuevo->m[(size_t)j * W + i] = (uint8_t)(v * v * 255);
    }
  return nuevo;
}

void d_halo(int x, int y, int w, int h, int r, int tam, uint16_t c, int intensidad) {
  const Halo *k = halo(w, h, r, tam);
  if (k) d_mascara(k->m, w + 2 * tam, h + 2 * tam, x - tam, y - tam, c, intensidad);
}

static uint16_t entre(uint16_t a, uint16_t b, int t, int n) {  // t de 0 a n
  int r = ((a >> 11) * (n - t) + (b >> 11) * t) / n, g = (((a >> 5) & 63) * (n - t) + ((b >> 5) & 63) * t) / n,
      bl = ((a & 31) * (n - t) + (b & 31) * t) / n;
  return (uint16_t)(r << 11 | g << 5 | bl);
}

void d_degradado(int x, int y, int w, int h, uint16_t arriba, uint16_t abajo, int alfa) {
  for (int j = 0; j < h; j++) tramo(x, y + j, w, entre(arriba, abajo, j, h > 1 ? h - 1 : 1), alfa);
}

void d_circulo(int cx, int cy, int r, uint16_t c, int alfa) {
  for (int j = cy - r - 1; j <= cy + r; j++)
    for (int i = cx - r - 1; i <= cx + r; i++) {
      float dx = i + .5f - cx, dy = j + .5f - cy;
      poner(i, j, c, cobertura(sqrtf(dx * dx + dy * dy) - r) * alfa / 255);
    }
}

void d_mascara(const uint8_t *m, int mw, int mh, int x, int y, uint16_t c, int alfa) {
  int i0 = x < lz.x0 ? lz.x0 - x : 0, i1 = x + mw > lz.x1 ? lz.x1 - x : mw;
  int j0 = y < lz.y0 ? lz.y0 - y : 0, j1 = y + mh > lz.y1 ? lz.y1 - y : mh;
  for (int j = j0; j < j1; j++) {
    const uint8_t *f = m + (size_t)j * mw;
    uint16_t *p = lz.px + (size_t)(y + j) * lz.paso + x;
    for (int i = i0; i < i1; i++) {
      int a = f[i];
      if (!a) continue;
      if (alfa < 255) a = a * alfa / 255;
      p[i] = a >= 255 ? c : mezcla32(p[i], c, (unsigned)(a * 32 + 128) >> 8);
    }
  }
}

void d_imagen(const uint16_t *img, int iw, int ih, int x, int y, int alfa) {
  int i0 = x < lz.x0 ? lz.x0 - x : 0, i1 = x + iw > lz.x1 ? lz.x1 - x : iw;
  int j0 = y < lz.y0 ? lz.y0 - y : 0, j1 = y + ih > lz.y1 ? lz.y1 - y : ih;
  if (i1 <= i0) return;
  unsigned a32 = (unsigned)(alfa * 32 + 128) >> 8;
  for (int j = j0; j < j1; j++) {
    const uint16_t *f = img + (size_t)j * iw;
    uint16_t *p = lz.px + (size_t)(y + j) * lz.paso + x;
    if (alfa >= 255) memcpy(p + i0, f + i0, (size_t)(i1 - i0) * 2);
    else
      for (int i = i0; i < i1; i++) p[i] = mezcla32(p[i], f[i], a32);
  }
}

void d_imagen_alfa(const uint16_t *img, const uint8_t *a, int iw, int ih, int x, int y) {
  int i0 = x < lz.x0 ? lz.x0 - x : 0, i1 = x + iw > lz.x1 ? lz.x1 - x : iw;
  int j0 = y < lz.y0 ? lz.y0 - y : 0, j1 = y + ih > lz.y1 ? lz.y1 - y : ih;
  for (int j = j0; j < j1; j++) {
    uint16_t *p = lz.px + (size_t)(y + j) * lz.paso + x;
    for (int i = i0; i < i1; i++) {
      int v = a[(size_t)j * iw + i];
      if (v) p[i] = v >= 255 ? img[(size_t)j * iw + i] : mezcla32(p[i], img[(size_t)j * iw + i], (unsigned)(v * 32 + 128) >> 8);
    }
  }
}

void d_imagen_escalada(const uint16_t *img, int iw, int ih, int x, int y, int w, int h, int alfa) {
  if (w <= 0 || h <= 0) return;
  if (w == iw && h == ih) {
    d_imagen(img, iw, ih, x, y, alfa);
    return;
  }
  unsigned a32 = (unsigned)(alfa * 32 + 128) >> 8;
  uint32_t px = ((uint32_t)iw << 16) / w, py = ((uint32_t)ih << 16) / h;
  for (int j = 0; j < h; j++) {
    int Y = y + j;
    if (Y < lz.y0 || Y >= lz.y1) continue;
    const uint16_t *f = img + (size_t)((j * py) >> 16) * iw;
    uint16_t *p = lz.px + (size_t)Y * lz.paso;
    for (int i = 0; i < w; i++) {
      int X = x + i;
      if (X < lz.x0 || X >= lz.x1) continue;
      uint16_t c = f[(i * px) >> 16];
      p[X] = alfa >= 255 ? c : mezcla32(p[X], c, a32);
    }
  }
}

void d_imagen_trapecio(const uint16_t *img, int iw, int ih, int x, int y, int w, int h_izq, int h_der, int alfa) {
  int alto = h_izq > h_der ? h_izq : h_der;
  unsigned a32 = (unsigned)(alfa * 32 + 128) >> 8;
  for (int i = 0; i < w; i++) {
    int X = x + i;
    if (X < lz.x0 || X >= lz.x1) continue;
    int hc = h_izq + (h_der - h_izq) * i / (w > 1 ? w - 1 : 1);
    if (hc <= 0) continue;
    int arriba = y + (alto - hc) / 2, sx = i * iw / w;
    for (int j = 0; j < hc; j++) {
      int Y = arriba + j;
      if (Y < lz.y0 || Y >= lz.y1) continue;
      uint16_t c = img[(size_t)(j * ih / hc) * iw + sx];
      uint16_t *p = lz.px + (size_t)Y * lz.paso + X;
      *p = alfa >= 255 ? c : mezcla32(*p, c, a32);
    }
  }
}
