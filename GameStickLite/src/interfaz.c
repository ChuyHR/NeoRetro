#include "interfaz.h"

#include <math.h>
#include <stdlib.h>
#include <string.h>

#include "dibujo.h"
#include "imagenes.h"
#include "pantalla.h"
#include "recursos.h"
#include "texto.h"

#define ANCHO 1280
#define ALTO 720

// Colores del diseño.
#define FONDO RGB565(0x050914)
#define TEXTO RGB565(0xF5F7FF)
#define ROSA RGB565(0xFF168C)
#define CIAN RGB565(0x00BFFF)
#define AZUL RGB565(0x1E90FF)
#define GRIS RGB565(0x8997B8)
#define CLARO RGB565(0xC9D2E8)
#define PANEL RGB565(0x0B1324)
#define DORADO RGB565(0xFFD166)

static uint16_t *fondo, *fondo_deco;  // lo que no cambia, con y sin la decoración de los costados
static void (*anotar)(const char *, ...);

static const Icono *icono(const char *nombre, int tam) {
  for (int i = 0; i < N_ICONOS; i++)
    if (!strcmp(ICONOS[i].nombre, nombre) && ICONOS[i].w == tam) return &ICONOS[i];
  return NULL;
}

static void pintar_icono(const char *nombre, int tam, int x, int y, uint16_t c, int alfa) {
  const Icono *i = icono(nombre, tam);
  if (i) d_mascara(i->alfa, i->w, i->h, x, y, c, alfa);
}

static const ImagenFija *imagen_fija(const char *nombre, int tam) {
  for (int i = 0; i < N_IMAGENES_FIJAS; i++)
    if (!strcmp(IMAGENES_FIJAS[i].nombre, nombre) && IMAGENES_FIJAS[i].w == tam) return &IMAGENES_FIJAS[i];
  return NULL;
}

// ---- Piezas fijas --------------------------------------------------------------------------------

// «NEO ARCADE» con «PLAY AGAIN» entre líneas dobles y el joystick a la izquierda, centrado en cx.
static void logotipo(int cx, int y, int joy, int titulo, int lema) {
  const ImagenFija *j = imagen_fija("joystick", joy);
  int espacio = tx_ancho(FUENTE_BUNGEE, titulo, 0, " ");
  int w_neo = tx_ancho(FUENTE_BUNGEE, titulo, 0, "NEO"), w_arcade = tx_ancho(FUENTE_BUNGEE, titulo, 0, "ARCADE");
  int bloque = w_neo + espacio + w_arcade, total = joy + titulo / 3 + bloque;
  int x = cx - total / 2, bx = x + joy + titulo / 3;
  int alto_titulo = tx_alto(FUENTE_BUNGEE, titulo), alto_lema = tx_alto(FUENTE_PIXELIFY, lema);
  int ly = y + alto_titulo * 86 / 100;
  if (j) d_imagen_alfa(j->px, j->alfa, j->w, j->h, x, y + (ly + alto_lema - y - joy) / 2);
  tx_dibujar(FUENTE_BUNGEE, titulo, 0, bx, y, TEXTO, 255, "NEO");
  tx_dibujar(FUENTE_BUNGEE, titulo, 0, bx + w_neo + espacio, y, ROSA, 255, "ARCADE");
  int w_lema = tx_ancho(FUENTE_PIXELIFY, lema, lema / 10, "PLAY AGAIN");
  int lx = bx + (bloque - w_lema) / 2;
  tx_dibujar(FUENTE_PIXELIFY, lema, lema / 10, lx, ly, CIAN, 255, "PLAY AGAIN");
  int grosor = lema / 7 > 2 ? lema / 7 : 2, medio = ly + alto_lema / 2;
  for (int k = -1; k <= 1; k += 2) {
    int yy = medio + k * grosor - grosor / 2 - (k > 0 ? 0 : grosor / 2);
    d_rect(bx, yy, lx - bx - lema / 2, grosor, CIAN, 255);
    d_rect(lx + w_lema + lema / 2, yy, bx + bloque - (lx + w_lema + lema / 2), grosor, CIAN, 255);
  }
}

