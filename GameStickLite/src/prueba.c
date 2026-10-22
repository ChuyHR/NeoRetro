// Neo Arcade Lite: prueba de pantalla, controles y sonido para el Game Stick (Amlogic AML8726-MX,
// Linux 3.0.50). Dibuja directo en /dev/fb0, lee todos los /dev/input/event* y deja un registro en la
// tarjeta. Sale sola: al mantener un botón 5 s, tras 60 s sin tocar nada o a los 3 minutos.
//
// En la laptop (QEMU) no hay /dev/fb0: con NEO_SIMULAR=1 dibuja en memoria, simula un tablero y
// guarda la pantalla como PNG en NEO_CAPTURA.
#include <dirent.h>
#include <fcntl.h>
#include <linux/input.h>
#include <signal.h>
#include <stdarg.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <sys/ioctl.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

#include "pantalla.h"

#define MAX_MANDOS 8
#define MAX_EVENTOS 8
#define SALIR_MANTENIENDO_MS 5000
#define SALIR_SIN_USO_MS 60000
#define SALIR_TOTAL_MS 180000

#define BITS_POR_LARGO (sizeof(long) * 8)
#define BIT(arreglo, n) ((arreglo[(n) / BITS_POR_LARGO] >> ((n) % BITS_POR_LARGO)) & 1)

typedef struct {
  int fd;
  char ruta[32];
  char nombre[128];
  struct input_id id;
  int botones[KEY_CNT];  // 1 si está apretado
  long desde[KEY_CNT];   // ms en que se apretó
  int ejes[ABS_CNT];
  struct input_absinfo info[ABS_CNT];
  unsigned long bits_abs[ABS_CNT / BITS_POR_LARGO + 1];
  char eventos[MAX_EVENTOS][64];
  int n_eventos;
} Mando;

static Mando mandos[MAX_MANDOS];
static int n_mandos;
static FILE *registro;
static int simulado;  // igual a pantalla.simulada, a la mano
static char sonido[256];  // un .wav del sistema de fábrica para probar el audio
static pid_t reproduciendo;

static long ahora_ms(void) {
  struct timespec t;
  clock_gettime(CLOCK_MONOTONIC, &t);
  return t.tv_sec * 1000L + t.tv_nsec / 1000000L;
}

static void anotar(const char *formato, ...) {
  if (!registro) return;
  va_list args;
  va_start(args, formato);
  fprintf(registro, "%7.2f ", ahora_ms() / 1000.0);
  vfprintf(registro, formato, args);
  fputc('\n', registro);
  va_end(args);
  fflush(registro);
}

// ---- Controles --------------------------------------------------------------------------------

static void anotar_mando(Mando *m) {
  unsigned long bits_key[KEY_CNT / BITS_POR_LARGO + 1] = {0};
  if (m->fd >= 0) ioctl(m->fd, EVIOCGBIT(EV_KEY, sizeof bits_key), bits_key);
  char botones[512] = "";
  for (int k = 0; k < KEY_CNT && strlen(botones) < sizeof botones - 8; k++)
    if (BIT(bits_key, k)) snprintf(botones + strlen(botones), sizeof botones - strlen(botones), " %d", k);
  anotar("control %s: «%s» %04x:%04x bus %u versión %u", m->ruta, m->nombre, m->id.vendor, m->id.product,
         m->id.bustype, m->id.version);
  anotar("control %s: botones%s", m->ruta, botones[0] ? botones : " (ninguno)");
  for (int a = 0; a < ABS_CNT; a++)
    if (BIT(m->bits_abs, a))
      anotar("control %s: eje %d de %d a %d, reposo %d, zona muerta %d", m->ruta, a, m->info[a].minimum,
             m->info[a].maximum, m->info[a].value, m->info[a].flat);
}

static int ya_abierto(const char *ruta) {
  for (int i = 0; i < n_mandos; i++)
    if (!strcmp(mandos[i].ruta, ruta)) return 1;
  return 0;
}

