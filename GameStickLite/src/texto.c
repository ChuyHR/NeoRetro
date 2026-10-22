#include "texto.h"

#include <stdlib.h>
#include <string.h>

#include "dibujo.h"

#define STB_TRUETYPE_IMPLEMENTATION
#define STBTT_STATIC
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-function"
#include "stb_truetype.h"
#pragma GCC diagnostic pop

static stbtt_fontinfo info[N_FUENTES];
static int abiertas;

typedef struct {
  int fuente, tam;
  uint32_t cp;
  uint8_t *bmp;
  int w, h, xoff, yoff, avance;
} Letra;

#define LETRAS 4096
static Letra letras[LETRAS];
static int ocupadas;

int tx_iniciar(void) {
  for (int f = 0; f < N_FUENTES; f++)
    if (!stbtt_InitFont(&info[f], FUENTES[f].datos, stbtt_GetFontOffsetForIndex(FUENTES[f].datos, 0))) return -1;
  abiertas = 1;
  return 0;
}

static float escala(int f, int tam) {
  return stbtt_ScaleForMappingEmToPixels(&info[f], (float)tam);
}

int tx_alto(int f, int tam) {
  int a, d, g;
  stbtt_GetFontVMetrics(&info[f], &a, &d, &g);
  return (int)((a - d) * escala(f, tam) + 0.5f);
}

static int ascenso(int f, int tam) {
  int a, d, g;
  stbtt_GetFontVMetrics(&info[f], &a, &d, &g);
  return (int)(a * escala(f, tam) + 0.5f);
}

// Siguiente letra de un texto UTF-8. Las comillas y rayas tipográficas que la fuente no tenga se
// cambian por las sencillas.
static uint32_t siguiente(const char **s) {
  const unsigned char *u = (const unsigned char *)*s;
  uint32_t cp = *u++;
  if (cp >= 0xF0 && u[0] && u[1] && u[2]) {
    cp = ((cp & 7) << 18) | ((u[0] & 63) << 12) | ((u[1] & 63) << 6) | (u[2] & 63);
    u += 3;
  } else if (cp >= 0xE0 && u[0] && u[1]) {
    cp = ((cp & 15) << 12) | ((u[0] & 63) << 6) | (u[1] & 63);
    u += 2;
  } else if (cp >= 0xC0 && u[0]) {
    cp = ((cp & 31) << 6) | (u[0] & 63);
    u += 1;
  }
  *s = (const char *)u;
  return cp;
}

static uint32_t sustituto(int f, uint32_t cp) {
  if (stbtt_FindGlyphIndex(&info[f], (int)cp)) return cp;
  switch (cp) {
    case 0x2018: case 0x2019: return '\'';
    case 0x201C: case 0x201D: return '"';
    case 0x2013: case 0x2014: return '-';
    case 0x2022: case 0x00B7: return stbtt_FindGlyphIndex(&info[f], 0xB7) ? 0xB7 : '.';
    case 0x2026: return '.';
    default: return cp;
  }
}

static const Letra *letra(int f, int tam, uint32_t cp) {
  unsigned h = (cp * 2654435761u ^ (unsigned)(f * 131 + tam * 7919)) % LETRAS;
  for (int k = 0; k < LETRAS; k++, h = (h + 1) % LETRAS) {
    Letra *l = &letras[h];
    if (!l->tam) break;
    if (l->fuente == f && l->tam == tam && l->cp == cp) return l;
  }
  if (ocupadas > LETRAS * 3 / 4) {  // llena: se empieza de nuevo
    for (int k = 0; k < LETRAS; k++) free(letras[k].bmp);
    memset(letras, 0, sizeof letras);
    ocupadas = 0;
    h = (cp * 2654435761u ^ (unsigned)(f * 131 + tam * 7919)) % LETRAS;
  }
  while (letras[h].tam) h = (h + 1) % LETRAS;
  Letra *l = &letras[h];
  float e = escala(f, tam);
  int avance, izq;
  stbtt_GetCodepointHMetrics(&info[f], (int)cp, &avance, &izq);
  *l = (Letra){f, tam, cp, NULL, 0, 0, 0, 0, (int)(avance * e + 0.5f)};
  l->bmp = stbtt_GetCodepointBitmap(&info[f], e, e, (int)cp, &l->w, &l->h, &l->xoff, &l->yoff);
  ocupadas++;
  return l;
}