static void cuadricula(void) {
  d_rect(0, 0, ANCHO, ALTO, FONDO, 255);
  uint16_t c = RGB565(0x0D1733);
  for (int x = 0; x < ANCHO; x += 48) d_rect(x, 0, 1, ALTO, c, 110);
  for (int y = 0; y < ALTO; y += 48) d_rect(0, y, ANCHO, 1, c, 110);
}

// Un atardecer synthwave para los costados vacíos del carrusel: sol con franjas, ciudad y piso.
static void atardecer(int cx) {
  int cy = 300, r = 88, piso = 404;
  for (int y = cy - r; y < piso; y++) {
    int dy = y - cy;
    if (dy * dy > r * r) continue;
    if (dy > 0) {  // franjas cada vez más anchas hacia abajo
      int periodo = 14, hueco = 2 + dy * 6 / r;
      if ((dy % periodo) < hueco) continue;
    }
    int ancho = (int)sqrtf((float)(r * r - dy * dy));
    int t = (y - (cy - r)) * 255 / (2 * r);
    uint16_t c = mezclar(RGB565(0xFF168C), RGB565(0xB012C8), t);
    d_rect(cx - ancho, y, 2 * ancho, 1, c, 255);
  }
  d_halo(cx - r + 20, cy - r + 20, 2 * r - 40, 2 * r - 40, r - 20, 30, ROSA, 70);
  // Ciudad: edificios fijos (la misma silueta en cada encendido).
  static const int edificios[][2] = {{-210, 60}, {-188, 92}, {-160, 48}, {-140, 120}, {-112, 70}, {-90, 150},
                                     {-62, 84}, {-40, 56}, {-18, 104}, {6, 66}, {30, 130}, {58, 78},
                                     {80, 52}, {104, 112}, {130, 64}, {152, 96}, {178, 58}, {200, 84}};
  for (unsigned k = 0; k < sizeof edificios / sizeof *edificios; k++) {
    int bx = cx + edificios[k][0], h = edificios[k][1], w = 20 + (k * 7) % 9;
    d_rect(bx, piso - h, w, h, RGB565(0x141A44), 255);
    d_rect(bx, piso - h, w, 2, RGB565(0x2A2F6E), 255);
    for (int wy = piso - h + 8; wy < piso - 6; wy += 10)
      for (int wx = bx + 4; wx < bx + w - 4; wx += 7)
        if (((wx * 13 + wy * 7) >> 3) % 5 == 0) d_rect(wx, wy, 3, 4, RGB565(0xFF8AD8), 120);
  }
  // Piso: líneas que se juntan en el horizonte.
  uint16_t linea = RGB565(0x8A2BE2);
  d_rect(cx - 240, piso, 480, 2, ROSA, 200);
  for (int k = 1; k < 7; k++) {
    int y = piso + k * k * 2 + k * 3;
    if (y > 470) break;
    d_rect(cx - 240, y, 480, 1, linea, 170 - k * 18);
  }
  for (int k = -6; k <= 6; k++) {
    for (int y = piso; y < 470; y++) {
      int x = cx + k * 12 + (k * 40 * (y - piso)) / 66;
      if (x >= cx - 240 && x < cx + 240) d_rect(x, y, 1, 1, linea, 150);
    }
  }
}

// Posiciones de la barra de sistemas, calculadas una vez.
static int pestana_x[MAX_VISTAS], pestana_w[MAX_VISTAS], letra_barra = 17;
#define BARRA_X 24
#define BARRA_Y 90
#define BARRA_W 1232
#define BARRA_H 58
#define PESTANA_Y 97
#define PESTANA_H 44

