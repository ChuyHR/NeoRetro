#include "imagenes.h"

#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <sys/stat.h>
#include <unistd.h>

#define STB_IMAGE_IMPLEMENTATION
#define STBI_ONLY_PNG
#define STBI_ONLY_JPEG
#define STBI_NO_HDR
#define STBI_NO_LINEAR
#define STB_IMAGE_STATIC
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-function"
#include "stb_image.h"
#pragma GCC diagnostic pop

// Color de las tarjetas del menú (#0B1324), detrás de lo transparente.
#define FONDO_R 11
#define FONDO_G 19
#define FONDO_B 36
// Sube cuando cambia cómo se ajustan las imágenes: así no se usa lo guardado con la forma anterior.
#define VERSION_CACHE 2

static char carpeta[512];
static void (*anotar)(const char *, ...);

typedef struct {
  uint64_t clave;  // ruta + tamaño + modo
  uint64_t ruta;   // solo la ruta
  Img img;
  unsigned uso;
  int fallida;
} Entrada;

#define ENTRADAS 96
#define BYTES_MAX (14u << 20)
static Entrada entradas[ENTRADAS];
static unsigned reloj;
static size_t bytes;

void imagenes_iniciar(const char *carpeta_cache, void (*registrar)(const char *, ...)) {
  snprintf(carpeta, sizeof carpeta, "%s", carpeta_cache);
  anotar = registrar;
  mkdir(carpeta, 0755);
}

static uint64_t fnv(const char *s, uint64_t h) {
  for (; *s; s++) h = (h ^ (unsigned char)*s) * 1099511628211ull;
  return h;
}

static uint64_t clave_de(const char *ruta, int w, int h, int modo) {
  uint64_t k = fnv(ruta, 1469598103934665603ull);
  return (k ^ ((uint64_t)w << 32 | (uint64_t)h << 8 | (uint64_t)modo)) * 1099511628211ull;
}

static Entrada *buscar(uint64_t clave) {
  for (int k = 0; k < ENTRADAS; k++)
    if (entradas[k].clave == clave && (entradas[k].img.px || entradas[k].fallida)) {
      entradas[k].uso = ++reloj;
      return &entradas[k];
    }
  return NULL;
}

static void soltar(Entrada *e) {
  if (e->img.px) bytes -= (size_t)e->img.w * e->img.h * 2;
  free(e->img.px);
  memset(e, 0, sizeof *e);
}

// Un lugar libre; si no hay, o si ya se usó la memoria permitida, se suelta la menos usada.
static Entrada *lugar(void) {
  for (;;) {
    int libre = -1, viejo = -1;
    for (int k = 0; k < ENTRADAS; k++) {
      if (!entradas[k].img.px && !entradas[k].fallida) {
        if (libre < 0) libre = k;
      } else if (viejo < 0 || entradas[k].uso < entradas[viejo].uso) {
        viejo = k;
      }
    }
    if (libre >= 0 && (bytes < BYTES_MAX || viejo < 0)) return &entradas[libre];
    soltar(&entradas[viejo]);
  }
}

// Reduce o amplía RGB888 a RGB565. Al reducir promedia el bloque de origen de cada píxel.
static uint16_t *ajustar(const uint8_t *src, int sw, int sh, int cx, int cy, int cw, int ch, int w, int h) {
  uint16_t *dst = malloc((size_t)w * h * 2);
  if (!dst) return NULL;
  for (int j = 0; j < h; j++) {
    int y0 = cy + j * ch / h, y1 = cy + (j + 1) * ch / h;
    if (y1 <= y0) y1 = y0 + 1;
    if (y1 > sh) y1 = sh;
    for (int i = 0; i < w; i++) {
      int x0 = cx + i * cw / w, x1 = cx + (i + 1) * cw / w;
      if (x1 <= x0) x1 = x0 + 1;
      if (x1 > sw) x1 = sw;
      unsigned r = 0, g = 0, b = 0, n = 0;
      for (int y = y0; y < y1; y++) {
        const uint8_t *p = src + ((size_t)y * sw + x0) * 3;
        for (int x = x0; x < x1; x++, p += 3) { r += p[0]; g += p[1]; b += p[2]; n++; }
      }
      if (!n) n = 1;
      r /= n; g /= n; b /= n;
      dst[(size_t)j * w + i] = (uint16_t)((r >> 3) << 11 | (g >> 2) << 5 | (b >> 3));
    }
  }
  return dst;
}