static void buscar_mandos(void) {
  for (int n = 0; n < 32 && n_mandos < MAX_MANDOS; n++) {
    char ruta[32];
    snprintf(ruta, sizeof ruta, "/dev/input/event%d", n);
    if (ya_abierto(ruta)) continue;
    int fd = open(ruta, O_RDONLY | O_NONBLOCK);
    if (fd < 0) continue;
    Mando *m = &mandos[n_mandos++];
    memset(m, 0, sizeof *m);
    m->fd = fd;
    strcpy(m->ruta, ruta);
    if (ioctl(fd, EVIOCGNAME(sizeof m->nombre), m->nombre) < 0) strcpy(m->nombre, "(sin nombre)");
    ioctl(fd, EVIOCGID, &m->id);
    ioctl(fd, EVIOCGBIT(EV_ABS, sizeof m->bits_abs), m->bits_abs);
    for (int a = 0; a < ABS_CNT; a++)
      if (BIT(m->bits_abs, a) && ioctl(fd, EVIOCGABS(a), &m->info[a]) == 0) m->ejes[a] = m->info[a].value;
    anotar_mando(m);
  }
}

static void evento_visible(Mando *m, const char *formato, ...) {
  char linea[64];
  va_list args;
  va_start(args, formato);
  vsnprintf(linea, sizeof linea, formato, args);
  va_end(args);
  memmove(m->eventos[1], m->eventos[0], sizeof m->eventos[0] * (MAX_EVENTOS - 1));
  strcpy(m->eventos[0], linea);
  if (m->n_eventos < MAX_EVENTOS) m->n_eventos++;
}

static void probar_sonido(void) {
  if (!sonido[0] || simulado) return;
  if (reproduciendo > 0 && waitpid(reproduciendo, NULL, WNOHANG) == 0) return;  // aún suena
  reproduciendo = fork();
  if (reproduciendo == 0) {
    int nulo = open("/dev/null", O_WRONLY);
    dup2(nulo, 1);
    dup2(nulo, 2);
    execl("/usr/res/bin/aplay", "aplay", "-q", sonido, (char *)NULL);
    _exit(127);
  }
  anotar("sonido: aplay %s (proceso %d)", sonido, reproduciendo);
}

static void buscar_sonido(void) {
  DIR *d = opendir("/usr/res/wav");
  if (!d) return;
  struct dirent *e;
  while ((e = readdir(d))) {
    size_t n = strlen(e->d_name);
    if (n > 4 && !strcasecmp(e->d_name + n - 4, ".wav")) {
      snprintf(sonido, sizeof sonido, "/usr/res/wav/%s", e->d_name);
      break;
    }
  }
  closedir(d);
  anotar("sonido: %s", sonido[0] ? sonido : "no hay .wav en /usr/res/wav");
}

static long ultimo_uso;

static void leer_mando(Mando *m) {
  struct input_event ev;
  while (read(m->fd, &ev, sizeof ev) == sizeof ev) {
    if (ev.type == EV_SYN || ev.type == EV_MSC) continue;
    long t = ahora_ms();
    anotar("evento %s tipo %u código %u valor %d", m->ruta, ev.type, ev.code, ev.value);
    ultimo_uso = t;
    if (ev.type == EV_KEY && ev.code < KEY_CNT) {
      m->botones[ev.code] = ev.value != 0;
      if (ev.value == 1) {
        m->desde[ev.code] = t;
        probar_sonido();
      }
      evento_visible(m, "Botón %u %s", ev.code, ev.value ? (ev.value == 2 ? "repite" : "apretado") : "suelto");
    } else if (ev.type == EV_ABS && ev.code < ABS_CNT) {
      m->ejes[ev.code] = ev.value;
      evento_visible(m, "Eje %u = %d", ev.code, ev.value);
    }
  }
}

