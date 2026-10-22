// Imágenes de los juegos (PNG, JPG o las .img RGB565 de neo/medios), leídas en el aparato con
// stb_image y ajustadas al tamaño en que se muestran. Lo ajustado se guarda en memoria y en
// neo/cache/, para no volver a leer el PNG la siguiente vez.
#pragma once
#include <stdint.h>

typedef struct {
  uint16_t *px;  // RGB565
  int w, h;
} Img;

enum { CUBRIR, CONTENER };  // CUBRIR llena w×h y recorta lo que sobra; CONTENER cabe entera en w×h

void imagenes_iniciar(const char *carpeta_cache, void (*registrar)(const char *formato, ...));
// NULL si el archivo no existe o no se pudo leer (y así queda anotado: no se reintenta).
const Img *imagen(const char *ruta, int w, int h, int modo);
// Solo si ya está en memoria o en neo/cache/: para pintar sin esperar mientras el carrusel se mueve.
const Img *imagen_lista(const char *ruta, int w, int h, int modo);
// Cualquier tamaño ya en memoria de esa imagen (para escalarla mientras llega la exacta).
const Img *imagen_parecida(const char *ruta);