static int recorrer(int f, int tam, int espaciado, int x, int y, uint16_t c, int alfa, const char *s, int pintar) {
  if (!abiertas) return x;
  int base = y + ascenso(f, tam);
  uint32_t previa = 0;
  float e = escala(f, tam);
  while (*s) {
    uint32_t cp = sustituto(f, siguiente(&s));
    if (cp == 0x2026 && !stbtt_FindGlyphIndex(&info[f], 0x2026)) {  // «…» sin glifo: tres puntos
      for (int k = 0; k < 3; k++) {
        const Letra *l = letra(f, tam, '.');
        if (pintar && l->bmp) d_mascara(l->bmp, l->w, l->h, x + l->xoff, base + l->yoff, c, alfa);
        x += l->avance;
      }
      previa = '.';
      continue;
    }
    if (previa) x += (int)(stbtt_GetCodepointKernAdvance(&info[f], (int)previa, (int)cp) * e);
    const Letra *l = letra(f, tam, cp);
    if (pintar && l->bmp) d_mascara(l->bmp, l->w, l->h, x + l->xoff, base + l->yoff, c, alfa);
    x += l->avance + espaciado;
    previa = cp;
  }
  return x;
}

int tx_ancho(int f, int tam, int espaciado, const char *s) {
  return recorrer(f, tam, espaciado, 0, 0, 0, 0, s, 0) - (*s ? espaciado : 0);
}

int tx_dibujar(int f, int tam, int espaciado, int x, int y, uint16_t c, int alfa, const char *s) {
  return recorrer(f, tam, espaciado, x, y, c, alfa, s, 1);
}

int tx_recortado(int f, int tam, int espaciado, int x, int y, int ancho, uint16_t c, const char *s) {
  if (tx_ancho(f, tam, espaciado, s) <= ancho) return tx_dibujar(f, tam, espaciado, x, y, c, 255, s);
  char buf[512];
  size_t n = strlen(s);
  if (n > sizeof buf - 4) n = sizeof buf - 4;
  while (n > 0) {
    do n--; while (n > 0 && (s[n] & 0xC0) == 0x80);  // sin partir una letra de varios bytes
    while (n > 0 && s[n - 1] == ' ') n--;
    memcpy(buf, s, n);
    memcpy(buf + n, "\xE2\x80\xA6", 4);
    if (tx_ancho(f, tam, espaciado, buf) <= ancho) break;
  }
  return tx_dibujar(f, tam, espaciado, x, y, c, 255, buf);
}

int tx_parrafo(int f, int tam, int x, int y, int ancho, int alto_renglon, int max_renglones, uint16_t c,
               const char *s) {
  char linea[1024];
  int renglones = 0;
  while (*s && renglones < max_renglones) {
    while (*s == ' ') s++;
    // Se agregan palabras mientras quepan.
    size_t tomado = 0, ultimo_corte = 0;
    while (s[tomado]) {
      size_t fin = tomado;
      while (s[fin] == ' ') fin++;
      while (s[fin] && s[fin] != ' ') fin++;
      if (fin >= sizeof linea - 4) break;
      memcpy(linea, s, fin);
      linea[fin] = 0;
      if (tx_ancho(f, tam, 0, linea) > ancho && ultimo_corte) break;
      tomado = ultimo_corte = fin;
      if (tx_ancho(f, tam, 0, linea) > ancho) break;  // una sola palabra más ancha que el renglón
    }
    if (!tomado) break;
    memcpy(linea, s, tomado);
    linea[tomado] = 0;
    renglones++;
    if (renglones == max_renglones && s[tomado] && s[tomado + strspn(s + tomado, " ")]) {
      // Último renglón con texto pendiente: lo que sigue, cortado con «…».
      size_t n = strlen(s) < 300 ? strlen(s) : 300;
      while (n > 0 && (s[n] & 0xC0) == 0x80) n--;
      memcpy(linea, s, n);
      linea[n] = 0;
      tx_recortado(f, tam, 0, x, y, ancho, c, linea);
    } else {
      tx_dibujar(f, tam, 0, x, y, c, 255, linea);
    }
    y += alto_renglon;
    s += tomado;
  }
  return renglones;
}
