#include "biblioteca.h"

#include <ctype.h>
#include <dirent.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <unistd.h>

const Sistema SISTEMAS[] = {
  {"nes", "NES", "NES", "nes", "neo-retro-nes", ".nes", {"fc", "nes"}, 0xC62828},
  {"snes", "SNES", "SNES", "snes", "neo-retro-snes", ".sfc.smc", {"sfc", "snes"}, 0x6A4BC0},
  {"gb", "GAME BOY", "GAME BOY", "gb", "neo-retro-gb", ".gb", {"gb"}, 0x4E7A3A},
  {"gbc", "GBC", "GBC", "gbc", "neo-retro-gb", ".gbc.gb", {"gbc"}, 0xB0207A},
  {"gba", "GBA", "GBA", "gba", "neo-retro-gba", ".gba", {"gba"}, 0x3949AB},
  {"megadrive", "SEGA GENESIS", "GENESIS", "megadrive", "neo-retro-md", ".md.gen.bin.smd", {"md", "megadrive", "genesis"}, 0x1565C0},
};
const int N_SISTEMAS = sizeof SISTEMAS / sizeof *SISTEMAS;

Vista vistas[MAX_VISTAS];
int n_vistas;

static Juego *juegos;
static int n_juegos;
static char roms[PATH_MAX], neo[PATH_MAX];
static void (*anotar)(const char *, ...);
static char *favoritos_guardados[4096], *recientes[MAX_RECIENTES];
static int n_favoritos_guardados, n_recientes;

static void nada(const char *f, ...) { (void)f; }

// ---- Texto ---------------------------------------------------------------------------------------

static void base_de(const char *archivo, char *base, size_t tam) {
  const char *barra = strrchr(archivo, '/');
  snprintf(base, tam, "%s", barra ? barra + 1 : archivo);
  char *punto = strrchr(base, '.');
  if (punto && punto != base) *punto = 0;
}

static void minusculas(char *s) {
  for (; *s; s++) *s = (char)tolower((unsigned char)*s);
}

// El título sin la extensión ni las marcas entre paréntesis o corchetes, como lo muestra Neo Arcade.
static char *titulo_de_archivo(const char *archivo) {
  char t[512];
  base_de(archivo, t, sizeof t);
  char *marca = strpbrk(t, "([");
  if (marca && marca != t) *marca = 0;
  size_t n = strlen(t);
  while (n > 0 && t[n - 1] == ' ') t[--n] = 0;
  return strdup(t);
}

static void poner_utf8(char **d, unsigned cp) {
  unsigned char *u = (unsigned char *)*d;
  if (cp < 0x80) *u++ = (unsigned char)cp;
  else if (cp < 0x800) { *u++ = (unsigned char)(0xC0 | cp >> 6); *u++ = (unsigned char)(0x80 | (cp & 63)); }
  else { *u++ = (unsigned char)(0xE0 | cp >> 12); *u++ = (unsigned char)(0x80 | ((cp >> 6) & 63)); *u++ = (unsigned char)(0x80 | (cp & 63)); }
  *d = (char *)u;
}

// Copia el contenido de una etiqueta XML: quita las entidades y junta los espacios y saltos de línea.
static char *texto_xml(const char *a, const char *b) {
  char *s = malloc((size_t)(b - a) * 3 + 1), *d = s;
  if (!s) return NULL;
  int espacio = 0;
  while (a < b) {
    if (*a == '&') {
      const char *fin = memchr(a, ';', (size_t)(b - a));
      if (fin && fin - a < 10) {
        unsigned cp = 0;
        if (a[1] == '#') cp = (unsigned)(a[2] == 'x' ? strtoul(a + 3, NULL, 16) : strtoul(a + 2, NULL, 10));
        else if (!strncmp(a, "&amp;", 5)) cp = '&';
        else if (!strncmp(a, "&lt;", 4)) cp = '<';
        else if (!strncmp(a, "&gt;", 4)) cp = '>';
        else if (!strncmp(a, "&quot;", 6)) cp = '"';
        else if (!strncmp(a, "&apos;", 6)) cp = '\'';
        if (cp) {
          if (espacio && d != s) *d++ = ' ';
          espacio = 0;
          poner_utf8(&d, cp);
          a = fin + 1;
          continue;
        }
      }
    }
    if (*a == ' ' || *a == '\n' || *a == '\r' || *a == '\t') {
      espacio = 1;
      a++;
      continue;
    }
    if (espacio && d != s) *d++ = ' ';
    espacio = 0;
    *d++ = *a++;
  }
  *d = 0;
  return s;
}

