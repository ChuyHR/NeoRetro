// neo-retro: frontend libretro mínimo para el Game Stick. El núcleo va enlazado dentro del programa
// (estático con musl, sin dlopen): se compila un neo-retro-<sistema> por núcleo. Video directo a
// /dev/fb0 con escala entera y centrado, sonido por ALSA con tinyalsa (el sonido marca el paso del
// juego) y controles por evdev (mandos.c).
// Salir: Select + Start (moneda + Start en un tablero). No se sale por inactividad: un juego en pausa
// no se cierra solo.
// Partidas: la memoria de guardado del cartucho (y el reloj, en los que lo tienen) se lee de
// /mnt/neo/partidas/<sistema>/ al abrir y se escribe cuando cambia (revisando cada 30 s) y al salir.
//
// En la laptop (QEMU): NEO_SIMULAR=1 corre NEO_CUADROS cuadros sin sonido y guarda el último en
// NEO_CAPTURA como PNG.
// Uso: neo-retro-<sistema> <juego> [registro]
#include <errno.h>
#include <signal.h>
#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <time.h>
#include <tinyalsa/asoundlib.h>
#include <unistd.h>

#include "libretro.h"
#include "mandos.h"
#include "pantalla.h"

#define REVISAR_PARTIDA_MS 30000

static FILE *registro;
static long inicio_ms;

static long ahora_ms(void) {
  struct timespec t;
  clock_gettime(CLOCK_MONOTONIC, &t);
  return t.tv_sec * 1000L + t.tv_nsec / 1000000L;
}

static void anotar(const char *formato, ...) {
  if (!registro) return;
  va_list args;
  va_start(args, formato);
  fprintf(registro, "%7.2f ", (ahora_ms() - inicio_ms) / 1000.0);
  vfprintf(registro, formato, args);
  fputc('\n', registro);
  va_end(args);
  fflush(registro);
}

static void registro_nucleo(enum retro_log_level nivel, const char *formato, ...) {
  if (!registro || nivel < RETRO_LOG_WARN) return;
  va_list args;
  va_start(args, formato);
  fprintf(registro, "núcleo: ");
  vfprintf(registro, formato, args);
  va_end(args);
  fflush(registro);
}

// ---- Video --------------------------------------------------------------------------------------

static enum retro_pixel_format formato_nucleo = RETRO_PIXEL_FORMAT_0RGB1555;
static long cuadros;
static uint8_t *fila;  // una fila ya convertida y agrandada
static unsigned ultimo_w, ultimo_h;

static inline uint32_t convertir(const void *fuente, unsigned x) {
  int r, g, b;
  if (formato_nucleo == RETRO_PIXEL_FORMAT_XRGB8888) {
    uint32_t p = ((const uint32_t *)fuente)[x];
    r = (p >> 16) & 0xFF; g = (p >> 8) & 0xFF; b = p & 0xFF;
  } else if (formato_nucleo == RETRO_PIXEL_FORMAT_RGB565) {
    uint16_t p = ((const uint16_t *)fuente)[x];
    r = (p >> 8) & 0xF8; g = (p >> 3) & 0xFC; b = (p << 3) & 0xF8;
  } else {
    uint16_t p = ((const uint16_t *)fuente)[x];
    r = (p >> 7) & 0xF8; g = (p >> 2) & 0xF8; b = (p << 3) & 0xF8;
  }
  return color(r, g, b);
}

