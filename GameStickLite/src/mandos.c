#include "mandos.h"

#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <linux/input.h>
#include <linux/usbdevice_fs.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/stat.h>
#include <sys/sysmacros.h>
#include <unistd.h>

#define MAX_MANDOS 4
#define BITS_POR_LARGO (sizeof(long) * 8)
#define BIT(arreglo, n) ((arreglo[(n) / BITS_POR_LARGO] >> ((n) % BITS_POR_LARGO)) & 1)

// El kernel 3.0.50 del Game Stick pone al DragonRise 0079:0006 en su lista de «tiene driver
// especial» (hid_have_special_driver) pero no compila ese driver (CONFIG_HID_DRAGONRISE): ningún
// driver lo toma y no aparece en /dev/input. Se lee directo por USB (usbfs, /dev/bus/usb) y sus
// reportes se traducen a los mismos códigos que da Linux cuando sí lo maneja (como en la MP80).
// Reporte de 8 bytes: X, Y, Z, Z, Rz; cruceta en los 4 bits bajos del byte 5 (0 arriba … 7 arriba a
// la izquierda; otro valor es centro); botones 1 a 4 en los 4 bits altos del byte 5 y 5 a 12 en el 6.

// Para el tablero DragonRise 0079:0006 se usa el mapeo que el usuario hizo en Neo Arcade (MP80,
// ~/NeoRetro/config/mandos.json): 288 a, 289 b, 290 x, 291 y, 292 rt, 293 lt, 296 start, 297 select
// (moneda), 298 rb, 299 lb, y la palanca girada: el eje 0 es arriba (-) y abajo (+), el eje 1 es
// derecha (-) e izquierda (+). Como en Neo Arcade, la A del tablero (abajo, al estilo Xbox) es la B
// del RetroPad.
typedef struct {
  int fd;
  int tablero;
  int usb;  // 1 si se lee por usbfs en lugar de evdev
  uint8_t reporte[64];
  int reportes_anotados;
  int botones[KEY_CNT];
  int ejes[ABS_CNT];
  struct input_absinfo info[ABS_CNT];
  unsigned long bits_abs[ABS_CNT / BITS_POR_LARGO + 1];
  struct usbdevfs_urb urb;  // al final: termina en un arreglo de tamaño variable (iso_frame_desc)
} Mando;

static Mando mandos[MAX_MANDOS];
static int n_mandos;
static void (*anotar_mandos)(const char *formato, ...);

static int leer_entero(const char *ruta, int base) {
  FILE *f = fopen(ruta, "r");
  if (!f) return -1;
  char texto[32] = "";
  if (!fgets(texto, sizeof texto, f)) texto[0] = 0;
  fclose(f);
  return texto[0] ? (int)strtol(texto, NULL, base) : -1;
}

static int pedir_reporte(Mando *m) {
  return ioctl(m->fd, USBDEVFS_SUBMITURB, &m->urb);
}

// Tableros DragonRise por usbfs: los busca en /sys/bus/usb/devices.
static void abrir_tableros_usb(void) {
  DIR *d = opendir("/sys/bus/usb/devices");
  if (!d) return;
  struct dirent *e;
  while ((e = readdir(d)) && n_mandos < MAX_MANDOS) {
    if (e->d_name[0] == '.' || strchr(e->d_name, ':')) continue;  // solo aparatos, no interfaces
    char ruta[256];
    snprintf(ruta, sizeof ruta, "/sys/bus/usb/devices/%s/idVendor", e->d_name);
    int vendor = leer_entero(ruta, 16);
    snprintf(ruta, sizeof ruta, "/sys/bus/usb/devices/%s/idProduct", e->d_name);
    int producto = leer_entero(ruta, 16);
    if (vendor != 0x0079 || producto != 0x0006) continue;
    snprintf(ruta, sizeof ruta, "/sys/bus/usb/devices/%s/busnum", e->d_name);
    int bus = leer_entero(ruta, 10);
    snprintf(ruta, sizeof ruta, "/sys/bus/usb/devices/%s/devnum", e->d_name);
    int num = leer_entero(ruta, 10);
    // Punto de entrada de interrupción de la interfaz 0 (casi siempre 0x81) y su tamaño.
    int punto = 0x81, tam = 8;
    snprintf(ruta, sizeof ruta, "/sys/bus/usb/devices/%s/%s:1.0", e->d_name, e->d_name);
    DIR *di = opendir(ruta);
    if (di) {
      struct dirent *p;
      while ((p = readdir(di)))
        if (!strncmp(p->d_name, "ep_8", 4)) {
          char r[512];
          snprintf(r, sizeof r, "%s/%s/bmAttributes", ruta, p->d_name);
          if (leer_entero(r, 16) != 3) continue;  // 3: interrupción
          snprintf(r, sizeof r, "%s/%s/bEndpointAddress", ruta, p->d_name);
          punto = leer_entero(r, 16);
          snprintf(r, sizeof r, "%s/%s/wMaxPacketSize", ruta, p->d_name);
          tam = leer_entero(r, 16);
          break;
        }
      closedir(di);
    }
    char nodo[64];
    snprintf(nodo, sizeof nodo, "/dev/bus/usb/%03d/%03d", bus, num);
    int fd = open(nodo, O_RDWR);
    if (fd < 0) {  // sin el nodo en /dev, se crea uno propio (major 189 de usb_device)
      snprintf(nodo, sizeof nodo, "/tmp/neo-usb-%03d-%03d", bus, num);
      mknod(nodo, S_IFCHR | 0600, makedev(189, (bus - 1) * 128 + (num - 1)));
      fd = open(nodo, O_RDWR);
    }
    if (fd < 0) {
      if (anotar_mandos) anotar_mandos("control USB %s: no se pudo abrir %s (%s)", e->d_name, nodo, strerror(errno));
      continue;
    }
    unsigned interfaz = 0;
    if (ioctl(fd, USBDEVFS_CLAIMINTERFACE, &interfaz) < 0) {
      if (anotar_mandos) anotar_mandos("control USB %s: no se pudo tomar la interfaz 0 (%s)", e->d_name, strerror(errno));
      close(fd);
      continue;
    }
    Mando *m = &mandos[n_mandos];
    memset(m, 0, sizeof *m);
    m->fd = fd;
    m->usb = 1;
    m->tablero = 1;
    if (tam <= 0 || tam > (int)sizeof m->reporte) tam = 8;
    m->urb.type = USBDEVFS_URB_TYPE_INTERRUPT;
    m->urb.endpoint = (unsigned char)punto;
    m->urb.buffer = m->reporte;
    m->urb.buffer_length = tam;
    for (int a = 0; a < 5; a++) {  // los cinco ejes de 0 a 255, en el centro
      int eje = a == 3 ? ABS_RX : a == 4 ? ABS_RZ : a;
      m->info[eje] = (struct input_absinfo){127, 0, 255, 0, 15, 0};
      m->ejes[eje] = 127;
      m->bits_abs[eje / BITS_POR_LARGO] |= 1UL << (eje % BITS_POR_LARGO);
    }
    if (pedir_reporte(m) < 0) {
      if (anotar_mandos) anotar_mandos("control USB %s: no se pudo pedir un reporte (%s)", e->d_name, strerror(errno));
      ioctl(fd, USBDEVFS_RELEASEINTERFACE, &interfaz);
      close(fd);
      continue;
    }
    n_mandos++;
    if (anotar_mandos)
      anotar_mandos("control %d: %s por USB directo (bus %d, aparato %d, punto 0x%02x de %d bytes), DragonRise 0079:0006 "
                    "(mapeo del tablero del usuario)", n_mandos, nodo, bus, num, punto, tam);
  }
  closedir(d);
}