static void medir_barra(void) {
  for (letra_barra = 17; letra_barra > 12; letra_barra--) {
    int suma = 0;
    for (int v = 0; v < n_vistas; v++) {
      pestana_w[v] = 26 + 8 + tx_ancho(FUENTE_PIXELIFY, letra_barra, 1, vistas[v].nombre) + 28;
      suma += pestana_w[v];
    }
    int libre = BARRA_W - 24 - suma;
    if (libre < 0 && letra_barra > 13) continue;
    int hueco = n_vistas > 1 ? libre / (n_vistas - 1) : 0;
    if (hueco > 40) hueco = 40;
    int x = BARRA_X + (BARRA_W - (suma + hueco * (n_vistas - 1))) / 2;
    for (int v = 0; v < n_vistas; v++) {
      pestana_x[v] = x;
      x += pestana_w[v] + hueco;
    }
    return;
  }
}

static void contenido_pestana(int v, uint16_t c) {
  int x = pestana_x[v] + 14, y = PESTANA_Y + (PESTANA_H - 26) / 2;
  pintar_icono(vistas[v].icono, 26, x, y, c, 255);
  int alto = tx_alto(FUENTE_PIXELIFY, letra_barra);
  tx_dibujar(FUENTE_PIXELIFY, letra_barra, 1, x + 34, PESTANA_Y + (PESTANA_H - alto) / 2, c, 255, vistas[v].nombre);
}

#define FICHA_X 32
#define FICHA_Y 476
#define FICHA_W 1216
#define FICHA_H 182

static int tecla(int x, int y, const char *t) {  // una tecla con nombre, como LB o SELECT
  int w = tx_ancho(FUENTE_PIXELIFY, 14, 1, t) + 16;
  d_borde(x, y, w, 26, 6, 2, GRIS, 255);
  tx_dibujar(FUENTE_PIXELIFY, 14, 1, x + 8, y + (26 - tx_alto(FUENTE_PIXELIFY, 14)) / 2, TEXTO, 255, t);
  return x + w;
}

static int boton_redondo(int x, int y, uint16_t c, const char *t) {
  d_circulo(x + 13, y + 13, 13, c, 255);
  int w = tx_ancho(FUENTE_PIXELIFY, 17, 0, t);
  tx_dibujar(FUENTE_PIXELIFY, 17, 0, x + 13 - w / 2, y + (26 - tx_alto(FUENTE_PIXELIFY, 17)) / 2, FONDO, 255, t);
  return x + 26;
}

static void pie(void) {
  // Cinco grupos repartidos a lo ancho: el dibujo de cada uno se mide primero.
  const char *textos[] = {"NAVEGAR", "JUGAR", "FAVORITO", "SISTEMA", "SALIR"};
  int anchos[5], indicador[5] = {30, 26, 26, 0, 0};
  indicador[3] = tx_ancho(FUENTE_PIXELIFY, 14, 1, "LB") + 16 + 6 + tx_ancho(FUENTE_PIXELIFY, 14, 1, "RB") + 16;
  indicador[4] = tx_ancho(FUENTE_PIXELIFY, 14, 1, "SELECT") + 16 + 6 + tx_ancho(FUENTE_PIXELIFY, 14, 1, "START") + 16;
  int suma = 0;
  for (int k = 0; k < 5; k++) suma += anchos[k] = indicador[k] + 12 + tx_ancho(FUENTE_PIXELIFY, 18, 1, textos[k]);
  int hueco = (1200 - suma) / 4, x = 40, y = 676, alto = tx_alto(FUENTE_PIXELIFY, 18);
  for (int k = 0; k < 5; k++) {
    int ix = x;
    if (k == 0) pintar_icono("cruceta", 30, ix, y - 2, CLARO, 255);
    if (k == 1) boton_redondo(ix, y, ROSA, "A");
    if (k == 2) boton_redondo(ix, y, CIAN, "X");
    if (k == 3) tecla(tecla(ix, y, "LB") + 6, y, "RB");
    if (k == 4) tecla(tecla(ix, y, "SELECT") + 6, y, "START");
    tx_dibujar(FUENTE_PIXELIFY, 18, 1, ix + indicador[k] + 12, y + (26 - alto) / 2, CLARO, 255, textos[k]);
    x += anchos[k] + hueco;
  }
}