static void video(const void *datos, unsigned w, unsigned h, size_t paso) {
  cuadros++;
  if (!datos || !w || !h) return;  // el núcleo repite el cuadro anterior
  // Si el núcleo cambia de tamaño (algunos juegos de SNES lo hacen), se borra lo que sobra.
  if (w != ultimo_w || h != ultimo_h) {
    limpiar_pantalla();
    ultimo_w = w;
    ultimo_h = h;
  }
  int ew = pantalla.ancho / (int)w, eh = pantalla.alto / (int)h;
  int escala = ew < eh ? ew : eh;
  if (escala < 1) escala = 1;
  int ow = w * escala, oh = h * escala, ox = (pantalla.ancho - ow) / 2, oy = (pantalla.alto - oh) / 2;
  if (ox < 0) ox = 0;
  if (oy < 0) oy = 0;
  int bytes = pantalla.bpp / 8;
  uint8_t *destino = pantalla.fb ? pantalla.fb : pantalla.lienzo;
  if (!fila) fila = malloc((size_t)pantalla.ancho * bytes);
  for (unsigned y = 0; y < h && oy + (int)y * escala < pantalla.alto; y++) {
    const uint8_t *fuente = (const uint8_t *)datos + y * paso;
    uint8_t *f = fila;
    for (unsigned x = 0; x < w && (int)(x + 1) * escala <= pantalla.ancho; x++) {
      uint32_t c = convertir(fuente, x);
      for (int k = 0; k < escala; k++, f += bytes) {
        if (bytes == 4) *(uint32_t *)f = c;
        else if (bytes == 2) *(uint16_t *)f = (uint16_t)c;
        else { f[0] = c; f[1] = c >> 8; f[2] = c >> 16; }
      }
    }
    for (int k = 0; k < escala && oy + (int)y * escala + k < pantalla.alto; k++)
      memcpy(destino + (size_t)(oy + y * escala + k) * pantalla.paso + (size_t)ox * bytes, fila, f - fila);
  }
}

// ---- Sonido -------------------------------------------------------------------------------------

static struct pcm *pcm;
static int16_t sonido[16384 * 2];
static size_t n_sonido;  // cuadros (pares izquierda/derecha) acumulados
static long subocupaciones;
// Cada núcleo produce el sonido a su frecuencia (32 040 Hz Snes9x, 32 768 Gambatte, 65 536 gpSP) y la
// salida suele aceptar solo 48 000 o 44 100: se convierte con interpolación lineal.
static double paso_tasa = 1.0;  // muestras del núcleo por cada muestra de salida
static double posicion = -1.0;  // en las muestras del núcleo; -1 es la última del lote anterior
static int16_t anterior[2];
static int16_t convertido[32768 * 2];

static void abrir_sonido(unsigned tasa_nucleo) {
  unsigned tasas[] = {tasa_nucleo, 48000, 44100};
  for (unsigned t = 0; t < 3; t++) {
    if (t > 0 && tasas[t] == tasa_nucleo) continue;
    struct pcm_config cfg = {.channels = 2, .rate = tasas[t], .period_size = 1024, .period_count = 4,
                             .format = PCM_FORMAT_S16_LE};
    for (unsigned tarjeta = 0; tarjeta < 2; tarjeta++)
      for (unsigned disp = 0; disp < 4; disp++) {
        struct pcm *p = pcm_open(tarjeta, disp, PCM_OUT, &cfg);
        if (p && pcm_is_ready(p)) {
          pcm = p;
          paso_tasa = (double)tasa_nucleo / tasas[t];
          anotar("sonido: tarjeta %u, dispositivo %u, %u Hz (el núcleo da %u Hz)", tarjeta, disp, tasas[t], tasa_nucleo);
          return;
        }
        if (p) {
          if (tarjeta == 0 && disp == 0) anotar("sonido: %u Hz en tarjeta 0, dispositivo 0: %s", tasas[t], pcm_get_error(p));
          pcm_close(p);
        }
      }
  }
  anotar("sonido: no se pudo abrir ningún dispositivo; el juego corre sin sonido");
}

// Convierte el lote acumulado a la frecuencia de salida. Devuelve los cuadros escritos en convertido.
static size_t convertir_tasa(void) {
  size_t n = 0, max = sizeof convertido / sizeof *convertido / 2;
  while (posicion < (double)n_sonido - 1 && n < max) {
    long i = (long)(posicion + 1.0) - 1;  // piso, también para -1 <= posicion < 0
    double f = posicion - i;
    for (int c = 0; c < 2; c++) {
      int a = i < 0 ? anterior[c] : sonido[i * 2 + c], b = sonido[(i + 1) * 2 + c];
      convertido[n * 2 + c] = (int16_t)(a + (b - a) * f);
    }
    n++;
    posicion += paso_tasa;
  }
  posicion -= n_sonido;
  anterior[0] = sonido[(n_sonido - 1) * 2];
  anterior[1] = sonido[(n_sonido - 1) * 2 + 1];
  return n;
}