// `juego` termina donde termina ese <game>: buscar más allá recorrería el archivo entero por cada uno.
static char *etiqueta(const char *juego, const char *nombre) {
  char abre[32], cierra[32];
  snprintf(abre, sizeof abre, "<%s>", nombre);
  snprintf(cierra, sizeof cierra, "</%s>", nombre);
  const char *a = strstr(juego, abre);
  if (!a) return NULL;
  a += strlen(abre);
  const char *b = strstr(a, cierra);
  if (!b) return NULL;
  char *t = texto_xml(a, b);
  if (t && !*t) { free(t); t = NULL; }
  return t;
}

// ---- gamelist.xml --------------------------------------------------------------------------------

typedef struct {
  char *clave;  // nombre del juego sin carpeta ni extensión, en minúsculas
  char *nombre, *descripcion, *imagen, *miniatura, *desarrollador, *fecha, *genero;
} Entrada;

static int comparar_entradas(const void *a, const void *b) {
  return strcmp(((const Entrada *)a)->clave, ((const Entrada *)b)->clave);
}

static char *leer_archivo(const char *ruta) {
  FILE *f = fopen(ruta, "rb");
  if (!f) return NULL;
  fseek(f, 0, SEEK_END);
  long n = ftell(f);
  fseek(f, 0, SEEK_SET);
  char *s = n > 0 ? malloc((size_t)n + 1) : NULL;
  if (s && fread(s, 1, (size_t)n, f) != (size_t)n) { free(s); s = NULL; }
  if (s) s[n] = 0;
  fclose(f);
  return s;
}

// Las rutas del gamelist son relativas a su carpeta («./images/x.png»).
static char *ruta_de(const char *carpeta, char *relativa) {
  if (!relativa) return NULL;
  char r[PATH_MAX * 2];
  const char *p = relativa;
  while (p[0] == '.' && p[1] == '/') p += 2;
  if (*p == '/') snprintf(r, sizeof r, "%s", p);
  else snprintf(r, sizeof r, "%s/%s", carpeta, p);
  free(relativa);
  return strdup(r);
}

static Entrada *leer_gamelist(const char *carpeta, int *n) {
  char ruta[PATH_MAX + 16];
  snprintf(ruta, sizeof ruta, "%s/gamelist.xml", carpeta);
  char *xml = leer_archivo(ruta);
  *n = 0;
  if (!xml) return NULL;
  int capacidad = 256;
  Entrada *e = malloc(sizeof *e * capacidad);
  for (char *g = strstr(xml, "<game"); g && e; g = strstr(g, "<game")) {
    char *fin = strstr(g, "</game>");
    if (!fin) break;
    *fin = 0;
    char *path = etiqueta(g, "path");
    if (path) {
      if (*n == capacidad) e = realloc(e, sizeof *e * (capacidad *= 2));
      char clave[512];
      base_de(path, clave, sizeof clave);
      minusculas(clave);
      free(path);
      e[*n] = (Entrada){strdup(clave), etiqueta(g, "name"), etiqueta(g, "desc"),
                        ruta_de(carpeta, etiqueta(g, "image")), ruta_de(carpeta, etiqueta(g, "thumbnail")),
                        etiqueta(g, "developer"), etiqueta(g, "releasedate"), etiqueta(g, "genre")};
      if (!e[*n].desarrollador) e[*n].desarrollador = etiqueta(g, "publisher");
      (*n)++;
    }
    g = fin + 7;
  }
  free(xml);
  if (e) qsort(e, (size_t)*n, sizeof *e, comparar_entradas);
  return e;
}

// «Konami · 1988 · Acción», con lo que haya.
static char *meta_de(const Entrada *e) {
  char m[512] = "", anio[8] = "";
  if (e->fecha && strlen(e->fecha) >= 4 && isdigit((unsigned char)e->fecha[0])) snprintf(anio, sizeof anio, "%.4s", e->fecha);
  const char *partes[] = {e->desarrollador, anio[0] ? anio : NULL, e->genero};
  for (int k = 0; k < 3; k++) {
    if (!partes[k] || !*partes[k]) continue;
    if (m[0]) strncat(m, "  \xE2\x80\xA2  ", sizeof m - strlen(m) - 1);
    strncat(m, partes[k], sizeof m - strlen(m) - 1);
  }
  return m[0] ? strdup(m) : NULL;
}

