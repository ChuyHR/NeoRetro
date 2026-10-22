// Controles del Game Stick por evdev, traducidos a los botones del RetroPad de libretro (los mismos
// números que RETRO_DEVICE_ID_JOYPAD_*). Los usan el menú y los emuladores.
#pragma once
#include <stdbool.h>

enum {
  BOTON_B = 0, BOTON_Y = 1, BOTON_SELECT = 2, BOTON_START = 3, BOTON_ARRIBA = 4, BOTON_ABAJO = 5,
  BOTON_IZQUIERDA = 6, BOTON_DERECHA = 7, BOTON_A = 8, BOTON_X = 9, BOTON_L = 10, BOTON_R = 11,
  BOTON_L2 = 12, BOTON_R2 = 13, BOTONES = 16
};

// Abre los /dev/input/event* que tienen ejes X e Y (deja fuera el control remoto y los teclados).
// registrar puede ser NULL. Devuelve cuántos controles abrió.
int abrir_mandos(void (*registrar)(const char *formato, ...));
// Lee lo pendiente de cada control; devuelve true si hubo algún evento.
bool leer_mandos(void);
int numero_de_mandos(void);
bool apretado(int mando, int boton);
// Lo mismo, en cualquiera de los controles.
bool apretado_alguno(int boton);
void cerrar_mandos(void);