static void dibujar_fijo(int deco) {
  cuadricula();
  if (deco) {
    atardecer(170);
    atardecer(1110);
  }
  logotipo(ANCHO / 2, 8, 64, 46, 21);
  d_halo(BARRA_X, BARRA_Y, BARRA_W, BARRA_H, 16, 12, AZUL, 120);
  d_redondeado(BARRA_X, BARRA_Y, BARRA_W, BARRA_H, 16, PANEL, 235);
  d_borde(BARRA_X, BARRA_Y, BARRA_W, BARRA_H, 16, 2, AZUL, 255);
  for (int v = 0; v < n_vistas; v++) contenido_pestana(v, CLARO);
  d_halo(FICHA_X, FICHA_Y, FICHA_W, FICHA_H, 14, 12, AZUL, 110);
  d_redondeado(FICHA_X, FICHA_Y, FICHA_W, FICHA_H, 14, PANEL, 240);
  d_borde(FICHA_X, FICHA_Y, FICHA_W, FICHA_H, 14, 2, AZUL, 255);
  pie();
}

int interfaz_iniciar(void (*registrar)(const char *, ...)) {
  anotar = registrar;
  if (pantalla.ancho != ANCHO || pantalla.alto != ALTO || pantalla.bpp != 16 || pantalla.var.red.offset != 11) {
    if (anotar) anotar("interfaz: la pantalla no es de 1280×720 en RGB565");
    return -1;
  }
  if (tx_iniciar() < 0) {
    if (anotar) anotar("interfaz: no se pudieron abrir las fuentes");
    return -1;
  }
  medir_barra();
  fondo = malloc((size_t)ANCHO * ALTO * 2);
  fondo_deco = malloc((size_t)ANCHO * ALTO * 2);
  if (!fondo || !fondo_deco) return -1;
  lienzo_usar(fondo, ANCHO, ALTO, ANCHO);
  dibujar_fijo(0);
  lienzo_usar(fondo_deco, ANCHO, ALTO, ANCHO);
  dibujar_fijo(1);
  lienzo_usar((uint16_t *)pantalla.lienzo, ANCHO, ALTO, pantalla.paso / 2);
  return 0;
}

// ---- Carrusel ------------------------------------------------------------------------------------

typedef struct {
  float cx, y, w, arte, banda, alfa, izq, der;  // izq y der: alto relativo de cada lado (tarjeta girada)
} Lugar;

// Lugares por desplazamiento respecto al juego elegido, de -4 a 4. Los de ±4 son transparentes: sirven
// para que las tarjetas entren y salgan deslizándose.
static const Lugar LUGARES[9] = {
  {640 - 790, 214, 128, 150, 26, 0, 0.78f, 1},
  {640 - 640, 214, 128, 150, 26, 140, 0.78f, 1},
  {640 - 476, 210, 192, 144, 32, 255, 1, 1},
  {640 - 262, 210, 192, 144, 32, 255, 1, 1},
  {640, 166, 288, 216, 40, 255, 1, 1},
  {640 + 262, 210, 192, 144, 32, 255, 1, 1},
  {640 + 476, 210, 192, 144, 32, 255, 1, 1},
  {640 + 640, 214, 128, 150, 26, 140, 1, 0.78f},
  {640 + 790, 214, 128, 150, 26, 0, 1, 0.78f},
};

static Lugar lugar_en(float p) {
  if (p <= -4) return LUGARES[0];
  if (p >= 4) return LUGARES[8];
  int k = (int)floorf(p);
  float t = p - k;
  const Lugar *a = &LUGARES[k + 4], *b = &LUGARES[k + 5];
  return (Lugar){a->cx + (b->cx - a->cx) * t, a->y + (b->y - a->y) * t, a->w + (b->w - a->w) * t,
                 a->arte + (b->arte - a->arte) * t, a->banda + (b->banda - a->banda) * t,
                 a->alfa + (b->alfa - a->alfa) * t, a->izq + (b->izq - a->izq) * t, a->der + (b->der - a->der) * t};
}

