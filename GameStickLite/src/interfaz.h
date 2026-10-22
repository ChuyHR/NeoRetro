// La pantalla del menú, con el diseño de docs/prompt-diseno-gpt.md: logotipo, barra de sistemas,
// carrusel, ficha del juego con JUGAR y FAVORITO, y el pie con los botones. Se dibuja entera en el
// aparato a partir de la biblioteca; no usa capturas de nada.
#pragma once
#include "biblioteca.h"

typedef struct {
  int vista;          // índice en vistas[]
  int foco;           // 0 JUGAR, 1 FAVORITO
  float corrimiento;  // animación: las tarjetas van ese tanto de lugares fuera de su sitio
  const char *aviso;  // NULL si no hay
} EstadoUI;

// Requiere la pantalla abierta a 1280×720 en RGB565. Devuelve -1 si no.
int interfaz_iniciar(void (*anotar)(const char *, ...));
void interfaz_dibujar(const EstadoUI *e);
// La portada de arranque: el logotipo grande.
void interfaz_portada(void);
// Lee una imagen que falte de los juegos cercanos. Devuelve 1 si leyó alguna (para seguir después).
int interfaz_precargar(const EstadoUI *e);
