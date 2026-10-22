// neo-menu: menú de juegos de Neo Arcade Lite para el Game Stick. Lista los juegos de la tarjeta por
// sistema y abre cada uno con su emulador (neo-retro-<sistema>, en la misma carpeta que este
// programa). Al terminar el juego vuelve aquí.
//
// Controles (los del tablero del usuario, ver mandos.c): arriba y abajo eligen el juego, izquierda y
// derecha cambian de sistema, A o Start lo abren. Mantener Select + Start 2 s sale al menú de
// fábrica. También sale solo tras 15 minutos sin uso, o a los 30 s si no hay ningún control.
//
// En la laptop (QEMU): NEO_SIMULAR=1 dibuja un cuadro y lo guarda en NEO_CAPTURA; NEO_ROMS cambia la
// carpeta de juegos.
// Uso: neo-menu [registro]
#include <dirent.h>
#include <errno.h>
#include <limits.h>
#include <stdarg.h>
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
#define SALIR_SIN_USO_MS (15 * 60 * 1000)
#define SALIR_SIN_MANDOS_MS 30000
#define SALIR_MANTENIENDO_MS 2000

typedef struct {
  const char *carpeta, *nombre, *emulador, *extensiones;
  char *juegos[MAX_JUEGOS];
  int n, elegido, primero;
} Sistema;

static Sistema sistemas[] = {
  {"fc", "NES", "neo-retro-nes", ".nes"},
  {"sfc", "SUPER NINTENDO", "neo-retro-snes", ".sfc.smc"},
  {"md", "MEGA DRIVE", "neo-retro-md", ".md.gen.bin.smd"},
  {"gb", "GAME BOY", "neo-retro-gb", ".gb"},
  {"gbc", "GAME BOY COLOR", "neo-retro-gb", ".gbc.gb"},
  {"gba", "GAME BOY ADVANCE", "neo-retro-gba", ".gba"},
};
#define N_SISTEMAS (int)(sizeof sistemas / sizeof *sistemas)

static FILE *registro;
static char carpeta_programas[PATH_MAX];
static const char *carpeta_roms = "/mnt/roms";
static int actual;          // sistema a la vista
static char aviso[128];     // mensaje temporal al pie
static long aviso_hasta;

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

static int comparar(const void *a, const void *b) { return strcasecmp(*(char *const *)a, *(char *const *)b); }

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
  for (int s = 0; s < N_SISTEMAS; s++) {
    Sistema *si = &sistemas[s];
    char ruta[PATH_MAX];
    snprintf(ruta, sizeof ruta, "%s/%s", carpeta_roms, si->carpeta);
    DIR *d = opendir(ruta);
    if (!d) continue;
    struct dirent *e;
    while ((e = readdir(d)) && si->n < MAX_JUEGOS)
      if (e->d_name[0] != '.' && extension_valida(e->d_name, si->extensiones)) si->juegos[si->n++] = strdup(e->d_name);
    closedir(d);
    qsort(si->juegos, si->n, sizeof *si->juegos, comparar);
    char emulador[PATH_MAX];
    snprintf(emulador, sizeof emulador, "%s/%s", carpeta_programas, si->emulador);
    anotar("biblioteca: %s, %d juegos%s", si->nombre, si->n, access(emulador, F_OK) ? " (sin emulador todavía)" : "");
  }
}

// El título sin la extensión ni las marcas entre paréntesis, como lo muestra Neo Arcade. Primero se
// quita la extensión: «Super Mario Bros. 3 (ESP).nes» tiene otro punto antes.
static void titulo(const char *archivo, char *salida, size_t tam) {
  snprintf(salida, tam, "%s", archivo);
  char *punto = strrchr(salida, '.');
  if (punto && punto != salida) *punto = 0;
  char *marca = strpbrk(salida, "([");
  if (marca && marca != salida) *marca = 0;
  size_t n = strlen(salida);
  while (n > 0 && salida[n - 1] == ' ') salida[--n] = 0;
}

static void avisar(const char *texto_aviso) {
  snprintf(aviso, sizeof aviso, "%s", texto_aviso);
  aviso_hasta = ahora_ms() + 4000;
}