// ---- Lectura -------------------------------------------------------------------------------------

static int extension_valida(const char *nombre, const char *extensiones) {
  const char *punto = strrchr(nombre, '.');
  if (!punto || punto == nombre) return 0;
  size_t n = strlen(punto);
  for (const char *p = extensiones; (p = strchr(p, '.')); p++)
    if (!strncasecmp(p, punto, n) && (p[n] == '.' || p[n] == 0)) return 1;
  return 0;
}

static void leer_carpeta(int s, const char *nombre) {
  char carpeta[PATH_MAX + 64];
  snprintf(carpeta, sizeof carpeta, "%s/%s", roms, nombre);
  DIR *d = opendir(carpeta);
  if (!d) return;
  int n_entradas, antes = n_juegos;
  Entrada *gl = leer_gamelist(carpeta, &n_entradas);
  static int capacidad;
  struct dirent *f;
  while ((f = readdir(d))) {
    if (f->d_name[0] == '.' || !extension_valida(f->d_name, SISTEMAS[s].extensiones)) continue;
    if (n_juegos == capacidad) juegos = realloc(juegos, sizeof *juegos * (capacidad = capacidad ? capacidad * 2 : 512));
    Juego *j = &juegos[n_juegos++];
    memset(j, 0, sizeof *j);
    j->archivo = strdup(f->d_name);
    j->carpeta = strdup(nombre);
    j->sistema = s;
    char clave[512];
    base_de(f->d_name, clave, sizeof clave);
    minusculas(clave);
    Entrada buscada = {clave}, *e = gl ? bsearch(&buscada, gl, (size_t)n_entradas, sizeof *gl, comparar_entradas) : NULL;
    if (e) {
      j->titulo = e->nombre ? strdup(e->nombre) : NULL;
      j->meta = meta_de(e);
      j->descripcion = e->descripcion ? strdup(e->descripcion) : NULL;
      j->gl_arte = e->miniatura ? strdup(e->miniatura) : NULL;
      j->gl_captura = e->imagen ? strdup(e->imagen) : NULL;
    } else {
      j->ficha_vieja = 1;  // quizá esté en neo/medios
    }
    if (!j->titulo) j->titulo = titulo_de_archivo(f->d_name);
  }
  closedir(d);
  for (int k = 0; k < n_entradas; k++) {
    Entrada *e = &gl[k];
    free(e->clave); free(e->nombre); free(e->descripcion); free(e->imagen); free(e->miniatura);
    free(e->desarrollador); free(e->fecha); free(e->genero);
  }
  free(gl);
  anotar("biblioteca: %s/%s, %d juegos, gamelist con %d", SISTEMAS[s].id, nombre, n_juegos - antes, n_entradas);
}

static void leer_datos_usuario(void) {
  char ruta[PATH_MAX + 32], linea[PATH_MAX + 32];
  snprintf(ruta, sizeof ruta, "%s/datos-usuario.txt", neo);
  FILE *f = fopen(ruta, "r");
  if (!f) return;
  while (fgets(linea, sizeof linea, f)) {
    linea[strcspn(linea, "\r\n")] = 0;
    if (!strncmp(linea, "favorito ", 9) && n_favoritos_guardados < 4096)
      favoritos_guardados[n_favoritos_guardados++] = strdup(linea + 9);
    if (!strncmp(linea, "reciente ", 9) && n_recientes < MAX_RECIENTES) recientes[n_recientes++] = strdup(linea + 9);
  }
  fclose(f);
}