// Medidas de la imagen dentro de la tarjeta en un lugar entero (con las que se guarda ya ajustada).
static void medida_arte(int k, int *w, int *h) {
  const Lugar *l = &LUGARES[k + 4];
  *w = (int)l->w - 6;
  *h = (int)l->arte - 3;
}

// Portada cuando el juego no trae imagen: el color de su sistema y el título.
static void portada_generada(Juego *j, int x, int y, int w, int h, int alfa) {
  uint32_t c = SISTEMAS[j->sistema].color;
  d_degradado(x, y, w, h, RGB565(c), mezclar(RGB565(c), FONDO, 170), alfa);
  int tam = w > 200 ? 26 : w > 150 ? 18 : 13;
  int renglon = tam + tam / 3;
  recortar(x, y, w, h);
  tx_parrafo(FUENTE_BUNGEE, tam, x + 10, y + h / 2 - renglon, w - 20, renglon, 3, TEXTO, j->titulo);
  sin_recorte();
}

static void tarjeta(Juego *j, float p, int quieto) {
  Lugar l = lugar_en(p);
  if (l.alfa < 4) return;
  int w = (int)(l.w + .5f), arte = (int)(l.arte + .5f), banda = (int)(l.banda + .5f), alto = arte + banda;
  int x = (int)(l.cx - l.w / 2 + .5f), y = (int)(l.y + .5f), alfa = (int)l.alfa;
  float cerca = 1 - (fabsf(p) < 1 ? fabsf(p) : 1);
  int centro = cerca > 0.5f;
  int girada = l.izq < 0.99f || l.der < 0.99f;

  if (cerca > 0.02f) d_halo(x, y, w, alto, 12, 16, ROSA, (int)(170 * cerca));
  else d_halo(x, y, w, alto, 12, 8, AZUL, alfa * 50 / 255);
  d_redondeado(x, y, w, alto, 12, PANEL, alfa);

  // La imagen ya ajustada al lugar entero más cercano; entre dos lugares se escala la que haya.
  int k = (int)lroundf(p), aw, ah;
  if (k < -3) k = -3;
  if (k > 3) k = 3;
  medida_arte(k, &aw, &ah);
  const char *ruta = arte_de(j);
  const Img *img = ruta ? (quieto ? imagen(ruta, aw, ah, CUBRIR) : imagen_lista(ruta, aw, ah, CUBRIR)) : NULL;
  if (!img && ruta) img = imagen_parecida(ruta);
  for (int otro = 0; !img && ruta && otro <= 3; otro += 3) {  // la del centro o la de la orilla, escalada
    int ow, oh;
    medida_arte(otro, &ow, &oh);
    img = imagen_lista(ruta, ow, oh, CUBRIR);
  }
  int ix = x + 3, iy = y + 3, iw = w - 6, ih = arte - 3;
  if (img && girada) {
    int ai = (int)(ih * l.izq), ad = (int)(ih * l.der);
    d_imagen_trapecio(img->px, img->w, img->h, ix, iy, iw, ai, ad, alfa);
  } else if (img) {
    d_imagen_escalada(img->px, img->w, img->h, ix, iy, iw, ih, alfa);
  } else {
    portada_generada(j, ix, iy, iw, ih, alfa);
  }

  // Franja con el nombre del sistema.
  d_rect(x + 3, y + arte, w - 6, banda - 3, PANEL, alfa);
  int tam = centro ? 22 : w > 150 ? 17 : 13;
  const char *et = SISTEMAS[j->sistema].etiqueta;
  int tw = tx_ancho(FUENTE_PIXELIFY, tam, 1, et), th = tx_alto(FUENTE_PIXELIFY, tam);
  tx_dibujar(FUENTE_PIXELIFY, tam, 1, x + (w - tw) / 2, y + arte + (banda - 3 - th) / 2, centro ? ROSA : TEXTO, alfa, et);
  d_borde(x, y, w, alto, 12, centro ? 3 : 2, centro ? ROSA : AZUL, alfa);
}

