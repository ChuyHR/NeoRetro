// neo-menu: menú de juegos de Neo Arcade Lite para el Game Stick, al estilo de Neo Arcade. Pestañas de
// sistemas (más Favoritos y Recientes), la lista a la izquierda y la carátula con su ficha a la
// derecha. Abre cada juego con su emulador (neo-retro-<sistema>, junto a este programa) y al terminar
// vuelve aquí.
//
// Botones (con el mapeo del tablero del usuario, ver mandos.c; entre paréntesis, el de Neo Arcade):
//   arriba/abajo juego · izquierda/derecha o LB/RB sistema · LT/RT letra anterior/siguiente
//   A jugar · X favorito · Select (moneda) Favoritos y Recientes
//   (Start no abre juegos: con Select + Start para salir, un Start un instante antes abriría uno.)
//   Select + Start mantenidos 2 s: salir al menú de fábrica
// Sin ningún control conectado sale al menú de fábrica a los 30 s. No sale por inactividad.
//
// Medios: neo/medios/<carpeta>/<juego>.img (carátula, ver scripts/preparar-medios.py) y .txt (ficha).
// Favoritos y recientes: neo/datos-usuario.txt.
//
// En la laptop (QEMU): NEO_SIMULAR=1 dibuja un cuadro y lo guarda en NEO_CAPTURA; NEO_ROMS y NEO_NEO
// cambian las carpetas de juegos y de neo/.
// Uso: neo-menu [registro]
#include <dirent.h>
#include <limits.h>
#include <stdarg.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

#include "mandos.h"
#include "pantalla.h"

#define MAX_JUEGOS 2000
#define MAX_RECIENTES 20
#define SALIR_SIN_MANDOS_MS 30000
#define SALIR_MANTENIENDO_MS 2000

typedef struct {
  char *archivo;  // nombre del archivo en roms/<carpeta>/
  int sistema;    // índice en sistemas[] del sistema real (en Favoritos y Recientes no es el propio)
} Juego;

typedef struct {
  const char *carpeta, *nombre, *corto, *emulador, *extensiones;
  Juego juegos[MAX_JUEGOS];
  int n, elegido, primero;
} Sistema;

enum { FAVORITOS, RECIENTES, PRIMER_SISTEMA };
static Sistema sistemas[] = {
  {"", "FAVORITOS", "FAVORITOS", "", ""},
  {"", "RECIENTES", "RECIENTES", "", ""},
  {"fc", "NES", "NES", "neo-retro-nes", ".nes"},
  {"sfc", "SUPER NINTENDO", "SNES", "neo-retro-snes", ".sfc.smc"},
  {"md", "MEGA DRIVE", "MD", "neo-retro-md", ".md.gen.bin.smd"},
  {"gb", "GAME BOY", "GB", "neo-retro-gb", ".gb"},
  {"gbc", "GAME BOY COLOR", "GBC", "neo-retro-gb", ".gbc.gb"},
  {"gba", "GAME BOY ADVANCE", "GBA", "neo-retro-gba", ".gba"},
};
#define N_SISTEMAS (int)(sizeof sistemas / sizeof *sistemas)

static FILE *registro;
static char carpeta_programas[PATH_MAX], carpeta_neo[PATH_MAX];
static const char *carpeta_roms = "/mnt/roms";
static int actual = PRIMER_SISTEMA;
static char aviso[160];
static long aviso_hasta;

// Lo que se guarda: favoritos y recientes, como «carpeta/archivo».
static char *favoritos[MAX_JUEGOS];
static int n_favoritos;
static char *recientes[MAX_RECIENTES];
static int n_recientes;

static long ahora_ms(void) {
  struct timespec t;
  clock_gettime(CLOCK_MONOTONIC, &t);
  return t.tv_sec * 1000L + t.tv_nsec / 1000000L;
}

static void anotar(const char *formato, ...) {
  if (!registro) return;
  va_list args;
  va_start(args, formato);
  vfprintf(registro, formato, args);
  fputc('\n', registro);
  va_end(args);
  fflush(registro);
}

static void avisar(const char *texto_aviso) {
  snprintf(aviso, sizeof aviso, "%s", texto_aviso);
  aviso_hasta = ahora_ms() + 3000;
}