static void guardar_sonido(const int16_t *datos, size_t n) {
  size_t cabe = sizeof sonido / sizeof *sonido / 2 - n_sonido;
  if (n > cabe) n = cabe;
  memcpy(sonido + n_sonido * 2, datos, n * 4);
  n_sonido += n;
}

static void muestra(int16_t izq, int16_t der) {
  int16_t par[2] = {izq, der};
  guardar_sonido(par, 1);
}

static size_t lote(const int16_t *datos, size_t n) {
  guardar_sonido(datos, n);
  return n;
}

// pcm_writei bloquea hasta que el dispositivo recibe el sonido: eso marca el paso del juego. Ante un
// hueco (underrun) tinyalsa prepara de nuevo el dispositivo por su cuenta; aquí solo se cuentan.
static void soltar_sonido(void) {
  if (pcm && n_sonido) {
    int r;
    if (paso_tasa == 1.0) {
      r = pcm_writei(pcm, sonido, n_sonido);
    } else {
      size_t n = convertir_tasa();
      r = n ? pcm_writei(pcm, convertido, n) : 0;
    }
    if (r < 0) subocupaciones++;
  }
  n_sonido = 0;
}

// ---- Entorno libretro ---------------------------------------------------------------------------

static bool entorno(unsigned cmd, void *datos) {
  switch (cmd) {
    case RETRO_ENVIRONMENT_SET_PIXEL_FORMAT: {
      enum retro_pixel_format f = *(enum retro_pixel_format *)datos;
      if (f == RETRO_PIXEL_FORMAT_XRGB8888 || f == RETRO_PIXEL_FORMAT_RGB565 || f == RETRO_PIXEL_FORMAT_0RGB1555) {
        formato_nucleo = f;
        anotar("video: formato del núcleo %d", f);
        return true;
      }
      return false;
    }
    case RETRO_ENVIRONMENT_GET_SYSTEM_DIRECTORY:
      *(const char **)datos = "/mnt/neo/sistema";
      return true;
    case RETRO_ENVIRONMENT_GET_SAVE_DIRECTORY:
      *(const char **)datos = "/mnt/neo/partidas";
      return true;
    case RETRO_ENVIRONMENT_GET_LOG_INTERFACE:
      ((struct retro_log_callback *)datos)->log = registro_nucleo;
      return true;
    case RETRO_ENVIRONMENT_GET_CAN_DUPE:
      *(bool *)datos = true;
      return true;
    case RETRO_ENVIRONMENT_GET_VARIABLE_UPDATE:
      *(bool *)datos = false;
      return true;
  }
  // Lo demás (opciones del núcleo, descriptores…) queda sin atender: el núcleo usa sus valores por
  // omisión.
  return false;
}

static long ultimo_uso;

static void sondear(void) {
  if (leer_mandos()) ultimo_uso = ahora_ms();
}

static int16_t estado(unsigned puerto, unsigned dispositivo, unsigned indice, unsigned id) {
  if (dispositivo != RETRO_DEVICE_JOYPAD) return 0;
  return apretado((int)puerto, (int)id);
}

// ---- Partidas ------------------------------------------------------------------------------------

typedef struct {
  unsigned tipo;           // RETRO_MEMORY_SAVE_RAM o RETRO_MEMORY_RTC
  const char *extension;   // .srm o .rtc, como RetroArch
  char ruta[512];
  uint32_t huella;         // de lo último escrito o leído
} Memoria;

static Memoria memorias[] = {{RETRO_MEMORY_SAVE_RAM, ".srm"}, {RETRO_MEMORY_RTC, ".rtc"}};
#define N_MEMORIAS (int)(sizeof memorias / sizeof *memorias)

static volatile sig_atomic_t terminar;
static void pedir_terminar(int senal) { terminar = senal; }

static uint32_t huella(const uint8_t *d, size_t n) {  // FNV-1a: alcanza para saber si cambió
  uint32_t h = 2166136261u;
  while (n--) h = (h ^ *d++) * 16777619u;
  return h;
}

