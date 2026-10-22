// Texto con las fuentes de Neo Arcade (Bungee, Pixelify Sans y Share Tech Mono), rasterizadas en el
// aparato con stb_truetype. Cada letra se guarda ya dibujada por fuente y tamaño. Los tamaños son en
// píxeles, como el font-size de CSS. «y» es la parte de arriba del renglón.
#pragma once
#include <stdint.h>

#include "recursos.h"

int tx_iniciar(void);
int tx_alto(int fuente, int tam);  // alto del renglón: ascenso + descenso
int tx_ancho(int fuente, int tam, int espaciado, const char *s);
int tx_dibujar(int fuente, int tam, int espaciado, int x, int y, uint16_t c, int alfa, const char *s);
// Corta con «…» si no cabe en `ancho`.
int tx_recortado(int fuente, int tam, int espaciado, int x, int y, int ancho, uint16_t c, const char *s);
// Párrafo partido por palabras; el último renglón termina en «…» si sobra texto. Devuelve los renglones.
int tx_parrafo(int fuente, int tam, int x, int y, int ancho, int alto_renglon, int max_renglones, uint16_t c,
               const char *s);