// ---- Biblioteca -----------------------------------------------------------------------------------

static int comparar(const void *a, const void *b) {
  return strcasecmp(((const Juego *)a)->archivo, ((const Juego *)b)->archivo);
}

static int extension_valida(const char *nombre, const char *extensiones) {
  const char *punto = strrchr(nombre, '.');
  if (!punto || punto == nombre) return 0;
  // extensiones viene como ".sfc.smc": se busca «.ext» seguida de otro punto o del final.
  size_t n = strlen(punto);
  for (const char *p = extensiones; (p = strchr(p, '.')); p++)
    if (!strncasecmp(p, punto, n) && (p[n] == '.' || p[n] == 0)) return 1;
  return 0;
}

static void leer_biblioteca(void) {
  for (int s = PRIMER_SISTEMA; s < N_SISTEMAS; s++) {
    Sistema *si = &sistemas[s];
    char ruta[PATH_MAX];
    snprintf(ruta, sizeof ruta, "%s/%s", carpeta_roms, si->carpeta);
    DIR *d = opendir(ruta);
    if (!d) continue;
    struct dirent *e;
    while ((e = readdir(d)) && si->n < MAX_JUEGOS)
      if (e->d_name[0] != '.' && extension_valida(e->d_name, si->extensiones))
        si->juegos[si->n++] = (Juego){strdup(e->d_name), s};
    closedir(d);
    qsort(si->juegos, si->n, sizeof *si->juegos, comparar);
    char emulador[PATH_MAX];
    snprintf(emulador, sizeof emulador, "%s/%s", carpeta_programas, si->emulador);
    anotar("biblioteca: %s, %d juegos%s", si->nombre, si->n, access(emulador, F_OK) ? " (sin emulador)" : "");
  }
}

static void clave_de(const Juego *j, char *clave, size_t tam) {
  snprintf(clave, tam, "%s/%s", sistemas[j->sistema].carpeta, j->archivo);
}

// Busca «carpeta/archivo» en la biblioteca. Devuelve 0 si ya no está en la tarjeta.
static int buscar_juego(const char *clave, Juego *j) {
  for (int s = PRIMER_SISTEMA; s < N_SISTEMAS; s++) {
    size_t n = strlen(sistemas[s].carpeta);
    if (strncmp(clave, sistemas[s].carpeta, n) || clave[n] != '/') continue;
    for (int i = 0; i < sistemas[s].n; i++)
      if (!strcmp(sistemas[s].juegos[i].archivo, clave + n + 1)) {
        *j = sistemas[s].juegos[i];
        return 1;
      }
  }
  return 0;
}

// Favoritos y Recientes se arman con lo que sigue en la tarjeta.
static void armar_listas(void) {
  Sistema *f = &sistemas[FAVORITOS], *r = &sistemas[RECIENTES];
  f->n = r->n = 0;
  for (int i = 0; i < n_favoritos; i++)
    if (buscar_juego(favoritos[i], &f->juegos[f->n])) f->n++;
  qsort(f->juegos, f->n, sizeof *f->juegos, comparar);
  for (int i = 0; i < n_recientes; i++)
    if (buscar_juego(recientes[i], &r->juegos[r->n])) r->n++;
  if (f->elegido >= f->n) f->elegido = f->n ? f->n - 1 : 0;
  if (r->elegido >= r->n) r->elegido = r->n ? r->n - 1 : 0;
}

static void leer_datos_usuario(void) {
  char ruta[PATH_MAX], linea[PATH_MAX + 32];
  snprintf(ruta, sizeof ruta, "%s/datos-usuario.txt", carpeta_neo);
  FILE *f = fopen(ruta, "r");
  if (!f) return;
  while (fgets(linea, sizeof linea, f)) {
    linea[strcspn(linea, "\r\n")] = 0;
    if (!strncmp(linea, "favorito ", 9) && n_favoritos < MAX_JUEGOS) favoritos[n_favoritos++] = strdup(linea + 9);
    if (!strncmp(linea, "reciente ", 9) && n_recientes < MAX_RECIENTES) recientes[n_recientes++] = strdup(linea + 9);
  }
  fclose(f);
}