static void carrusel(const EstadoUI *e) {
  Vista *v = &vistas[e->vista];
  if (!v->n) {
    const char *t = v->tipo == VISTA_FAVORITOS ? "Marca juegos con X para verlos aquí."
                  : v->tipo == VISTA_RECIENTES ? "Aquí aparecen los juegos que abras."
                                               : "No hay juegos en esta vista.";
    int w = tx_ancho(FUENTE_PIXELIFY, 24, 1, t);
    tx_dibujar(FUENTE_PIXELIFY, 24, 1, (ANCHO - w) / 2, 290, CLARO, 255, t);
    return;
  }
  // De la orilla al centro, para que la del centro quede encima.
  int quieto = fabsf(e->corrimiento) < 0.001f;
  for (int d = 5; d >= 0; d--)
    for (int s = -1; s <= 1; s += 2) {
      if (!d && s > 0) continue;
      int i = v->elegido + d * s;
      if (i < 0 || i >= v->n) continue;
      tarjeta(v->juegos[i], d * s + e->corrimiento, quieto);
    }
  if (v->n > 1) {
    pintar_icono("flecha-izq", 40, 34, 282, CIAN, v->elegido > 0 ? 255 : 70);
    pintar_icono("flecha-der", 40, ANCHO - 74, 282, CIAN, v->elegido < v->n - 1 ? 255 : 70);
  }
}

// ---- Ficha y botones -----------------------------------------------------------------------------

static void boton(int y, int con_foco, const char *icono_nombre, uint16_t icono_color, const char *t) {
  int x = 896, w = 320, h = 56;
  if (con_foco) {
    d_halo(x, y, w, h, 12, 14, ROSA, 170);
    d_redondeado(x, y, w, h, 12, RGB565(0x3A0B33), 255);
    d_borde(x, y, w, h, 12, 3, ROSA, 255);
  } else {
    d_halo(x, y, w, h, 12, 8, AZUL, 70);
    d_redondeado(x, y, w, h, 12, RGB565(0x0A1120), 255);
    d_borde(x, y, w, h, 12, 2, AZUL, 255);
  }
  pintar_icono(icono_nombre, 28, x + 40, y + (h - 28) / 2, icono_color, 255);
  int tw = tx_ancho(FUENTE_PIXELIFY, 24, 2, t);
  tx_dibujar(FUENTE_PIXELIFY, 24, 2, x + 84 + (w - 84 - 24 - tw) / 2, y + (h - tx_alto(FUENTE_PIXELIFY, 24)) / 2, TEXTO, 255, t);
}

static void ficha(const EstadoUI *e) {
  Vista *v = &vistas[e->vista];
  if (!v->n) return;
  Juego *j = v->juegos[v->elegido];
  int cx = 52, cy = FICHA_Y + 16, cw = 200, ch = 150;
  const Img *img = captura_de(j) ? imagen(captura_de(j), cw, ch, CUBRIR) : NULL;
  if (img) d_imagen(img->px, img->w, img->h, cx + (cw - img->w) / 2, cy + (ch - img->h) / 2, 255);
  else portada_generada(j, cx, cy, cw, ch, 255);
  d_esquinas(cx, cy, cw, ch, 8, PANEL);
  d_borde(cx, cy, cw, ch, 8, 1, AZUL, 110);

  int tx = 280, ancho = 580;
  tx_recortado(FUENTE_BUNGEE, 28, 1, tx, FICHA_Y + 16, ancho, TEXTO, j->titulo);
  tx_recortado(FUENTE_PIXELIFY, 19, 0, tx, FICHA_Y + 58, ancho, CIAN, j->meta ? j->meta : SISTEMAS[j->sistema].barra);
  tx_parrafo(FUENTE_MONO, 18, tx, FICHA_Y + 92, ancho, 24, 3, CLARO,
             j->descripcion ? j->descripcion : "Sin descripción.");

  boton(FICHA_Y + 18, e->foco == 0, "jugar", TEXTO, "JUGAR");
  boton(FICHA_Y + 102, e->foco == 1, j->favorito ? "estrella" : "estrella-borde", j->favorito ? DORADO : TEXTO, "FAVORITO");
}