static void dibujar(void) {
  const uint32_t fondo = color(8, 8, 20), barra = color(30, 0, 40), rosa = color(255, 22, 140),
                 cian = color(0, 229, 255), blanco = color(240, 240, 240), gris = color(120, 120, 150),
                 amarillo = color(255, 210, 63), resaltado = color(60, 0, 70);
  int W = pantalla.ancho, H = pantalla.alto;
  int e = W >= 1600 ? 4 : (W >= 1000 ? 3 : 2);
  int lh = 8 * e + e * 4;
  rectangulo(0, 0, W, H, fondo);
  rectangulo(0, 0, W, lh + 2 * e, barra);
  texto(4 * e, e * 3, e, rosa, "NEO ARCADE LITE");

  // Sistema actual, con flechas a los lados (la fuente no trae ◄ ni ►).
  Sistema *si = &sistemas[actual];
  char linea[256];
  int y = lh + 6 * e;
  snprintf(linea, sizeof linea, "<  %s  >", si->nombre);
  int ancho = (int)strlen(linea) * 8 * (e + 1);
  texto((W - ancho) / 2, y, e + 1, cian, linea);
  y += lh + 4 * e;
  snprintf(linea, sizeof linea, "%d juegos", si->n);
  texto((W - (int)strlen(linea) * 8 * e) / 2, y, e, gris, linea);
  y += lh + 2 * e;

  // Lista con el elegido resaltado.
  int filas = (H - y - 3 * lh) / lh;
  if (filas < 1) filas = 1;
  if (si->elegido < si->primero) si->primero = si->elegido;
  if (si->elegido >= si->primero + filas) si->primero = si->elegido - filas + 1;
  int columnas = (W - 16 * e) / (8 * e);
  for (int i = si->primero; i < si->n && i < si->primero + filas; i++) {
    char t[256];
    titulo(si->juegos[i], t, sizeof t);
    if ((int)strlen(t) > columnas) t[columnas] = 0;
    if (i == si->elegido) {
      rectangulo(4 * e, y - e, W - 8 * e, lh, resaltado);
      rectangulo(4 * e, y - e, e, lh, rosa);
      texto(8 * e, y + e, e, amarillo, t);
    } else {
      texto(8 * e, y + e, e, blanco, t);
    }
    y += lh;
  }
  if (!si->n) texto(8 * e, y, e, gris, "No hay juegos de este sistema en la tarjeta.");

  // Pie: ayuda o aviso.
  rectangulo(0, H - lh - 4 * e, W, lh + 4 * e, barra);
  const char *pie = ahora_ms() < aviso_hasta ? aviso : "A: jugar  · < >: sistema  · Select+Start: salir";
  texto(4 * e, H - lh - e, e, ahora_ms() < aviso_hasta ? amarillo : blanco, pie);
}