static void guardar_datos_usuario(void) {
  char ruta[PATH_MAX], temporal[PATH_MAX + 8];
  snprintf(ruta, sizeof ruta, "%s/datos-usuario.txt", carpeta_neo);
  snprintf(temporal, sizeof temporal, "%s.nuevo", ruta);
  FILE *f = fopen(temporal, "w");
  if (!f) return;
  fprintf(f, "# Neo Arcade Lite: favoritos y recientes (el más reciente primero).\n");
  for (int i = 0; i < n_favoritos; i++) fprintf(f, "favorito %s\n", favoritos[i]);
  for (int i = 0; i < n_recientes; i++) fprintf(f, "reciente %s\n", recientes[i]);
  fflush(f);
  fsync(fileno(f));
  fclose(f);
  rename(temporal, ruta);  // si se apaga a la mitad, queda el archivo anterior entero
}

static int es_favorito(const char *clave) {
  for (int i = 0; i < n_favoritos; i++)
    if (!strcmp(favoritos[i], clave)) return i;
  return -1;
}

static void cambiar_favorito(const Juego *j) {
  char clave[PATH_MAX];
  clave_de(j, clave, sizeof clave);
  int i = es_favorito(clave);
  if (i >= 0) {
    free(favoritos[i]);
    favoritos[i] = favoritos[--n_favoritos];
    avisar("Quitado de Favoritos.");
  } else if (n_favoritos < MAX_JUEGOS) {
    favoritos[n_favoritos++] = strdup(clave);
    avisar("Agregado a Favoritos.");
  }
  guardar_datos_usuario();
  armar_listas();
}

static void agregar_reciente(const Juego *j) {
  char clave[PATH_MAX];
  clave_de(j, clave, sizeof clave);
  int estaba = -1;
  for (int i = 0; i < n_recientes; i++)
    if (!strcmp(recientes[i], clave)) estaba = i;
  char *nuevo = estaba >= 0 ? recientes[estaba] : strdup(clave);
  int hasta = estaba >= 0 ? estaba : (n_recientes < MAX_RECIENTES ? n_recientes++ : MAX_RECIENTES - 1);
  if (estaba < 0 && hasta == MAX_RECIENTES - 1 && n_recientes == MAX_RECIENTES) free(recientes[hasta]);
  memmove(recientes + 1, recientes, sizeof *recientes * hasta);
  recientes[0] = nuevo;
  guardar_datos_usuario();
  armar_listas();
}

// ---- Medios: carátula y ficha del juego elegido -----------------------------------------------------

static char medio_cargado[PATH_MAX + 16];
static uint16_t *caratula;  // RGB565
static int caratula_w, caratula_h;
static char ficha_nombre[256], ficha_linea1[256], ficha_linea2[256], ficha_desc[2048];

static void base_de(const char *archivo, char *base, size_t tam) {
  snprintf(base, tam, "%s", archivo);
  char *punto = strrchr(base, '.');
  if (punto && punto != base) *punto = 0;
}

// El título sin la extensión ni las marcas entre paréntesis, como lo muestra Neo Arcade. Primero se
// quita la extensión: «Super Mario Bros. 3 (ESP).nes» tiene otro punto antes.
static void titulo(const char *archivo, char *salida, size_t tam) {
  base_de(archivo, salida, tam);
  char *marca = strpbrk(salida, "([");
  if (marca && marca != salida) *marca = 0;
  size_t n = strlen(salida);
  while (n > 0 && salida[n - 1] == ' ') salida[--n] = 0;
}