// En la laptop: un tablero ficticio con dos botones apretados y la palanca a la derecha.
static void simular_mando(void) {
  Mando *m = &mandos[n_mandos++];
  memset(m, 0, sizeof *m);
  m->fd = -1;
  strcpy(m->ruta, "/dev/input/event2");
  strcpy(m->nombre, "DragonRise Inc.   Generic   USB  Joystick  ");
  m->id = (struct input_id){BUS_USB, 0x0079, 0x0006, 0x0110};
  int ejes[] = {ABS_X, ABS_Y, ABS_Z, ABS_RX, ABS_RZ, ABS_HAT0X, ABS_HAT0Y};
  for (unsigned i = 0; i < sizeof ejes / sizeof *ejes; i++) {
    int a = ejes[i];
    m->bits_abs[a / BITS_POR_LARGO] |= 1UL << (a % BITS_POR_LARGO);
    m->info[a] = a >= ABS_HAT0X ? (struct input_absinfo){0, -1, 1, 0, 0, 0} : (struct input_absinfo){127, 0, 255, 0, 15, 0};
    m->ejes[a] = m->info[a].value;
  }
  m->ejes[ABS_X] = 255;
  m->botones[288] = m->botones[297] = 1;
  evento_visible(m, "Eje 0 = 255");
  evento_visible(m, "Botón 297 apretado");
  evento_visible(m, "Botón 288 apretado");
  anotar_mando(m);
}

// ---- Dibujo -----------------------------------------------------------------------------------

static void dibujar(long restante_ms, long sin_uso_ms) {
  const uint32_t fondo = color(8, 8, 20), rosa = color(255, 22, 140), cian = color(0, 229, 255),
                 blanco = color(240, 240, 240), gris = color(110, 110, 140), amarillo = color(255, 210, 63),
                 verde = color(60, 220, 120), apagado = color(40, 40, 70);
  int W = pantalla.ancho, H = pantalla.alto;
  int e = W >= 1600 ? 4 : (W >= 1000 ? 3 : 2);  // escala de la fuente según la resolución
  int lh = 8 * e + e * 3;
  rectangulo(0, 0, W, H, fondo);
  rectangulo(0, 0, W, lh + 2 * e, color(30, 0, 40));
  texto(4 * e, e * 2, e, rosa, "NEO ARCADE LITE");
  texto(4 * e + 16 * 8 * e, e * 2, e, cian, "· prueba del Game Stick");

  int y = lh + 6 * e;
  char linea[160];
  snprintf(linea, sizeof linea, "Pantalla %dx%d, %d bits%s", W, H, pantalla.bpp, simulado ? " (simulada)" : "");
  texto(4 * e, y, e, gris, linea);
  y += lh;
  texto(4 * e, y, e, blanco, "Aprieta cada botón y mueve la palanca.");
  y += lh * 3 / 2;
  if (!n_mandos) {
    texto(4 * e, y, e, amarillo, "No encuentro controles. Conecta el tablero al USB.");
  }
  int columnas = (W - 8 * e) / (8 * e);
  for (int i = 0; i < n_mandos && y < H - 4 * lh; i++) {
    Mando *m = &mandos[i];
    int eje_xy = BIT(m->bits_abs, ABS_X) && BIT(m->bits_abs, ABS_Y);
    // El nombre sin los espacios repetidos que traen algunos tableros, y cortado al ancho.
    char nombre[128];
    int n = 0;
    for (const char *c = m->nombre; *c && n < (int)sizeof nombre - 1; c++)
      if (!(*c == ' ' && (n == 0 || nombre[n - 1] == ' '))) nombre[n++] = *c;
    while (n > 0 && nombre[n - 1] == ' ') n--;
    nombre[n] = 0;
    snprintf(linea, sizeof linea, "%s  %04x:%04x  %s", m->ruta + 11, m->id.vendor, m->id.product, nombre);
    if ((int)strlen(linea) > columnas) linea[columnas] = 0;
    texto(4 * e, y, e, eje_xy ? cian : gris, linea);
    y += lh;
    if (!eje_xy) continue;  // el control remoto o un teclado: solo se lista
    // Doce botones del 288 al 299, como los de un tablero Zero Delay.
    int caja = 12 * e, sep = 2 * e, chica = e > 1 ? e - 1 : 1;
    for (int b = 0; b < 12; b++) {
      int x = 4 * e + b * (caja + sep);
      int on = m->botones[288 + b];
      rectangulo(x, y, caja, caja, on ? rosa : apagado);
      char num[4];
      snprintf(num, sizeof num, "%d", b + 1);
      texto(x + (caja - (int)strlen(num) * 8 * chica) / 2, y + (caja - 8 * chica) / 2, chica, blanco, num);
    }
    // Palanca: un punto que se mueve con los ejes 0 y 1.
    int px = 4 * e + 12 * (caja + sep) + 4 * e, lado = caja * 2;
    marco(px, y, lado, lado, chica, gris);
    int cx = px + lado / 2, cy = y + lado / 2;
    struct input_absinfo *ix = &m->info[ABS_X], *iy = &m->info[ABS_Y];
    int dx = ix->maximum > ix->minimum ? (m->ejes[ABS_X] - ix->minimum) * lado / (ix->maximum - ix->minimum) - lado / 2 : 0;
    int dy = iy->maximum > iy->minimum ? (m->ejes[ABS_Y] - iy->minimum) * lado / (iy->maximum - iy->minimum) - lado / 2 : 0;
    rectangulo(cx + dx * 8 / 10 - e * 2, cy + dy * 8 / 10 - e * 2, e * 4, e * 4, verde);
    snprintf(linea, sizeof linea, "X %d  Y %d", m->ejes[ABS_X], m->ejes[ABS_Y]);
    texto(px + lado + 3 * e, y + lado / 2 - 4 * e, e, gris, linea);
    y += lado + lh / 2;
    for (int k = 0; k < m->n_eventos && k < 4; k++) {
      texto(8 * e, y, e, k == 0 ? amarillo : gris, m->eventos[k]);
      y += lh;
    }
    y += lh / 2;
  }
  // Pie: cómo salir y cuánto falta.
  snprintf(linea, sizeof linea, "Mantén un botón 5 s para salir · se cierra en %ld s", (restante_ms < sin_uso_ms ? restante_ms : sin_uso_ms) / 1000);
  rectangulo(0, H - lh - 4 * e, W, lh + 4 * e, color(30, 0, 40));
  texto(4 * e, H - lh - e, e, blanco, linea);
}