static void traducir_reporte(Mando *m, const uint8_t *r, int n) {
  if (n < 7) return;
  m->ejes[ABS_X] = r[0];
  m->ejes[ABS_Y] = r[1];
  m->ejes[ABS_Z] = r[2];
  m->ejes[ABS_RX] = r[3];
  m->ejes[ABS_RZ] = r[4];
  static const int hx[8] = {0, 1, 1, 1, 0, -1, -1, -1}, hy[8] = {-1, -1, 0, 1, 1, 1, 0, -1};
  int cruceta = r[5] & 0x0F;
  m->ejes[ABS_HAT0X] = cruceta < 8 ? hx[cruceta] : 0;
  m->ejes[ABS_HAT0Y] = cruceta < 8 ? hy[cruceta] : 0;
  unsigned botones = (r[5] >> 4) | ((unsigned)r[6] << 4);
  for (int b = 0; b < 12; b++) m->botones[288 + b] = (botones >> b) & 1;
}

int abrir_mandos(void (*registrar)(const char *formato, ...)) {
  anotar_mandos = registrar;
  abrir_tableros_usb();
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
    Mando *m = &mandos[i];
    if (m->usb) {
      struct usbdevfs_urb *listo = NULL;
      while (m->fd >= 0 && ioctl(m->fd, USBDEVFS_REAPURBNDELAY, &listo) == 0 && listo) {
        if (listo->status == 0 && listo->actual_length > 0) {
          if (m->reportes_anotados < 20 && anotar_mandos) {  // los primeros, para revisar el formato
            char hex[3 * 16 + 1] = "";
            for (int k = 0; k < listo->actual_length && k < 16; k++) sprintf(hex + 3 * k, "%02x ", m->reporte[k]);
            anotar_mandos("control %d: reporte %s", i + 1, hex);
            m->reportes_anotados++;
          }
          traducir_reporte(m, m->reporte, listo->actual_length);
          hubo = true;
        }
        if (listo->status == -ENODEV || listo->status == -ESHUTDOWN || pedir_reporte(m) < 0) {
          if (anotar_mandos) anotar_mandos("control %d: desconectado (%d)", i + 1, listo->status);
          close(m->fd);
          m->fd = -1;
        }
        listo = NULL;
      }
      continue;
    }
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
  for (int i = 0; i < n_mandos; i++) {
    Mando *m = &mandos[i];
    if (m->fd < 0) continue;
    if (m->usb) {  // se cancela el pedido pendiente y se suelta la interfaz para que otro programa la tome
      ioctl(m->fd, USBDEVFS_DISCARDURB, &m->urb);
      struct usbdevfs_urb *listo = NULL;
      ioctl(m->fd, USBDEVFS_REAPURBNDELAY, &listo);
      unsigned interfaz = 0;
      ioctl(m->fd, USBDEVFS_RELEASEINTERFACE, &interfaz);
    }
    close(m->fd);
  }
  n_mandos = 0;
}