static void cargar_medios(const Juego *j) {
  char clave[PATH_MAX + 16];
  clave_de(j, clave, sizeof clave);
  if (!strcmp(clave, medio_cargado)) return;
  snprintf(medio_cargado, sizeof medio_cargado, "%s", clave);
  free(caratula);
  caratula = NULL;
  ficha_linea1[0] = ficha_linea2[0] = ficha_desc[0] = 0;
  titulo(j->archivo, ficha_nombre, sizeof ficha_nombre);

  char base[PATH_MAX], ruta[PATH_MAX * 2];
  base_de(j->archivo, base, sizeof base);
  snprintf(ruta, sizeof ruta, "%s/medios/%s/%s.img", carpeta_neo, sistemas[j->sistema].carpeta, base);
  FILE *f = fopen(ruta, "rb");
  if (f) {
    uint8_t cab[8];
    if (fread(cab, 1, 8, f) == 8 && !memcmp(cab, "NEOI", 4)) {
      caratula_w = cab[4] | cab[5] << 8;
      caratula_h = cab[6] | cab[7] << 8;
      size_t n = (size_t)caratula_w * caratula_h;
      caratula = malloc(n * 2);
      if (caratula && fread(caratula, 2, n, f) != n) {
        free(caratula);
        caratula = NULL;
      }
    }
    fclose(f);
  }

  snprintf(ruta, sizeof ruta, "%s/medios/%s/%s.txt", carpeta_neo, sistemas[j->sistema].carpeta, base);
  f = fopen(ruta, "r");
  if (!f) return;
  char linea[4096], anio[16] = "", genero[160] = "", jugadores[32] = "", desarrollador[160] = "";
  while (fgets(linea, sizeof linea, f)) {
    linea[strcspn(linea, "\r\n")] = 0;
    char *igual = strchr(linea, '=');
    if (!igual) continue;
    *igual = 0;
    const char *valor = igual + 1;
    if (!strcmp(linea, "nombre")) snprintf(ficha_nombre, sizeof ficha_nombre, "%s", valor);
    else if (!strcmp(linea, "año")) snprintf(anio, sizeof anio, "%s", valor);
    else if (!strcmp(linea, "género")) snprintf(genero, sizeof genero, "%s", valor);
    else if (!strcmp(linea, "jugadores")) snprintf(jugadores, sizeof jugadores, "%s", valor);
    else if (!strcmp(linea, "desarrollador")) snprintf(desarrollador, sizeof desarrollador, "%s", valor);
    else if (!strcmp(linea, "descripción")) snprintf(ficha_desc, sizeof ficha_desc, "%s", valor);
  }
  fclose(f);
  snprintf(ficha_linea1, sizeof ficha_linea1, "%s%s%s", anio, anio[0] && genero[0] ? " · " : "", genero);
  snprintf(ficha_linea2, sizeof ficha_linea2, "%s%s%s%s", jugadores[0] ? "Jugadores: " : "", jugadores,
           jugadores[0] && desarrollador[0] ? " · " : "", desarrollador);
}

// ---- Dibujo --------------------------------------------------------------------------------------

// Caracteres (no bytes) de un texto UTF-8, para cortar y centrar.
static int largo(const char *s) {
  int n = 0;
  for (; *s; s++) n += (*s & 0xC0) != 0x80;
  return n;
}

// Copia a lo más `max` caracteres de `s` en `salida`, sin partir una letra de varios bytes.
static void cortar(const char *s, int max, char *salida, size_t tam) {
  size_t i = 0;
  int n = 0;
  while (s[i] && i < tam - 1) {
    if ((s[i] & 0xC0) != 0x80 && n++ == max) break;
    salida[i] = s[i];
    i++;
  }
  salida[i] = 0;
}

static void dibujar_caratula(int x, int y, int max_w, int max_h) {
  if (!caratula) return;
  int w = caratula_w < max_w ? caratula_w : max_w, h = caratula_h < max_h ? caratula_h : max_h;
  x += (max_w - w) / 2;
  int rgb565 = pantalla.bpp == 16 && pantalla.var.red.offset == 11 && pantalla.var.green.offset == 5;
  for (int j = 0; j < h; j++) {
    const uint16_t *f = caratula + (size_t)j * caratula_w;
    if (rgb565) {
      memcpy(pantalla.lienzo + (size_t)(y + j) * pantalla.paso + (size_t)x * 2, f, (size_t)w * 2);
    } else {
      for (int i = 0; i < w; i++)
        punto(x + i, y + j, color((f[i] >> 8) & 0xF8, (f[i] >> 3) & 0xFC, (f[i] << 3) & 0xF8));
    }
  }
}