static void guardar_datos_usuario(void) {
  char ruta[PATH_MAX + 32], temporal[PATH_MAX + 48], clave[PATH_MAX];
  snprintf(ruta, sizeof ruta, "%s/datos-usuario.txt", neo);
  snprintf(temporal, sizeof temporal, "%s.nuevo", ruta);
  FILE *f = fopen(temporal, "w");
  if (!f) return;
  fprintf(f, "# Neo Arcade Lite: favoritos y recientes (el más reciente primero).\n");
  for (int i = 0; i < n_juegos; i++)
    if (juegos[i].favorito) {
      clave_de(&juegos[i], clave, sizeof clave);
      fprintf(f, "favorito %s\n", clave);
    }
  for (int i = 0; i < n_recientes; i++) fprintf(f, "reciente %s\n", recientes[i]);
  fflush(f);
  fsync(fileno(f));
  fclose(f);
  rename(temporal, ruta);  // si se apaga a la mitad, queda el archivo anterior entero
}

void clave_de(const Juego *j, char *clave, size_t tam) {
  snprintf(clave, tam, "%s/%s", j->carpeta, j->archivo);
}

static Juego *buscar(const char *clave) {
  char k[PATH_MAX];
  for (int i = 0; i < n_juegos; i++) {
    clave_de(&juegos[i], k, sizeof k);
    if (!strcmp(k, clave)) return &juegos[i];
  }
  return NULL;
}

static int por_titulo(const void *a, const void *b) {
  const Juego *x = *(Juego *const *)a, *y = *(Juego *const *)b;
  int c = strcasecmp(x->titulo, y->titulo);
  return c ? c : (x->sistema != y->sistema ? x->sistema - y->sistema : strcmp(x->archivo, y->archivo));
}

static void armar_dinamicas(void) {
  for (int v = 0; v < n_vistas; v++) {
    Vista *vi = &vistas[v];
    if (vi->tipo == VISTA_FAVORITOS) {
      vi->n = 0;
      for (int i = 0; i < n_juegos; i++)
        if (juegos[i].favorito) vi->juegos[vi->n++] = &juegos[i];
      qsort(vi->juegos, (size_t)vi->n, sizeof *vi->juegos, por_titulo);
    } else if (vi->tipo == VISTA_RECIENTES) {
      vi->n = 0;
      for (int i = 0; i < n_recientes; i++) {
        Juego *j = buscar(recientes[i]);
        if (j) vi->juegos[vi->n++] = j;
      }
    } else {
      continue;
    }
    if (vi->elegido >= vi->n) vi->elegido = vi->n ? vi->n - 1 : 0;
  }
}

void biblioteca_leer(const char *carpeta_roms, const char *carpeta_neo, void (*registrar)(const char *, ...)) {
  snprintf(roms, sizeof roms, "%s", carpeta_roms);
  snprintf(neo, sizeof neo, "%s", carpeta_neo);
  anotar = registrar ? registrar : nada;
  for (int s = 0; s < N_SISTEMAS; s++)
    for (int c = 0; c < 4 && SISTEMAS[s].carpetas[c]; c++) leer_carpeta(s, SISTEMAS[s].carpetas[c]);

  // Las fichas de neo/medios (scripts/preparar-medios.py) de los juegos que el gamelist no trajo.
  for (int i = 0; i < n_juegos; i++)
    if (juegos[i].ficha_vieja) ficha_de(&juegos[i]);

  leer_datos_usuario();
  for (int k = 0; k < n_favoritos_guardados; k++) {
    Juego *j = buscar(favoritos_guardados[k]);
    if (j) j->favorito = 1;
  }

  // Vistas: ALL GAMES, cada sistema con juegos, Favoritos y Recientes.
  Juego **todos = malloc(sizeof *todos * (n_juegos ? n_juegos : 1));
  for (int i = 0; i < n_juegos; i++) todos[i] = &juegos[i];
  qsort(todos, (size_t)n_juegos, sizeof *todos, por_titulo);
  vistas[n_vistas++] = (Vista){"ALL GAMES", "todos", VISTA_TODOS, todos, n_juegos, 0};
  for (int s = 0; s < N_SISTEMAS; s++) {
    Juego **lista = malloc(sizeof *lista * (n_juegos ? n_juegos : 1));
    int n = 0;
    for (int i = 0; i < n_juegos; i++)
      if (todos[i]->sistema == s) lista[n++] = todos[i];
    if (n) vistas[n_vistas++] = (Vista){SISTEMAS[s].barra, SISTEMAS[s].icono, s, lista, n, 0};
    else free(lista);
  }
  vistas[n_vistas++] = (Vista){"FAVORITOS", "favoritos", VISTA_FAVORITOS, malloc(sizeof(Juego *) * (n_juegos + 1)), 0, 0};
  vistas[n_vistas++] = (Vista){"RECIENTES", "recientes", VISTA_RECIENTES, malloc(sizeof(Juego *) * (MAX_RECIENTES + 1)), 0, 0};
  armar_dinamicas();
  anotar("biblioteca: %d juegos en total, %d vistas", n_juegos, n_vistas);
}

