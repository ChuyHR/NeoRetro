#include "diseno.h"

#include <limits.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "pantalla.h"

static char raiz[PATH_MAX];  // neo/diseno

// Unas cuantas piezas comprimidas en memoria: la pantalla de ahora y las de los vecinos. Cada una pesa
// unos 250 KB; leerlas de la tarjeta es lo más lento de cambiar de juego.
#define EN_MEMORIA 8
typedef struct {
  char ruta[160];
  uint8_t *datos;
  size_t tam;
  unsigned uso;
} Pieza;
static Pieza memoria[EN_MEMORIA];
static unsigned reloj_uso;

static void quitar_salto(char *s) { s[strcspn(s, "\r\n")] = 0; }

int diseno_abrir(Diseno *d, const char *carpeta_neo, void (*registrar)(const char *formato, ...)) {
  memset(d, 0, sizeof *d);
  if (pantalla.ancho != 1280 || pantalla.alto != 720 || pantalla.bpp != 16 || pantalla.var.red.offset != 11) {
    if (registrar) registrar("diseño: la pantalla no es de 1280×720 en RGB565; se usa el dibujo propio");
    return -1;
  }
  snprintf(raiz, sizeof raiz, "%s/diseno", carpeta_neo);
  char ruta[PATH_MAX + 16], linea[1024];
  snprintf(ruta, sizeof ruta, "%s/indice.txt", raiz);
  FILE *f = fopen(ruta, "r");
  if (!f) return -1;
  int capacidad[DISENO_MAX_VISTAS] = {0};
  while (fgets(linea, sizeof linea, f)) {
    quitar_salto(linea);
    if (linea[0] == '#') {  // «#id|nombre»
      if (d->n_vistas == DISENO_MAX_VISTAS) continue;
      VistaDiseno *v = &d->vistas[d->n_vistas++];
      char *barra = strchr(linea + 1, '|');
      if (barra) *barra = 0;
      snprintf(v->id, sizeof v->id, "%s", linea + 1);
      snprintf(v->nombre, sizeof v->nombre, "%s", barra ? barra + 1 : v->id);
      continue;
    }
    // «vista|NNN|carpeta/archivo|título»
    char *campos[4] = {linea};
    int n = 1;
    for (char *p = linea; *p && n < 4; p++)
      if (*p == '|') { *p = 0; campos[n++] = p + 1; }
    if (n < 3) continue;
    for (int i = 0; i < d->n_vistas; i++) {
      VistaDiseno *v = &d->vistas[i];
      if (strcmp(v->id, campos[0])) continue;
      if (v->n == capacidad[i]) {
        capacidad[i] = capacidad[i] ? capacidad[i] * 2 : 32;
        v->claves = realloc(v->claves, sizeof *v->claves * capacidad[i]);
        v->titulos = realloc(v->titulos, sizeof *v->titulos * capacidad[i]);
      }
      v->claves[v->n] = strdup(campos[2]);
      v->titulos[v->n] = strdup(n > 3 ? campos[3] : campos[2]);
      v->n++;
    }
  }
  fclose(f);
  if (registrar) {
    char resumen[512] = "";
    for (int i = 0; i < d->n_vistas; i++)
      snprintf(resumen + strlen(resumen), sizeof resumen - strlen(resumen), "%s%s %d", i ? ", " : "", d->vistas[i].nombre, d->vistas[i].n);
    registrar("diseño: %s", resumen);
  }
  return d->n_vistas ? 0 : -1;
}

int diseno_buscar(const VistaDiseno *v, const char *clave) {
  for (int i = 0; i < v->n; i++)
    if (!strcmp(v->claves[i], clave)) return i;
  return -1;
}