// Texto partido en renglones de `ancho` caracteres, a lo más `renglones`.
static int parrafo(int x, int y, int e, int ancho, int renglones, int alto_linea, uint32_t c, const char *s) {
  char linea[512];
  while (*s && renglones-- > 0) {
    while (*s == ' ') s++;
    int n = 0, corte = 0, i = 0;
    for (; s[i] && n < ancho; i++) {
      if ((s[i] & 0xC0) != 0x80) n++;
      if (s[i] == ' ') corte = i;
    }
    int tomar = s[i] && corte ? corte : i;
    if (!renglones && s[tomar]) {  // último renglón con texto pendiente: termina en «…»
      cortar(s, ancho - 1, linea, sizeof linea);
      snprintf(linea + strlen(linea), sizeof linea - strlen(linea), "...");
    } else {
      snprintf(linea, sizeof linea, "%.*s", tomar, s);
    }
    texto(x, y, e, c, linea);
    y += alto_linea;
    s += tomar;
  }
  return y;
}

static void dibujar(void) {
  const uint32_t fondo = color(8, 8, 20), barra = color(30, 0, 40), rosa = color(255, 22, 140),
                 cian = color(0, 229, 255), blanco = color(240, 240, 240), gris = color(130, 130, 160),
                 amarillo = color(255, 210, 63), resaltado = color(60, 0, 70), marco_color = color(70, 70, 110);
  int W = pantalla.ancho, H = pantalla.alto;
  int e = W >= 1600 ? 3 : 2;  // texto normal; los títulos, una vez más grandes
  int lh = 8 * e + 3 * e;
  rectangulo(0, 0, W, H, fondo);

  // Barra de arriba: nombre y pestañas de sistemas (los que tienen juegos).
  int alto_barra = 8 * (e + 1) + 6 * e;
  rectangulo(0, 0, W, alto_barra, barra);
  texto(3 * e, 3 * e, e + 1, rosa, "NEO ARCADE LITE");
  int x = W - 3 * e;
  for (int s = N_SISTEMAS - 1; s >= 0; s--) {
    if (!sistemas[s].n && s != actual) continue;
    int ancho = largo(sistemas[s].corto) * 8 * e;
    x -= ancho + 4 * e;
    if (s == actual) {
      rectangulo(x - 2 * e, 2 * e, ancho + 4 * e, alto_barra - 4 * e, resaltado);
      rectangulo(x - 2 * e, alto_barra - 3 * e, ancho + 4 * e, e, rosa);
    }
    texto(x, (alto_barra - 8 * e) / 2, e, s == actual ? amarillo : (s < PRIMER_SISTEMA ? cian : gris), sistemas[s].corto);
  }

  // Lista a la izquierda.
  Sistema *si = &sistemas[actual];
  int lista_x = 3 * e, lista_w = W * 47 / 100, y = alto_barra + 3 * e;
  char linea[512];
  snprintf(linea, sizeof linea, "%s  ·  %d juego%s", si->nombre, si->n, si->n == 1 ? "" : "s");
  texto(lista_x, y, e, cian, linea);
  y += lh + e;
  int pie_alto = lh + 3 * e;
  int filas = (H - pie_alto - y) / lh;
  if (filas < 1) filas = 1;
  if (si->elegido < si->primero) si->primero = si->elegido;
  if (si->elegido >= si->primero + filas) si->primero = si->elegido - filas + 1;
  int columnas = (lista_w - 6 * e) / (8 * e) - 2;
  for (int i = si->primero; i < si->n && i < si->primero + filas; i++) {
    Juego *j = &si->juegos[i];
    char t[256], clave[PATH_MAX];
    titulo(j->archivo, t, sizeof t);
    clave_de(j, clave, sizeof clave);
    int fav = es_favorito(clave) >= 0;
    char visible[300];
    cortar(t, columnas, visible, sizeof visible);
    if (actual < PRIMER_SISTEMA)  // en Favoritos y Recientes se dice de qué sistema es cada uno
      snprintf(linea, sizeof linea, "%s%s [%s]", fav ? "* " : "  ", visible, sistemas[j->sistema].corto);
    else
      snprintf(linea, sizeof linea, "%s%s", fav ? "* " : "  ", visible);
    if (i == si->elegido) {
      rectangulo(lista_x, y - e, lista_w, lh, resaltado);
      rectangulo(lista_x, y - e, e, lh, rosa);
      texto(lista_x + 2 * e, y + e / 2, e, amarillo, linea);
    } else {
      texto(lista_x + 2 * e, y + e / 2, e, blanco, linea);
    }
    y += lh;
  }
  if (!si->n)
    texto(lista_x + 2 * e, y, e, gris, actual == FAVORITOS ? "Marca juegos con X para verlos aquí."
                                      : actual == RECIENTES ? "Aquí salen los juegos que abras."
                                                            : "No hay juegos de este sistema en la tarjeta.");

  // Ficha a la derecha.
  int px = lista_x + lista_w + 6 * e, pw = W - px - 3 * e, py = alto_barra + 3 * e;
  if (si->n) {
    cargar_medios(&si->juegos[si->elegido]);
    int alto_caratula = (H - pie_alto - py) * 52 / 100;
    marco(px, py, pw, alto_caratula + 4 * e, e / 2 > 0 ? e / 2 : 1, marco_color);
    if (caratula) dibujar_caratula(px + 2 * e, py + 2 * e, pw - 4 * e, alto_caratula);
    else texto(px + (pw - largo("Sin carátula") * 8 * e) / 2, py + alto_caratula / 2, e, gris, "Sin carátula");
    int fy = py + alto_caratula + 7 * e, col = pw / (8 * e);
    char t[300];
    cortar(ficha_nombre, pw / (8 * (e + 1)), t, sizeof t);
    texto(px, fy, e + 1, amarillo, t);
    fy += 8 * (e + 1) + 3 * e;
    if (ficha_linea1[0]) { cortar(ficha_linea1, col, t, sizeof t); texto(px, fy, e, cian, t); fy += lh; }
    if (ficha_linea2[0]) { cortar(ficha_linea2, col, t, sizeof t); texto(px, fy, e, gris, t); fy += lh; }
    int restan = (H - pie_alto - fy - e) / lh;
    if (ficha_desc[0] && restan > 0) parrafo(px, fy + e, e, col, restan, lh, blanco, ficha_desc);
  }

  // Pie: ayuda o aviso.
  rectangulo(0, H - pie_alto, W, pie_alto, barra);
  const char *pie = ahora_ms() < aviso_hasta
      ? aviso
      : "A jugar  X favorito  LB/RB sistema  LT/RT letra  Select listas  Sel+Start salir";
  texto(3 * e, H - pie_alto + (pie_alto - 8 * e) / 2, e, ahora_ms() < aviso_hasta ? amarillo : blanco, pie);
}