// sistema sale del nombre del programa (neo-retro-gb → gb); juego, del archivo sin la extensión.
static void preparar_partidas(const char *programa, const char *juego) {
  const char *p = strrchr(programa, '-');
  const char *sistema = p ? p + 1 : "otros";
  const char *raiz = getenv("NEO_PARTIDAS") ? getenv("NEO_PARTIDAS") : "/mnt/neo/partidas";  // otra en las pruebas
  char carpeta[256];
  snprintf(carpeta, sizeof carpeta, "%s/%s", raiz, sistema);
  mkdir(raiz, 0755);
  mkdir(carpeta, 0755);
  const char *base = strrchr(juego, '/');
  base = base ? base + 1 : juego;
  char nombre[256];
  snprintf(nombre, sizeof nombre, "%s", base);
  char *punto = strrchr(nombre, '.');
  if (punto && punto != nombre) *punto = 0;
  for (int i = 0; i < N_MEMORIAS; i++) {
    Memoria *m = &memorias[i];
    snprintf(m->ruta, sizeof m->ruta, "%s/%s%s", carpeta, nombre, m->extension);
    size_t tam = retro_get_memory_size(m->tipo);
    uint8_t *datos = retro_get_memory_data(m->tipo);
    if (!tam || !datos) continue;
    FILE *f = fopen(m->ruta, "rb");
    if (f) {
      size_t leidos = fread(datos, 1, tam, f);
      fclose(f);
      anotar("partida: se cargaron %zu de %zu bytes de %s", leidos, tam, m->ruta);
    }
    m->huella = huella(datos, tam);
  }
}

static void guardar_partidas(void) {
  for (int i = 0; i < N_MEMORIAS; i++) {
    Memoria *m = &memorias[i];
    size_t tam = retro_get_memory_size(m->tipo);
    uint8_t *datos = retro_get_memory_data(m->tipo);
    if (!tam || !datos || !m->ruta[0]) continue;
    uint32_t h = huella(datos, tam);
    if (h == m->huella) continue;  // sin cambios no se escribe: la tarjeta dura más
    // Se escribe aparte y se renombra: si se apaga a la mitad, la partida anterior queda entera.
    char temporal[520];
    snprintf(temporal, sizeof temporal, "%s.nuevo", m->ruta);
    FILE *f = fopen(temporal, "wb");
    if (!f) {
      anotar("partida: no se pudo escribir %s (%s)", temporal, strerror(errno));
      continue;
    }
    size_t escritos = fwrite(datos, 1, tam, f);
    fflush(f);
    fsync(fileno(f));
    fclose(f);
    if (escritos == tam && rename(temporal, m->ruta) == 0) {
      m->huella = h;
      anotar("partida: guardados %zu bytes en %s", tam, m->ruta);
    } else {
      anotar("partida: falló al guardar %s (%s)", m->ruta, strerror(errno));
    }
  }
  sync();
}

// Juego en memoria para los núcleos que lo aceptan así; los que piden la ruta (need_fullpath) la usan.
static void *leer_archivo(const char *ruta, long *tam) {
  FILE *f = fopen(ruta, "rb");
  if (!f) return NULL;
  fseek(f, 0, SEEK_END);
  *tam = ftell(f);
  fseek(f, 0, SEEK_SET);
  void *datos = malloc(*tam);
  if (datos && fread(datos, 1, *tam, f) != (size_t)*tam) {
    free(datos);
    datos = NULL;
  }
  fclose(f);
  return datos;
}