static Pieza *traer(const char *ruta) {
  Pieza *libre = &memoria[0];
  for (int i = 0; i < EN_MEMORIA; i++) {
    if (memoria[i].datos && !strcmp(memoria[i].ruta, ruta)) {
      memoria[i].uso = ++reloj_uso;
      return &memoria[i];
    }
    if (memoria[i].uso < libre->uso) libre = &memoria[i];
  }
  char completa[PATH_MAX + 200];
  snprintf(completa, sizeof completa, "%s/%s", raiz, ruta);
  FILE *f = fopen(completa, "rb");
  if (!f) return NULL;
  fseek(f, 0, SEEK_END);
  long tam = ftell(f);
  fseek(f, 0, SEEK_SET);
  uint8_t *datos = tam > 16 ? malloc(tam) : NULL;
  if (!datos || fread(datos, 1, tam, f) != (size_t)tam || memcmp(datos, "NEOF", 4)) {
    free(datos);
    fclose(f);
    return NULL;
  }
  fclose(f);
  free(libre->datos);
  snprintf(libre->ruta, sizeof libre->ruta, "%s", ruta);
  libre->datos = datos;
  libre->tam = tam;
  libre->uso = ++reloj_uso;
  return libre;
}

void diseno_precargar(const char *ruta) { traer(ruta); }

// LZ4 en bloque (el formato de lz4.block de Python, sin el tamaño al inicio).
static int descomprimir(const uint8_t *ip, size_t n, uint8_t *op, size_t cap) {
  const uint8_t *fin = ip + n;
  uint8_t *inicio = op, *op_fin = op + cap;
  while (ip < fin) {
    unsigned token = *ip++;
    size_t literales = token >> 4;
    if (literales == 15) {
      unsigned b;
      do { if (ip >= fin) return -1; b = *ip++; literales += b; } while (b == 255);
    }
    if (ip + literales > fin || op + literales > op_fin) return -1;
    memcpy(op, ip, literales);
    op += literales;
    ip += literales;
    if (ip >= fin) break;  // la última secuencia solo trae literales
    if (ip + 2 > fin) return -1;
    size_t distancia = ip[0] | (size_t)ip[1] << 8;
    ip += 2;
    size_t largo = token & 15;
    if (largo == 15) {
      unsigned b;
      do { if (ip >= fin) return -1; b = *ip++; largo += b; } while (b == 255);
    }
    largo += 4;
    const uint8_t *desde = op - distancia;
    if (distancia == 0 || desde < inicio || op + largo > op_fin) return -1;
    if (distancia >= largo) {
      memcpy(op, desde, largo);
      op += largo;
    } else {
      while (largo--) *op++ = *desde++;  // se encima con lo que va escribiendo: byte por byte
    }
  }
  return (int)(op - inicio);
}

int diseno_pintar(const char *ruta) {
  Pieza *p = traer(ruta);
  if (!p) return -1;
  const uint8_t *c = p->datos;
  int x = c[4] | c[5] << 8, y = c[6] | c[7] << 8, w = c[8] | c[9] << 8, h = c[10] | c[11] << 8;
  size_t largo = c[12] | c[13] << 8 | (size_t)c[14] << 16 | (size_t)c[15] << 24;
  if (16 + largo > p->tam || x + w > pantalla.ancho || y + h > pantalla.alto) return -1;
  size_t bytes = (size_t)w * h * 2;
  // Una pantalla completa con el paso de la pantalla va directo al lienzo; una zona, por un búfer.
  if (x == 0 && w == pantalla.ancho && pantalla.paso == w * 2) {
    return descomprimir(c + 16, largo, pantalla.lienzo + (size_t)y * pantalla.paso, bytes) == (int)bytes ? 0 : -1;
  }
  uint8_t *bufer = malloc(bytes);
  if (!bufer) return -1;
  int r = descomprimir(c + 16, largo, bufer, bytes) == (int)bytes ? 0 : -1;
  if (!r)
    for (int j = 0; j < h; j++)
      memcpy(pantalla.lienzo + (size_t)(y + j) * pantalla.paso + (size_t)x * 2, bufer + (size_t)j * w * 2, (size_t)w * 2);
  free(bufer);
  return r;
}