// ---- Acciones ------------------------------------------------------------------------------------

static void cambiar_sistema(int paso) {
  for (int k = 0; k < N_SISTEMAS; k++) {  // salta los sistemas vacíos (Favoritos y Recientes, si no hay)
    actual = (actual + paso + N_SISTEMAS) % N_SISTEMAS;
    if (sistemas[actual].n) return;
  }
}

static int letra(const char *archivo) {
  int c = (unsigned char)archivo[0];
  if (c >= 'a' && c <= 'z') c -= 32;
  return c >= 'A' && c <= 'Z' ? c : '#';
}

// Siguiente: el primer juego de la letra que sigue. Anterior: el primero de la letra que va antes.
static void saltar_letra(int adelante) {
  Sistema *si = &sistemas[actual];
  if (si->n < 2) return;
  int i = si->elegido, actual_letra = letra(si->juegos[i].archivo);
  if (adelante) {
    while (i < si->n - 1 && letra(si->juegos[i].archivo) == actual_letra) i++;
  } else {
    while (i > 0 && letra(si->juegos[i - 1].archivo) == actual_letra) i--;  // al inicio de esta letra
    if (i == si->elegido && i > 0) {  // ya estaba al inicio: al inicio de la letra anterior
      int previa = letra(si->juegos[i - 1].archivo);
      while (i > 0 && letra(si->juegos[i - 1].archivo) == previa) i--;
    }
  }
  si->elegido = i;
}

// Select pasa por Favoritos, Recientes y de regreso al sistema donde estaba.
static int ultimo_sistema_real = PRIMER_SISTEMA;
static void siguiente_lista(void) {
  if (actual >= PRIMER_SISTEMA) ultimo_sistema_real = actual;
  int orden[] = {FAVORITOS, RECIENTES, ultimo_sistema_real};
  int pos = actual == FAVORITOS ? 0 : actual == RECIENTES ? 1 : 2;
  for (int k = 1; k <= 3; k++) {
    int candidato = orden[(pos + k) % 3];
    if (sistemas[candidato].n || candidato == ultimo_sistema_real) {
      actual = candidato;
      return;
    }
  }
}

