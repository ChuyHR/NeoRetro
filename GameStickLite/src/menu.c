// neo-menu: menú de juegos de Neo Arcade Lite para el Game Stick. Se dibuja entero en el aparato
// (interfaz.c) con los juegos de roms/ y lo que traigan sus gamelist.xml e imágenes (biblioteca.c), y
// abre cada juego con su emulador (neo-retro-<sistema>, junto a este programa). Al terminar vuelve aquí.
//
// Botones (con el mapeo del tablero del usuario, ver mandos.c), como en Neo Arcade:
//   izquierda/derecha juego (con repetición al mantener) · arriba/abajo JUGAR o FAVORITO
//   A hace lo elegido abajo · X favorito · LB/RB sistema · LT/RT letra anterior/siguiente
//   Select (moneda) Favoritos y Recientes · Select + Start mantenidos 2 s: salir al menú de fábrica
//   (Start no abre juegos: con Select + Start para salir, un Start un instante antes abriría uno.)
// Sin ningún control conectado sale al menú de fábrica a los 30 s. No sale por inactividad.
//
// En la laptop (QEMU): NEO_SIMULAR=16 dibuja en memoria; NEO_SIMULAR_TECLAS aplica botones
// (derecha, izquierda, abajo, arriba, rb, lb, x, select, rt, lt) y NEO_CAPTURA guarda la pantalla.
// NEO_ROMS y NEO_NEO cambian las carpetas de juegos y de neo/.
// Uso: neo-menu [registro] [--portada]
#include <limits.h>
#include <math.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

#include "biblioteca.h"
#include "imagenes.h"
#include "interfaz.h"
#include "mandos.h"
#include "pantalla.h"
#include "texto.h"

#define SALIR_SIN_MANDOS_MS 30000
#define SALIR_MANTENIENDO_MS 2000
#define ANIMACION_MS 170

static FILE *registro;
static char carpeta_programas[PATH_MAX], carpeta_neo[PATH_MAX];
static const char *carpeta_roms = "/mnt/roms";
static EstadoUI ui;
static char aviso[160];
static long aviso_hasta, animacion_desde;
static float corrimiento_inicial;

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
  aviso_hasta = ahora_ms() + 2500;
}

static Juego *elegido(void) {
  Vista *v = &vistas[ui.vista];
  return v->n ? v->juegos[v->elegido] : NULL;
}

// ---- Acciones ------------------------------------------------------------------------------------

static void mover(int paso) {
  Vista *v = &vistas[ui.vista];
  if (v->n < 2) return;
  int nuevo = v->elegido + paso;
  if (nuevo < 0 || nuevo >= v->n) {  // da la vuelta, como Neo Arcade, sin animar el salto
    v->elegido = (nuevo + v->n) % v->n;
    ui.corrimiento = 0;
    animacion_desde = 0;
    return;
  }
  v->elegido = nuevo;
  // Las tarjetas arrancan de donde estaban y se deslizan a su lugar nuevo.
  corrimiento_inicial = ui.corrimiento + paso;
  if (corrimiento_inicial > 2) corrimiento_inicial = 2;  // pasos muy seguidos no se acumulan sin fin
  if (corrimiento_inicial < -2) corrimiento_inicial = -2;
  ui.corrimiento = corrimiento_inicial;
  animacion_desde = ahora_ms();
}

static void avanzar_animacion(long t) {
  if (!animacion_desde) return;
  float f = (float)(t - animacion_desde) / ANIMACION_MS;
  if (f >= 1) {
    ui.corrimiento = 0;
    animacion_desde = 0;
  } else {
    ui.corrimiento = corrimiento_inicial * (1 - f) * (1 - f);  // suave al final
  }
}

static void cambiar_vista(int paso) {
  ui.vista = (ui.vista + paso + n_vistas) % n_vistas;
  ui.corrimiento = 0;
  animacion_desde = 0;
}

static int letra(const char *titulo) {
  int c = (unsigned char)titulo[0];
  if (c >= 'a' && c <= 'z') c -= 32;
  return c >= 'A' && c <= 'Z' ? c : '#';
}

// Siguiente: el primer juego de la letra que sigue. Anterior: el primero de la letra que va antes.
static void saltar_letra(int adelante) {
  Vista *v = &vistas[ui.vista];
  if (v->n < 2) return;
  int i = v->elegido, actual = letra(v->juegos[i]->titulo);
  if (adelante) {
    while (i < v->n - 1 && letra(v->juegos[i]->titulo) == actual) i++;
  } else {
    while (i > 0 && letra(v->juegos[i - 1]->titulo) == actual) i--;
    if (i == v->elegido && i > 0) {
      int previa = letra(v->juegos[i - 1]->titulo);
      while (i > 0 && letra(v->juegos[i - 1]->titulo) == previa) i--;
    }
  }
  v->elegido = i;
  ui.corrimiento = 0;
  animacion_desde = 0;
}

static int vista_de_tipo(int tipo) {
  for (int v = 0; v < n_vistas; v++)
    if (vistas[v].tipo == tipo) return v;
  return 0;
}