static void jugar(void) {
  Sistema *si = &sistemas[actual];
  if (!si->n) return;
  char emulador[PATH_MAX], juego[PATH_MAX], reg[PATH_MAX];
  snprintf(emulador, sizeof emulador, "%s/%s", carpeta_programas, si->emulador);
  snprintf(juego, sizeof juego, "%s/%s/%s", carpeta_roms, si->carpeta, si->juegos[si->elegido]);
  snprintf(reg, sizeof reg, "%s/registro-retro.txt", carpeta_programas);
  if (access(emulador, F_OK)) {
    avisar("Este sistema todavía no tiene emulador.");
    anotar("sin emulador para %s", si->nombre);
    return;
  }
  anotar("jugar: %s", juego);
  limpiar_pantalla();
  // El tablero por USB directo solo lo puede tener un programa a la vez: se suelta para el emulador.
  cerrar_mandos();
  long inicio = ahora_ms();
  pid_t hijo = fork();
  if (hijo == 0) {
    execl(emulador, si->emulador, juego, reg, (char *)NULL);
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
  // Los emuladores están junto a este programa.
  snprintf(carpeta_programas, sizeof carpeta_programas, "%s", argv[0]);
  char *barra = strrchr(carpeta_programas, '/');
  if (barra) *barra = 0; else strcpy(carpeta_programas, ".");
  if (getenv("NEO_ROMS")) carpeta_roms = getenv("NEO_ROMS");
  anotar("inicio del menú (programas en %s, juegos en %s)", carpeta_programas, carpeta_roms);
  if (abrir_pantalla(anotar) < 0) {
    anotar("sin pantalla: se termina");
    return 1;
  }
  leer_biblioteca();
  for (int s = 0; s < N_SISTEMAS; s++)  // empieza en el primer sistema con juegos
    if (sistemas[s].n) {
      actual = s;
      break;
    }
  if (pantalla.simulada) {
    sistemas[actual].elegido = sistemas[actual].n > 3 ? 3 : 0;
    dibujar();
    if (getenv("NEO_CAPTURA")) guardar_png(getenv("NEO_CAPTURA"));
    return 0;
  }

  abrir_mandos(anotar);
  long inicio = ahora_ms(), ultimo_uso = inicio, ultima_busqueda = inicio, salir_desde = 0, siguiente_repeticion = 0;
  int direccion_previa = -1, a_previo = 1;  // a_previo en 1: no abrir un juego con un botón que ya venía apretado
  int firma_previa = -1;
  long ultimo_dibujo = 0;
  const char *motivo = NULL;
  while (!motivo) {
    long t = ahora_ms();
    if (!numero_de_mandos() && t - ultima_busqueda > 2000) {  // tablero conectado después
      abrir_mandos(anotar);
      ultima_busqueda = t;
    }
    if (leer_mandos()) ultimo_uso = t;
    if (!numero_de_mandos()) {
      long resta = (SALIR_SIN_MANDOS_MS - (t - inicio)) / 1000;
      char m[128];
      snprintf(m, sizeof m, "No encuentro el tablero. Conéctalo al USB. Menú de fábrica en %ld s.", resta > 0 ? resta : 0);
      snprintf(aviso, sizeof aviso, "%s", m);
      aviso_hasta = t + 1000;
      if (t - inicio >= SALIR_SIN_MANDOS_MS) motivo = "sin controles";
    }
    // Arriba y abajo con repetición al mantener; izquierda y derecha cambian de sistema.
    int direccion = apretado_alguno(BOTON_ARRIBA) ? BOTON_ARRIBA : apretado_alguno(BOTON_ABAJO) ? BOTON_ABAJO
                  : apretado_alguno(BOTON_IZQUIERDA) ? BOTON_IZQUIERDA : apretado_alguno(BOTON_DERECHA) ? BOTON_DERECHA : -1;
    int mover = 0;
    if (direccion != direccion_previa) {
      mover = direccion >= 0;
      siguiente_repeticion = t + 350;
    } else if (direccion >= 0 && t >= siguiente_repeticion &&
               (direccion == BOTON_ARRIBA || direccion == BOTON_ABAJO)) {
      mover = 1;
      siguiente_repeticion = t + 90;
    }
    direccion_previa = direccion;
    Sistema *si = &sistemas[actual];
    if (mover) {
      if (direccion == BOTON_ARRIBA && si->n) si->elegido = (si->elegido + si->n - 1) % si->n;
      if (direccion == BOTON_ABAJO && si->n) si->elegido = (si->elegido + 1) % si->n;
      if (direccion == BOTON_DERECHA || direccion == BOTON_IZQUIERDA) {
        int paso = direccion == BOTON_DERECHA ? 1 : N_SISTEMAS - 1;
        for (int k = 0; k < N_SISTEMAS; k++) {  // salta los sistemas sin juegos
          actual = (actual + paso) % N_SISTEMAS;
          if (sistemas[actual].n) break;
        }
      }
    }
    int a = apretado_alguno(BOTON_B) || apretado_alguno(BOTON_A);
    int select_start = apretado_alguno(BOTON_SELECT) && apretado_alguno(BOTON_START);
    if (select_start) {
      if (!salir_desde) salir_desde = t;
      if (t - salir_desde >= SALIR_MANTENIENDO_MS) motivo = "Select + Start";
    } else {
      salir_desde = 0;
      if ((a && !a_previo) || (apretado_alguno(BOTON_START) && !apretado_alguno(BOTON_SELECT) && !a_previo)) {
        jugar();
        esperar_suelto();
        a = 1;
        ultimo_uso = ahora_ms();
        firma_previa = -1;  // el emulador dibujó encima: hay que redibujar el menú
      }
    }
    a_previo = a || apretado_alguno(BOTON_START);
    if (t - ultimo_uso >= SALIR_SIN_USO_MS) motivo = "15 minutos sin uso";
    // Se redibuja solo si cambió lo que se ve, o una vez por segundo por los avisos con cuenta atrás.
    int firma = actual * 100000 + sistemas[actual].elegido * 2 + (ahora_ms() < aviso_hasta);
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