static void jugar(void) {
  Sistema *si = &sistemas[actual];
  if (!si->n) return;
  Juego j = si->juegos[si->elegido];
  Sistema *real = &sistemas[j.sistema];
  char emulador[PATH_MAX], juego[PATH_MAX * 2], reg[PATH_MAX];
  snprintf(emulador, sizeof emulador, "%s/%s", carpeta_programas, real->emulador);
  snprintf(juego, sizeof juego, "%s/%s/%s", carpeta_roms, real->carpeta, j.archivo);
  snprintf(reg, sizeof reg, "%s/registro-retro.txt", carpeta_neo);
  if (access(emulador, F_OK)) {
    avisar("Este sistema todavía no tiene emulador.");
    return;
  }
  anotar("jugar: %s", juego);
  agregar_reciente(&j);
  limpiar_pantalla();
  // El tablero por USB directo solo lo puede tener un programa a la vez: se suelta para el emulador.
  cerrar_mandos();
  long inicio = ahora_ms();
  pid_t hijo = fork();
  if (hijo == 0) {
    execl(emulador, real->emulador, juego, reg, (char *)NULL);
    _exit(127);
  }
  int estado = 0;
  if (hijo > 0) waitpid(hijo, &estado, 0);
  anotar("fin del juego: salida %d tras %ld s", WIFEXITED(estado) ? WEXITSTATUS(estado) : -1,
         (ahora_ms() - inicio) / 1000);
  abrir_mandos(anotar);
  if (!WIFEXITED(estado) || WEXITSTATUS(estado) != 0) avisar("El juego no pudo abrirse. Revisa el registro.");
}

// Espera a que se suelten los botones: Select + Start del juego no debe llegar al menú.
static void esperar_suelto(void) {
  long hasta = ahora_ms() + 3000;
  while (ahora_ms() < hasta) {
    leer_mandos();
    int alguno = 0;
    for (int b = 0; b < BOTONES; b++) alguno |= apretado_alguno(b);
    if (!alguno) return;
    usleep(20000);
  }
}

