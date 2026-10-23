# Comparación visual

Capturas de la MP80 a 1920×1080 del 2026-10-22, tomadas por RetroArch después del shader. Cada una
es solo la imagen del juego, en píxeles de la TV: lo que falta para llegar a 1920×1080 son bordes
negros. Todas son del mismo cuadro: el 7200 de la demostración de Metal Slug, con la memoria de la
máquina limpia. Cómo se tomaron, en [visual-enhancement-testing.md](visual-enhancement-testing.md).

Metal Slug es la copia del usuario en su biblioteca; aquí solo van capturas, no el juego.

## Las cuatro configuraciones

| Archivo | Configuración | Imagen | Qué se ve |
|---|---|---|---|
| [original.png](visual-comparison/original.png) | Hoy: escala para llenar la altura, sin shader | 1440×1080 | Llena la altura, pero cada pixel del juego mide 4 o 5 puntos de la TV |
| [integer-scaling.png](visual-comparison/integer-scaling.png) | Escalado entero, sin shader | 1196×896 | Todos los píxeles iguales (4×4), con bordes negros arriba y abajo |
| [shader-light.png](visual-comparison/shader-light.png) | sharp-bilinear-simple, sin escalado entero (**el ganador**) | 1440×1080 | Llena la altura con los píxeles parejos; el resto de la escala va en un borde de un punto suavizado |
| [shader-crt.png](visual-comparison/shader-crt.png) | Escalado entero + zfast-crt | 1196×896 | Líneas de barrido y máscara suaves; la imagen se oscurece |

## El problema de hoy, de cerca

[detalle-pixeles.png](visual-comparison/detalle-pixeles.png) muestra el texto «CREDIT» de abajo,
ampliado cuatro veces sin suavizar.

- **Hoy:** los trazos de las letras tienen anchos distintos. Es el efecto de escalar 224 líneas a 1080
  (4.82 veces): unas líneas del juego quedan de 4 puntos y otras de 5. Al desplazarse la pantalla, esa
  diferencia se mueve y la imagen tiembla.
- **Escalado entero:** los trazos son parejos, pero todo es más chico.
- **sharp-bilinear:** los trazos son parejos y del tamaño de hoy. La diferencia de escala queda en un
  borde de un punto apenas más suave.

## Los diez perfiles

- [comparacion-metal-slug.png](visual-comparison/comparacion-metal-slug.png): la misma zona del cuadro
  7200 (el soldado disparando junto a una explosión) en los diez perfiles.
- [comparacion-nova.png](visual-comparison/comparacion-nova.png): Nova the Squirrel, un juego casero
  libre de NES, 600 cuadros después de su estado inicial.

En las dos hojas cada recorte se amplía a la misma altura sin suavizar. Por eso los perfiles con
escalado entero, que son más chicos en la TV, se ven ampliados un poco más; el tamaño real de cada
imagen va en su título.

| Perfil | Diferencia frente a hoy |
|---|---|
| B entero | Los píxeles quedan exactos; la imagen, más chica |
| C zfast-crt | Líneas de barrido finas y máscara suave. Conserva el dibujo, pero baja el brillo |
| D crt-geom | Curvatura de pantalla, líneas marcadas y un poco de desenfoque. El más «de época» |
| E crt-easymode | Líneas y máscara más oscuras que zfast-crt, sin curvatura |
| F sharp-bilinear | Igual a hoy en tamaño y color, con los píxeles parejos |
| G scanline | Una trama de rejilla que apaga el color |
| H hq2x | Redondea bordes y agrega contornos: cambia el dibujo |
| I xbrz | Suaviza aún más; el pixel art se ve como caricatura vectorial |
| J crt-royale | A 1080p la máscara de fósforo queda gruesa y la imagen muy oscura |

## Por qué ganó sharp-bilinear

Es el único perfil que arregla los píxeles desiguales sin cambiar ninguna otra cosa:

- el tamaño en pantalla, que el escalado entero reduce del 7 al 29 % según el sistema;
- el color, que oscurecen los CRT;
- las formas del dibujo, que redondean hq2x y xbrz.

Además, no cuesta nada medible: la GPU sigue en su frecuencia mínima.

El CRT es cuestión de gusto. Por eso «crt-ligero» queda como perfil para quien lo quiera, sin ser el
predeterminado.

## Los CRT a pantalla completa (segunda ronda)

Al ver «nitido» en la TV, al usuario le pareció que el cambio era poco y que se veía muy pixeleado.
[comparacion-crt.png](visual-comparison/comparacion-crt.png) compara hoy, sharp-bilinear y cinco CRT,
casi todos sin achicar la imagen.

- **crt-hyllian-fast** quedó de fábrica («CRT» en Configuración): funde los píxeles en líneas de
  barrido, conserva los bordes y el brillo, y cuesta poco.
- **crt-lottes-fast** («CRT SUAVE») es el más parecido a una TV de tubo.

Los recortes están ampliados al doble; a la distancia de la TV, todos los CRT se ven más suaves que
aquí.