// Select pasa por Favoritos, Recientes y de regreso a la vista donde estaba.
static int ultima_vista_real;
static void siguiente_lista(void) {
  int fav = vista_de_tipo(VISTA_FAVORITOS), rec = vista_de_tipo(VISTA_RECIENTES);
  if (ui.vista != fav && ui.vista != rec) ultima_vista_real = ui.vista;
  ui.vista = ui.vista == fav ? rec : ui.vista == rec ? ultima_vista_real : fav;
  ui.corrimiento = 0;
  animacion_desde = 0;
}

static void favorito(void) {
  Juego *j = elegido();
  if (!j) return;
  avisar(cambiar_favorito(j) ? "Agregado a Favoritos." : "Quitado de Favoritos.");
  Vista *v = &vistas[ui.vista];
  if (v->tipo == VISTA_FAVORITOS && v->elegido >= v->n) v->elegido = v->n ? v->n - 1 : 0;
}

static void jugar(Juego *j) {
  const Sistema *s = &SISTEMAS[j->sistema];
  char emulador[PATH_MAX + 32], juego[PATH_MAX * 2], reg[PATH_MAX + 32];
  snprintf(emulador, sizeof emulador, "%s/%s", carpeta_programas, s->emulador);
  snprintf(juego, sizeof juego, "%s/%s/%s", carpeta_roms, j->carpeta, j->archivo);
  snprintf(reg, sizeof reg, "%s/registro-retro.txt", carpeta_neo);
  if (access(emulador, F_OK)) {
    avisar("Este sistema todavía no tiene emulador.");
    return;
  }
  anotar("jugar: %s", juego);
  agregar_reciente(j);
  limpiar_pantalla();
  // El tablero por USB directo solo lo puede tener un programa a la vez: se suelta para el emulador.
  cerrar_mandos();
  long inicio = ahora_ms();
  pid_t hijo = fork();
  if (hijo == 0) {
    execl(emulador, s->emulador, juego, reg, (char *)NULL);
    _exit(127);
  }
  int estado = 0;
  if (hijo > 0) waitpid(hijo, &estado, 0);
  anotar("fin del juego: salida %d tras %ld s", WIFEXITED(estado) ? WEXITSTATUS(estado) : -1,
         (ahora_ms() - inicio) / 1000);
  pantalla_tras_otro_programa();  // el emulador dejó a la vista la primera página
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

static void dibujar(void) {
  ui.aviso = ahora_ms() < aviso_hasta ? aviso : NULL;
  interfaz_dibujar(&ui);
}

// ---- Simulación (laptop) ---------------------------------------------------------------------------

static int simular(void) {
  char teclas[512];
  snprintf(teclas, sizeof teclas, "%s", getenv("NEO_SIMULAR_TECLAS") ? getenv("NEO_SIMULAR_TECLAS") : "");
  for (char *t = strtok(teclas, ","); t; t = strtok(NULL, ",")) {
    // Sin tiempo entre botones: cada paso termina su animación antes del siguiente.
    ui.corrimiento = 0;
    if (!strcmp(t, "derecha")) mover(1);
    if (!strcmp(t, "izquierda")) mover(-1);
    if (!strcmp(t, "abajo")) ui.foco = 1;
    if (!strcmp(t, "arriba")) ui.foco = 0;
    if (!strcmp(t, "rb")) cambiar_vista(1);
    if (!strcmp(t, "lb")) cambiar_vista(-1);
    if (!strcmp(t, "x")) favorito();
    if (!strcmp(t, "select")) siguiente_lista();
    if (!strcmp(t, "rt")) saltar_letra(1);
    if (!strcmp(t, "lt")) saltar_letra(0);
    if (!strncmp(t, "medio", 5)) {  // «medio»: congela la animación a la mitad, para verla
      ui.corrimiento = corrimiento_inicial * 0.5f;
      animacion_desde = 0;
    }
  }
  if (!getenv("NEO_SIMULAR_TECLAS") || !strstr(getenv("NEO_SIMULAR_TECLAS"), "medio")) {
    ui.corrimiento = 0;
    animacion_desde = 0;
  }
  long t0 = ahora_ms();
  dibujar();
  long t1 = ahora_ms();
  dibujar();
  anotar("simulación: vista %s, juego %d de %d, primer cuadro %ld ms, segundo %ld ms", vistas[ui.vista].nombre,
         vistas[ui.vista].elegido, vistas[ui.vista].n, t1 - t0, ahora_ms() - t1);
  if (getenv("NEO_CAPTURA")) guardar_png(getenv("NEO_CAPTURA"));
  return 0;
}

// ---- Programa ------------------------------------------------------------------------------------

int main(int argc, char **argv) {
  // «--portada» (al final): solo pinta el logotipo grande y sale sin borrarlo. arranque.sh la llama al
  // encender, antes que todo, para tapar la imagen del fabricante.
  int portada = argc > 1 && !strcmp(argv[argc - 1], "--portada");
  if (portada) argc--;
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
  if (portada) {
    int ok = pantalla.bpp == 16 && tx_iniciar() == 0;
    if (ok) interfaz_portada();
    if (ok && pantalla.simulada && getenv("NEO_CAPTURA")) guardar_png(getenv("NEO_CAPTURA"));
    anotar(ok ? "portada a la vista" : "sin portada: la pantalla no es RGB565");
    if (registro) fclose(registro);
    return ok ? 0 : 1;
  }

  long t0 = ahora_ms();
  char cache[PATH_MAX + 16];
  snprintf(cache, sizeof cache, "%s/cache", carpeta_neo);
  imagenes_iniciar(cache, anotar);
  biblioteca_leer(carpeta_roms, carpeta_neo, anotar);
  if (interfaz_iniciar(anotar) < 0) {
    anotar("sin interfaz: se termina");
    return 1;
  }
  anotar("listo en %ld ms", ahora_ms() - t0);
  if (pantalla.simulada) return simular();

  activar_doble_bufer();
  dibujar();
  abrir_mandos(anotar);
  long inicio = ahora_ms(), ultima_busqueda = inicio, salir_desde = 0, siguiente_repeticion = 0;
  int direccion_previa = -1, previos[BOTONES], select_con_start = 0, pendiente = 1;
  int aviso_visible = 0;
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
      snprintf(aviso, sizeof aviso, "Conecta el tablero al USB. Menú de fábrica en %ld s.", resta > 0 ? resta : 0);
      if (aviso_hasta < t + 900) pendiente = 1;
      aviso_hasta = t + 1000;
      if (t - inicio >= SALIR_SIN_MANDOS_MS) motivo = "sin controles";
    }
    int ahora[BOTONES];
    for (int b = 0; b < BOTONES; b++) ahora[b] = apretado_alguno(b);
#define RECIEN(b) (ahora[b] && !previos[b])
    int antes = vistas[ui.vista].elegido * 64 + ui.vista * 4 + ui.foco;

    // Izquierda y derecha mueven el carrusel, con repetición al mantener.
    int direccion = ahora[BOTON_IZQUIERDA] ? BOTON_IZQUIERDA : ahora[BOTON_DERECHA] ? BOTON_DERECHA : -1;
    int paso = 0;
    if (direccion != direccion_previa) {
      paso = direccion >= 0;
      siguiente_repeticion = t + 380;
    } else if (direccion >= 0 && t >= siguiente_repeticion) {
      paso = 1;
      siguiente_repeticion = t + 120;
    }
    direccion_previa = direccion;
    if (paso) mover(direccion == BOTON_DERECHA ? 1 : -1);
    if (RECIEN(BOTON_ARRIBA)) ui.foco = 0;
    if (RECIEN(BOTON_ABAJO)) ui.foco = 1;
    if (RECIEN(BOTON_R)) cambiar_vista(1);
    if (RECIEN(BOTON_L)) cambiar_vista(-1);
    if (RECIEN(BOTON_R2)) saltar_letra(1);
    if (RECIEN(BOTON_L2)) saltar_letra(0);
    if (RECIEN(BOTON_Y)) favorito();  // la X del tablero

    // Select + Start mantenidos: salir. Select solo (al soltarlo sin haber tocado Start): listas.
    if (ahora[BOTON_SELECT] && ahora[BOTON_START]) {
      select_con_start = 1;
      if (!salir_desde) salir_desde = t;
      if (t - salir_desde >= SALIR_MANTENIENDO_MS) motivo = "Select + Start";
    } else {
      salir_desde = 0;
      if (!ahora[BOTON_SELECT] && previos[BOTON_SELECT] && !select_con_start) siguiente_lista();
      if (!ahora[BOTON_SELECT]) select_con_start = 0;
      if (RECIEN(BOTON_B) && !select_con_start && elegido()) {  // la A del tablero
        if (ui.foco == 1) {
          favorito();
        } else {
          jugar(elegido());
          esperar_suelto();
          for (int b = 0; b < BOTONES; b++) ahora[b] = 1;
          pendiente = 1;
        }
      }
    }
    memcpy(previos, ahora, sizeof previos);

    avanzar_animacion(t);
    int despues = vistas[ui.vista].elegido * 64 + ui.vista * 4 + ui.foco;
    int con_aviso = ahora_ms() < aviso_hasta;
    if (despues != antes || animacion_desde || con_aviso != aviso_visible) pendiente = 1;
    if (pendiente || animacion_desde) {
      dibujar();
      pendiente = animacion_desde != 0;  // un cuadro más al terminar de deslizarse
      aviso_visible = con_aviso;
      usleep(4000);
    } else if (interfaz_precargar(&ui)) {
      usleep(1000);  // hubo trabajo: se revisan los botones y se sigue
    } else {
      usleep(15000);
    }
  }
  anotar("fin del menú: %s", motivo);
  cerrar_mandos();
  limpiar_pantalla();
  pantalla_tras_otro_programa();
  if (registro) fclose(registro);
  return 0;
}