int main(int argc, char **argv) {
  registro = fopen(argc > 1 ? argv[1] : "/mnt/neo/registro-menu.txt", "a");
  // Los emuladores están junto a este programa; neo/ es esa misma carpeta salvo en las pruebas.
  snprintf(carpeta_programas, sizeof carpeta_programas, "%s", argv[0]);
  char *barra = strrchr(carpeta_programas, '/');
  if (barra) *barra = 0; else strcpy(carpeta_programas, ".");
  snprintf(carpeta_neo, sizeof carpeta_neo, "%s", getenv("NEO_NEO") ? getenv("NEO_NEO") : carpeta_programas);
  if (getenv("NEO_ROMS")) carpeta_roms = getenv("NEO_ROMS");
  anotar("inicio del menú (programas en %s, juegos en %s)", carpeta_programas, carpeta_roms);
  if (abrir_pantalla(anotar) < 0) {
    anotar("sin pantalla: se termina");
    return 1;
  }
  leer_biblioteca();
  leer_datos_usuario();
  armar_listas();
  if (!sistemas[actual].n) cambiar_sistema(1);
  if (pantalla.simulada) {
    if (getenv("NEO_SIMULAR_FAVORITO")) cambiar_favorito(&sistemas[actual].juegos[0]);
    sistemas[actual].elegido = sistemas[actual].n > 3 ? 3 : 0;
    dibujar();
    if (getenv("NEO_CAPTURA")) guardar_png(getenv("NEO_CAPTURA"));
    return 0;
  }

  abrir_mandos(anotar);
  long inicio = ahora_ms(), ultima_busqueda = inicio, salir_desde = 0, siguiente_repeticion = 0, ultimo_dibujo = 0;
  int direccion_previa = -1, previos[BOTONES], firma_previa = -1, select_con_start = 0;
  for (int b = 0; b < BOTONES; b++) previos[b] = 1;  // no actuar con botones que ya venían apretados
  const char *motivo = NULL;
  while (!motivo) {
    long t = ahora_ms();
    if (!numero_de_mandos() && t - ultima_busqueda > 2000) {  // tablero conectado después
      abrir_mandos(anotar);
      ultima_busqueda = t;
    }
    leer_mandos();
    if (!numero_de_mandos()) {
      long resta = (SALIR_SIN_MANDOS_MS - (t - inicio)) / 1000;
      snprintf(aviso, sizeof aviso, "No encuentro el tablero. Conéctalo al USB. Menú de fábrica en %ld s.",
               resta > 0 ? resta : 0);
      aviso_hasta = t + 1000;
      if (t - inicio >= SALIR_SIN_MANDOS_MS) motivo = "sin controles";
    }
    int ahora[BOTONES];
    for (int b = 0; b < BOTONES; b++) ahora[b] = apretado_alguno(b);
#define RECIEN(b) (ahora[b] && !previos[b])
    Sistema *si = &sistemas[actual];

    // Arriba y abajo con repetición al mantener; izquierda y derecha cambian de sistema.
    int direccion = ahora[BOTON_ARRIBA] ? BOTON_ARRIBA : ahora[BOTON_ABAJO] ? BOTON_ABAJO
                  : ahora[BOTON_IZQUIERDA] ? BOTON_IZQUIERDA : ahora[BOTON_DERECHA] ? BOTON_DERECHA : -1;
    int mover = 0;
    if (direccion != direccion_previa) {
      mover = direccion >= 0;
      siguiente_repeticion = t + 350;
    } else if (direccion >= 0 && t >= siguiente_repeticion && (direccion == BOTON_ARRIBA || direccion == BOTON_ABAJO)) {
      mover = 1;
      siguiente_repeticion = t + 90;
    }
    direccion_previa = direccion;
    if (mover) {
      if (direccion == BOTON_ARRIBA && si->n) si->elegido = (si->elegido + si->n - 1) % si->n;
      if (direccion == BOTON_ABAJO && si->n) si->elegido = (si->elegido + 1) % si->n;
      if (direccion == BOTON_DERECHA) cambiar_sistema(1);
      if (direccion == BOTON_IZQUIERDA) cambiar_sistema(-1);
    }
    if (RECIEN(BOTON_R)) cambiar_sistema(1);
    if (RECIEN(BOTON_L)) cambiar_sistema(-1);
    if (RECIEN(BOTON_R2)) saltar_letra(1);
    if (RECIEN(BOTON_L2)) saltar_letra(0);
    if (RECIEN(BOTON_Y) && si->n) cambiar_favorito(&si->juegos[si->elegido]);  // la X del tablero

    // Select + Start mantenidos: salir. Select solo (al soltarlo sin haber tocado Start): listas.
    if (ahora[BOTON_SELECT] && ahora[BOTON_START]) {
      select_con_start = 1;
      if (!salir_desde) salir_desde = t;
      if (t - salir_desde >= SALIR_MANTENIENDO_MS) motivo = "Select + Start";
    } else {
      salir_desde = 0;
      if (!ahora[BOTON_SELECT] && previos[BOTON_SELECT] && !select_con_start) siguiente_lista();
      if (!ahora[BOTON_SELECT]) select_con_start = 0;
      if (RECIEN(BOTON_B) && !select_con_start) {
        jugar();
        esperar_suelto();
        for (int b = 0; b < BOTONES; b++) ahora[b] = 1;
        firma_previa = -1;  // el emulador dibujó encima: hay que redibujar el menú
      }
    }
    memcpy(previos, ahora, sizeof previos);

    // Se redibuja solo si cambió lo que se ve, o una vez por segundo por los avisos.
    int firma = actual * 100000 + sistemas[actual].elegido * 4 + (ahora_ms() < aviso_hasta) * 2 +
                (sistemas[FAVORITOS].n & 1);
    if (firma != firma_previa || t - ultimo_dibujo >= 1000) {
      dibujar();
      mostrar();
      firma_previa = firma;
      ultimo_dibujo = t;
    }
    usleep(20000);
  }
  anotar("fin del menú: %s", motivo);
  cerrar_mandos();
  limpiar_pantalla();
  if (registro) fclose(registro);
  return 0;
}