static void pestana_activa(int v) {
  int x = pestana_x[v], w = pestana_w[v];
  d_halo(x, PESTANA_Y, w, PESTANA_H, 12, 12, ROSA, 170);
  d_redondeado(x, PESTANA_Y, w, PESTANA_H, 12, RGB565(0x2A0B2E), 255);
  d_borde(x, PESTANA_Y, w, PESTANA_H, 12, 2, ROSA, 255);
  contenido_pestana(v, TEXTO);
}

static void aviso(const char *t) {
  int w = tx_ancho(FUENTE_PIXELIFY, 20, 1, t) + 60, x = (ANCHO - w) / 2, y = 666, h = 46;
  d_halo(x, y, w, h, 14, 12, ROSA, 150);
  d_redondeado(x, y, w, h, 14, PANEL, 255);
  d_borde(x, y, w, h, 14, 2, ROSA, 255);
  tx_dibujar(FUENTE_PIXELIFY, 20, 1, x + 30, y + (h - tx_alto(FUENTE_PIXELIFY, 20)) / 2, TEXTO, 255, t);
}

static void copiar_region(const uint16_t *origen, int x, int y, int w, int h) {
  for (int j = y; j < y + h; j++)
    memcpy((uint16_t *)pantalla.lienzo + (size_t)j * ANCHO + x, origen + (size_t)j * ANCHO + x, (size_t)w * 2);
}

void interfaz_dibujar(const EstadoUI *e) {
  Vista *v = &vistas[e->vista];
  // Con pocos juegos los costados quedan vacíos: ahí va el atardecer, como en el diseño. También en el
  // lado que no tiene tarjetas, al principio o al final de la lista.
  memcpy(pantalla.lienzo, v->n < 5 ? fondo_deco : fondo, (size_t)ANCHO * ALTO * 2);
  if (v->n >= 5 && v->elegido == 0 && e->corrimiento <= 0) copiar_region(fondo_deco, 0, 150, 480, 322);
  if (v->n >= 5 && v->elegido == v->n - 1 && e->corrimiento >= 0) copiar_region(fondo_deco, 800, 150, 480, 322);
  lienzo_usar((uint16_t *)pantalla.lienzo, ANCHO, ALTO, pantalla.paso / 2);
  pestana_activa(e->vista);
  carrusel(e);
  ficha(e);
  if (e->aviso) aviso(e->aviso);
  mostrar();
}

int interfaz_precargar(const EstadoUI *e) {
  Vista *v = &vistas[e->vista];
  for (int d = 0; d <= 6; d++)
    for (int s = 1; s >= -1; s -= 2) {
      int i = v->elegido + d * s;
      if (i < 0 || i >= v->n) continue;
      const char *ruta = arte_de(v->juegos[i]);
      if (!ruta) continue;
      int k = d * s > 3 ? 3 : d * s < -3 ? -3 : d * s, w, h;
      // Las de más lejos se preparan en el tamaño de los lados, que es donde aparecerán primero.
      if (d > 3) k = s > 0 ? 2 : -2;
      medida_arte(k, &w, &h);
      if (!imagen_lista(ruta, w, h, CUBRIR) && imagen(ruta, w, h, CUBRIR)) return 1;
      if (d <= 1) {  // la vecina inmediata también en el tamaño del centro
        medida_arte(0, &w, &h);
        if (!imagen_lista(ruta, w, h, CUBRIR) && imagen(ruta, w, h, CUBRIR)) return 1;
      }
    }
  return 0;
}

void interfaz_portada(void) {
  lienzo_usar((uint16_t *)pantalla.lienzo, ANCHO, ALTO, pantalla.paso / 2);
  cuadricula();
  logotipo(ANCHO / 2, 250, 150, 104, 50);
  mostrar();
}