// Las .img de neo/medios (scripts/preparar-medios.py): «NEOI», ancho y alto, y RGB565.
static uint8_t *leer_neoi(const char *ruta, int *w, int *h) {
  FILE *f = fopen(ruta, "rb");
  if (!f) return NULL;
  uint8_t cab[8];
  uint8_t *rgb = NULL;
  if (fread(cab, 1, 8, f) == 8 && !memcmp(cab, "NEOI", 4)) {
    *w = cab[4] | cab[5] << 8;
    *h = cab[6] | cab[7] << 8;
    size_t n = (size_t)*w * *h;
    uint16_t *px = malloc(n * 2);
    rgb = malloc(n * 3);
    if (px && rgb && fread(px, 2, n, f) == n) {
      for (size_t i = 0; i < n; i++) {
        rgb[i * 3] = (px[i] >> 8) & 0xF8;
        rgb[i * 3 + 1] = (px[i] >> 3) & 0xFC;
        rgb[i * 3 + 2] = (px[i] << 3) & 0xF8;
      }
    } else {
      free(rgb);
      rgb = NULL;
    }
    free(px);
  }
  fclose(f);
  return rgb;
}

static void ruta_cache(const char *ruta, const struct stat *st, int w, int h, int modo, char *salida, size_t tam) {
  uint64_t k = fnv(ruta, 1469598103934665603ull) ^ ((uint64_t)st->st_size << 20) ^ (uint64_t)st->st_mtime;
  snprintf(salida, tam, "%s/%016llx-%dx%d%c%d.565", carpeta, (unsigned long long)k, w, h, modo == CUBRIR ? 'c' : 'k',
           VERSION_CACHE);
}

static int leer_cache(const char *archivo, Img *img) {
  FILE *f = fopen(archivo, "rb");
  if (!f) return 0;
  uint8_t cab[8];
  int ok = 0;
  if (fread(cab, 1, 8, f) == 8 && !memcmp(cab, "NEO5", 4)) {
    img->w = cab[4] | cab[5] << 8;
    img->h = cab[6] | cab[7] << 8;
    size_t n = (size_t)img->w * img->h;
    img->px = malloc(n * 2);
    ok = img->px && fread(img->px, 2, n, f) == n;
    if (!ok) { free(img->px); img->px = NULL; }
  }
  fclose(f);
  return ok;
}

static void escribir_cache(const char *archivo, const Img *img) {
  char temporal[600];
  snprintf(temporal, sizeof temporal, "%s.nuevo", archivo);
  FILE *f = fopen(temporal, "wb");
  if (!f) return;
  uint8_t cab[8] = {'N', 'E', 'O', '5', img->w & 255, img->w >> 8, img->h & 255, img->h >> 8};
  int ok = fwrite(cab, 1, 8, f) == 8 && fwrite(img->px, 2, (size_t)img->w * img->h, f) == (size_t)img->w * img->h;
  ok = !fclose(f) && ok;
  if (ok) rename(temporal, archivo);
  else unlink(temporal);
}