// ---- Principal --------------------------------------------------------------------------------

int main(int argc, char **argv) {
  const char *ruta_registro = argc > 1 ? argv[1] : "/mnt/neo/registro-prueba.txt";
  registro = fopen(ruta_registro, "a");
  signal(SIGCHLD, SIG_DFL);
  anotar("inicio de la prueba");
  if (abrir_pantalla(anotar) < 0) {
    anotar("sin pantalla: se termina");
    return 1;
  }
  simulado = pantalla.simulada;
  buscar_sonido();
  if (simulado) simular_mando(); else buscar_mandos();

  long inicio = ahora_ms(), ultima_busqueda = inicio;
  ultimo_uso = inicio;
  for (;;) {
    long t = ahora_ms();
    if (!simulado && t - ultima_busqueda > 2000) {  // controles conectados después
      buscar_mandos();
      ultima_busqueda = t;
    }
    for (int i = 0; i < n_mandos; i++)
      if (mandos[i].fd >= 0) leer_mando(&mandos[i]);
    const char *motivo = NULL;
    for (int i = 0; i < n_mandos && !motivo; i++)
      for (int k = 0; k < KEY_CNT; k++)
        if (mandos[i].botones[k] && t - mandos[i].desde[k] >= SALIR_MANTENIENDO_MS && !simulado) {
          motivo = "botón mantenido 5 s";
          break;
        }
    if (!motivo && t - ultimo_uso >= SALIR_SIN_USO_MS) motivo = "60 s sin uso";
    if (!motivo && t - inicio >= SALIR_TOTAL_MS) motivo = "3 minutos";
    dibujar(SALIR_TOTAL_MS - (t - inicio), SALIR_SIN_USO_MS - (t - ultimo_uso));
    mostrar();
    if (simulado) {
      const char *captura = getenv("NEO_CAPTURA");
      if (captura) guardar_png(captura);
      motivo = "simulación";
    }
    if (motivo) {
      anotar("fin de la prueba: %s", motivo);
      break;
    }
    usleep(50000);
  }
  limpiar_pantalla();  // en negro antes de devolverle el control al menú de fábrica
  if (registro) fclose(registro);
  return 0;
}