int cambiar_favorito(Juego *j) {
  j->favorito = !j->favorito;
  guardar_datos_usuario();
  armar_dinamicas();
  return j->favorito;
}

void agregar_reciente(Juego *j) {
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
  armar_dinamicas();
}

// ---- Medios --------------------------------------------------------------------------------------

static char *primera_que_exista(const char **candidatas, int n) {
  for (int k = 0; k < n; k++)
    if (candidatas[k] && *candidatas[k] && !access(candidatas[k], R_OK)) return strdup(candidatas[k]);
  return strdup("");
}

// RetroBat deja en images/ «<juego>.png» (la captura con el logotipo, la de las tarjetas de Neo Arcade)
// y «<juego>-image.png» (la captura sola). Con Skraper puede haber covers/ y screenshots/.
static void resolver(Juego *j) {
  if (j->arte) return;
  char base[512], d[PATH_MAX + 64];
  base_de(j->archivo, base, sizeof base);
  snprintf(d, sizeof d, "%s/%s", roms, j->carpeta);
  char c[10][PATH_MAX * 2];
  snprintf(c[0], sizeof c[0], "%s/images/%s.png", d, base);
  snprintf(c[1], sizeof c[1], "%s/images/%s.jpg", d, base);
  snprintf(c[2], sizeof c[2], "%s/covers/%s.png", d, base);
  snprintf(c[3], sizeof c[3], "%s/covers/%s.jpg", d, base);
  snprintf(c[4], sizeof c[4], "%s/images/%s-image.png", d, base);
  snprintf(c[5], sizeof c[5], "%s/images/%s-image.jpg", d, base);
  snprintf(c[6], sizeof c[6], "%s/screenshots/%s.png", d, base);
  snprintf(c[7], sizeof c[7], "%s/screenshots/%s.jpg", d, base);
  snprintf(c[8], sizeof c[8], "%s/medios/%s/%s.img", neo, j->carpeta, base);
  const char *arte[] = {j->gl_arte, c[0], c[1], c[2], c[3], j->gl_captura, c[4], c[5], c[8]};
  j->arte = primera_que_exista(arte, 9);
  const char *captura[] = {j->gl_captura, c[4], c[5], c[6], c[7], j->arte};
  j->captura = primera_que_exista(captura, 6);
}

const char *arte_de(Juego *j) {
  resolver(j);
  return *j->arte ? j->arte : NULL;
}

const char *captura_de(Juego *j) {
  resolver(j);
  return *j->captura ? j->captura : NULL;
}

void ficha_de(Juego *j) {
  if (!j->ficha_vieja) return;
  j->ficha_vieja = 0;
  char base[512], ruta[PATH_MAX * 2];
  base_de(j->archivo, base, sizeof base);
  snprintf(ruta, sizeof ruta, "%s/medios/%s/%s.txt", neo, j->carpeta, base);
  FILE *f = fopen(ruta, "r");
  if (!f) return;
  char linea[4096];
  Entrada e = {0};
  while (fgets(linea, sizeof linea, f)) {
    linea[strcspn(linea, "\r\n")] = 0;
    char *igual = strchr(linea, '=');
    if (!igual || !igual[1]) continue;
    *igual = 0;
    char *valor = strdup(igual + 1);
    if (!strcmp(linea, "nombre")) { free(j->titulo); j->titulo = valor; }
    else if (!strcmp(linea, "año")) e.fecha = valor;
    else if (!strcmp(linea, "género")) e.genero = valor;
    else if (!strcmp(linea, "desarrollador")) e.desarrollador = valor;
    else if (!strcmp(linea, "descripción")) { free(j->descripcion); j->descripcion = valor; }
    else free(valor);
  }
  fclose(f);
  j->meta = meta_de(&e);
  free(e.fecha); free(e.genero); free(e.desarrollador);
}