int main(int argc, char **argv) {
  inicio_ms = ahora_ms();
  if (argc < 2) {
    fprintf(stderr, "Uso: neo-retro <juego> [registro]\n");
    return 2;
  }
  registro = fopen(argc > 2 ? argv[2] : "/mnt/neo/registro-retro.txt", "a");
  anotar("inicio: %s", argv[1]);
  if (abrir_pantalla(anotar) < 0) {
    anotar("sin pantalla: se termina");
    return 1;
  }
  limpiar_pantalla();
  mkdir("/mnt/neo/partidas", 0755);

  retro_set_environment(entorno);
  retro_set_video_refresh(video);
  retro_set_audio_sample(muestra);
  retro_set_audio_sample_batch(lote);
  retro_set_input_poll(sondear);
  retro_set_input_state(estado);
  retro_init();
  struct retro_system_info sistema;
  memset(&sistema, 0, sizeof sistema);
  retro_get_system_info(&sistema);
  anotar("núcleo: %s %s%s", sistema.library_name, sistema.library_version,
         sistema.need_fullpath ? " (lee el juego por su ruta)" : "");

  struct retro_game_info info = {.path = argv[1]};
  long tam = 0;
  if (!sistema.need_fullpath) {
    info.data = leer_archivo(argv[1], &tam);
    info.size = tam;
    if (!info.data) {
      anotar("no se pudo leer el juego (%s)", strerror(errno));
      return 1;
    }
  }
  if (!retro_load_game(&info)) {
    anotar("el núcleo no aceptó el juego");
    retro_deinit();
    limpiar_pantalla();
    return 1;
  }
  preparar_partidas(argv[0], argv[1]);
  // Si a este programa lo terminan desde fuera (el timeout del arranque, por ejemplo), sale por el
  // camino normal y guarda la partida.
  signal(SIGTERM, pedir_terminar);
  signal(SIGINT, pedir_terminar);
  signal(SIGHUP, pedir_terminar);
  struct retro_system_av_info av;
  retro_get_system_av_info(&av);
  anotar("video: %ux%u, %.3f cuadros por segundo; sonido %.0f Hz", av.geometry.base_width,
         av.geometry.base_height, av.timing.fps, av.timing.sample_rate);

  int simulado = pantalla.simulada;
  long cuadros_simulados = getenv("NEO_CUADROS") ? atol(getenv("NEO_CUADROS")) : 300;
  if (!simulado) {
    abrir_mandos(anotar);
    abrir_sonido((unsigned)(av.timing.sample_rate + 0.5));
  }
  for (int i = 0; i < numero_de_mandos(); i++) retro_set_controller_port_device(i, RETRO_DEVICE_JOYPAD);

  // En la simulación, NEO_SALIDA_HZ prueba la conversión de frecuencia sin dispositivo de sonido.
  long entraron = 0, salieron = 0;
  if (simulado && getenv("NEO_SALIDA_HZ")) paso_tasa = av.timing.sample_rate / atof(getenv("NEO_SALIDA_HZ"));

  // Sin sonido, el paso lo marca el reloj.
  long periodo_us = (long)(1000000.0 / av.timing.fps), siguiente = 0, ultimo_informe = ahora_ms();
  long ultima_revision = ahora_ms();
  ultimo_uso = ahora_ms();
  const char *motivo = NULL;
  while (!motivo) {
    retro_run();
    if (simulado) {
      if (paso_tasa != 1.0 && n_sonido) {
        entraron += n_sonido;
        salieron += convertir_tasa();
      }
      n_sonido = 0;
      if (cuadros >= cuadros_simulados) {
        motivo = "simulación";
        if (entraron) anotar("sonido simulado: %ld muestras del núcleo, %ld convertidas (razón %.4f, esperada %.4f)",
                             entraron, salieron, (double)entraron / salieron, paso_tasa);
      }
      continue;
    }
    if (pcm) {
      soltar_sonido();
    } else {
      struct timespec t;
      clock_gettime(CLOCK_MONOTONIC, &t);
      long us = t.tv_sec * 1000000L + t.tv_nsec / 1000;
      if (!siguiente) siguiente = us;
      siguiente += periodo_us;
      if (siguiente > us) usleep(siguiente - us);
      n_sonido = 0;
    }
    for (int i = 0; i < numero_de_mandos(); i++)
      if (apretado(i, BOTON_SELECT) && apretado(i, BOTON_START)) motivo = "Select + Start";
    if (terminar) motivo = "señal de terminar";
    if (ahora_ms() - ultima_revision >= REVISAR_PARTIDA_MS) {
      guardar_partidas();
      ultima_revision = ahora_ms();
    }
    if (ahora_ms() - ultimo_informe >= 10000) {
      anotar("rendimiento: %ld cuadros en %.1f s, %ld huecos de sonido", cuadros, (ahora_ms() - inicio_ms) / 1000.0,
             subocupaciones);
      ultimo_informe = ahora_ms();
    }
  }
  anotar("fin: %s, %ld cuadros", motivo, cuadros);
  if (simulado && getenv("NEO_CAPTURA")) guardar_png(getenv("NEO_CAPTURA"));
  guardar_partidas();
  retro_unload_game();
  retro_deinit();
  if (pcm) pcm_close(pcm);
  cerrar_mandos();
  limpiar_pantalla();
  if (registro) fclose(registro);
  return 0;
}