static int cargar(const char *ruta, int w, int h, int modo, Img *img) {
  struct stat st;
  if (stat(ruta, &st)) return 0;
  char cache[600];
  ruta_cache(ruta, &st, w, h, modo, cache, sizeof cache);
  if (leer_cache(cache, img)) return 1;

  int sw, sh, canales;
  size_t largo = strlen(ruta);
  uint8_t *rgb;
  if (largo > 4 && !strcasecmp(ruta + largo - 4, ".img")) {
    rgb = leer_neoi(ruta, &sw, &sh);
  } else {
    // Las imágenes de RetroBat traen partes transparentes alrededor del logotipo: se mezclan con el
    // color de las tarjetas, no con negro.
    uint8_t *rgba = stbi_load(ruta, &sw, &sh, &canales, 4);
    rgb = rgba;
    if (rgba) {
      for (size_t i = 0, n = (size_t)sw * sh; i < n; i++) {
        unsigned a = rgba[i * 4 + 3];
        rgb[i * 3] = (uint8_t)((rgba[i * 4] * a + FONDO_R * (255 - a)) / 255);
        rgb[i * 3 + 1] = (uint8_t)((rgba[i * 4 + 1] * a + FONDO_G * (255 - a)) / 255);
        rgb[i * 3 + 2] = (uint8_t)((rgba[i * 4 + 2] * a + FONDO_B * (255 - a)) / 255);
      }
    }
  }
  if (!rgb) {
    if (anotar) anotar("imagen: no se pudo leer %s (%s)", ruta, stbi_failure_reason() ? stbi_failure_reason() : "?");
    return 0;
  }
  int cx = 0, cy = 0, cw = sw, ch = sh, ow = w, oh = h;
  if (modo == CUBRIR) {  // recorta lo que sobra, centrado
    if ((long)sw * h > (long)sh * w) { cw = (int)((long)sh * w / h); cx = (sw - cw) / 2; }
    else { ch = (int)((long)sw * h / w); cy = (sh - ch) / 2; }
  } else {  // cabe entera
    if ((long)sw * h > (long)sh * w) oh = (int)((long)sh * w / sw);
    else ow = (int)((long)sw * h / sh);
    if (ow < 1) ow = 1;
    if (oh < 1) oh = 1;
  }
  img->px = ajustar(rgb, sw, sh, cx, cy, cw, ch, ow, oh);
  img->w = ow;
  img->h = oh;
  free(rgb);
  if (!img->px) return 0;
  escribir_cache(cache, img);
  return 1;
}

static Entrada *guardar(const char *ruta, uint64_t clave, const Img *img, int ok) {
  Entrada *e = lugar();
  e->clave = clave;
  e->ruta = fnv(ruta, 1469598103934665603ull);
  e->uso = ++reloj;
  e->fallida = !ok;
  e->img = *img;
  if (ok) bytes += (size_t)img->w * img->h * 2;
  return e;
}

const Img *imagen_lista(const char *ruta, int w, int h, int modo) {
  if (!ruta || !*ruta) return NULL;
  uint64_t clave = clave_de(ruta, w, h, modo);
  Entrada *e = buscar(clave);
  if (e) return e->img.px ? &e->img : NULL;
  struct stat st;
  char cache[600];
  Img img = {0};
  if (stat(ruta, &st)) return NULL;
  ruta_cache(ruta, &st, w, h, modo, cache, sizeof cache);
  if (!leer_cache(cache, &img)) return NULL;
  return &guardar(ruta, clave, &img, 1)->img;
}

const Img *imagen(const char *ruta, int w, int h, int modo) {
  if (!ruta || !*ruta) return NULL;
  uint64_t clave = clave_de(ruta, w, h, modo);
  Entrada *e = buscar(clave);
  if (e) return e->img.px ? &e->img : NULL;
  Img img = {0};
  int ok = cargar(ruta, w, h, modo, &img);
  e = guardar(ruta, clave, &img, ok);
  return ok ? &e->img : NULL;
}

const Img *imagen_parecida(const char *ruta) {
  if (!ruta || !*ruta) return NULL;
  uint64_t k = fnv(ruta, 1469598103934665603ull);
  const Img *mejor = NULL;
  for (int i = 0; i < ENTRADAS; i++)
    if (entradas[i].ruta == k && entradas[i].img.px && (!mejor || entradas[i].img.w > mejor->w)) mejor = &entradas[i].img;
  return mejor;
}
