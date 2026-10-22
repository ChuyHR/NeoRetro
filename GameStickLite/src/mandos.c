#include "mandos.h"

#include <fcntl.h>
#include <linux/input.h>
#include <stdio.h>
#include <string.h>
#include <sys/ioctl.h>
#include <unistd.h>

#define MAX_MANDOS 4
#define BITS_POR_LARGO (sizeof(long) * 8)
#define BIT(arreglo, n) ((arreglo[(n) / BITS_POR_LARGO] >> ((n) % BITS_POR_LARGO)) & 1)

// Para el tablero DragonRise 0079:0006 se usa el mapeo que el usuario hizo en Neo Arcade (MP80,
// ~/NeoRetro/config/mandos.json): 288 a, 289 b, 290 x, 291 y, 292 rt, 293 lt, 296 start, 297 select
// (moneda), 298 rb, 299 lb, y la palanca girada: el eje 0 es arriba (-) y abajo (+), el eje 1 es
// derecha (-) e izquierda (+). Como en Neo Arcade, la A del tablero (abajo, al estilo Xbox) es la B
// del RetroPad.
typedef struct {
  int fd;
  int tablero;
  int botones[KEY_CNT];
  int ejes[ABS_CNT];
  struct input_absinfo info[ABS_CNT];
  unsigned long bits_abs[ABS_CNT / BITS_POR_LARGO + 1];
} Mando;

static Mando mandos[MAX_MANDOS];
static int n_mandos;

int abrir_mandos(void (*registrar)(const char *formato, ...)) {
  for (int n = 0; n < 32 && n_mandos < MAX_MANDOS; n++) {
    char ruta[32];
    snprintf(ruta, sizeof ruta, "/dev/input/event%d", n);
    int fd = open(ruta, O_RDONLY | O_NONBLOCK);
    if (fd < 0) continue;
    Mando m;
    memset(&m, 0, sizeof m);
    m.fd = fd;
    struct input_id id = {0};
    ioctl(fd, EVIOCGID, &id);
    ioctl(fd, EVIOCGBIT(EV_ABS, sizeof m.bits_abs), m.bits_abs);
    if (!BIT(m.bits_abs, ABS_X) || !BIT(m.bits_abs, ABS_Y)) {
      close(fd);
      continue;
    }
    for (int a = 0; a < ABS_CNT; a++)
      if (BIT(m.bits_abs, a) && ioctl(fd, EVIOCGABS(a), &m.info[a]) == 0) m.ejes[a] = m.info[a].value;
    m.tablero = id.vendor == 0x0079 && id.product == 0x0006;
    mandos[n_mandos++] = m;
    if (registrar) {
      char nombre[128] = "";
      ioctl(fd, EVIOCGNAME(sizeof nombre), nombre);
      registrar("control %d: %s «%s» %04x:%04x%s", n_mandos, ruta, nombre, id.vendor, id.product,
                m.tablero ? " (mapeo del tablero del usuario)" : " (mapeo genérico)");
    }
  }
  return n_mandos;
}

bool leer_mandos(void) {
  bool hubo = false;
  for (int i = 0; i < n_mandos; i++) {
    struct input_event ev;
    while (read(mandos[i].fd, &ev, sizeof ev) == sizeof ev) {
      if (ev.type == EV_KEY && ev.code < KEY_CNT) {
        mandos[i].botones[ev.code] = ev.value != 0;
        hubo = true;
      } else if (ev.type == EV_ABS && ev.code < ABS_CNT) {
        mandos[i].ejes[ev.code] = ev.value;
        hubo = true;
      }
    }
  }
  return hubo;
}

int numero_de_mandos(void) { return n_mandos; }

// -1, 0 o 1 según el eje esté en un extremo (más allá del 30 % desde el centro).
static int lado(Mando *m, int eje) {
  struct input_absinfo *i = &m->info[eje];
  if (i->maximum <= i->minimum) return 0;
  int centro = (i->minimum + i->maximum) / 2, umbral = (i->maximum - i->minimum) * 3 / 10;
  if (m->ejes[eje] < centro - umbral) return -1;
  if (m->ejes[eje] > centro + umbral) return 1;
  return 0;
}

bool apretado(int n, int boton) {
  if (n < 0 || n >= n_mandos) return false;
  Mando *m = &mandos[n];
  int *b = m->botones;
  if (m->tablero) {
    switch (boton) {
      case BOTON_B: return b[288];
      case BOTON_A: return b[289];
      case BOTON_Y: return b[290];
      case BOTON_X: return b[291];
      case BOTON_R2: return b[292];
      case BOTON_L2: return b[293];
      case BOTON_START: return b[296];
      case BOTON_SELECT: return b[297];
      case BOTON_R: return b[298];
      case BOTON_L: return b[299];
      case BOTON_ARRIBA: return lado(m, ABS_X) < 0;
      case BOTON_ABAJO: return lado(m, ABS_X) > 0;
      case BOTON_DERECHA: return lado(m, ABS_Y) < 0;
      case BOTON_IZQUIERDA: return lado(m, ABS_Y) > 0;
    }
    return false;
  }
  // Genérico: botones de mando estándar (BTN_SOUTH…) o de palanca (BTN_TRIGGER…), cruceta y palanca.
  int hx = BIT(m->bits_abs, ABS_HAT0X) ? m->ejes[ABS_HAT0X] : 0;
  int hy = BIT(m->bits_abs, ABS_HAT0Y) ? m->ejes[ABS_HAT0Y] : 0;
  switch (boton) {
    case BOTON_B: return b[BTN_SOUTH] || b[288];
    case BOTON_A: return b[BTN_EAST] || b[289];
    case BOTON_Y: return b[BTN_WEST] || b[290];
    case BOTON_X: return b[BTN_NORTH] || b[291];
    case BOTON_L: return b[BTN_TL] || b[292];
    case BOTON_R: return b[BTN_TR] || b[293];
    case BOTON_SELECT: return b[BTN_SELECT] || b[296];
    case BOTON_START: return b[BTN_START] || b[297];
    case BOTON_ARRIBA: return hy < 0 || lado(m, ABS_Y) < 0;
    case BOTON_ABAJO: return hy > 0 || lado(m, ABS_Y) > 0;
    case BOTON_IZQUIERDA: return hx < 0 || lado(m, ABS_X) < 0;
    case BOTON_DERECHA: return hx > 0 || lado(m, ABS_X) > 0;
  }
  return false;
}

bool apretado_alguno(int boton) {
  for (int i = 0; i < n_mandos; i++)
    if (apretado(i, boton)) return true;
  return false;
}

void cerrar_mandos(void) {
  for (int i = 0; i < n_mandos; i++) close(mandos[i].fd);
  n_mandos = 0;
}
