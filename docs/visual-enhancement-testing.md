# Mejora visual: pruebas y resultados

Pruebas del 2026-10-22 en la MP80 real, con la TV a 1920×1080 y también a 1280×720. El laboratorio
está en `visual-enhancement-lab/` y el análisis previo en
[visual-enhancement-analysis.md](visual-enhancement-analysis.md). Todos los valores de este documento
salieron de esas corridas. Lo que no se pudo medir está dicho como tal.

## Conclusión

La mejora sí vale la pena y quedó integrada. El perfil ganador, **«nitido»**, combina tres ajustes:

- el shader sharp-bilinear-simple;
- sin escalado entero;
- la relación de aspecto del núcleo.

Corrige el problema real de hoy: los píxeles de tamaños desiguales en una TV de 1080p. Lo hace sin
achicar la imagen, sin cambiar el pixel art y sin costo medible: la GPU sigue en su frecuencia mínima y
cada cuadro tarda 0.05 ms más.

El escalado entero es el más exacto, pero achica la imagen: en Neo Geo usa 896 de 1080 líneas, y en
un arcade vertical como 1941, 768. Queda disponible como perfil «entero», y el CRT ligero como
«crt-ligero».

## Juegos de prueba

| Juego | Sistema y núcleo | Resolución | Por qué | Licencia |
|---|---|---|---|---|
| Metal Slug | Neo Geo, FBNeo | 304×224 a 59.18 Hz | Arcade de pixel art detallado: sprites, explosiones, fondos complejos y texto. Su demostración corre sin mando | Copia del usuario en su biblioteca de la MP80; no salió del equipo ni va en el repositorio |
| Nova the Squirrel | NES, Mesen | 256×240 | Pixel art de baja resolución, fondo, sprites e indicador de vida | Juego casero GPL-3.0, de su repositorio oficial |

Para que todos los perfiles muestren el mismo cuadro:

- **Metal Slug** arranca con la memoria de la máquina limpia y se captura el cuadro 7200 de la
  demostración.
- **Nova** no tiene demostración. Arranca de un estado guardado dentro del primer nivel
  (`crear-estado.sh`) y se captura 600 cuadros después.
- **Comprobado:** dos corridas del mismo perfil dan una captura idéntica, byte por byte.

## Cómo se midió

- **Aislamiento.** RetroArch se abrió con una copia de la configuración de Neo Arcade (`--config`),
  sus propias carpetas de partidas, estados y opciones de núcleo, y los mandos físicos apagados. Al
  final de cada medición se comprobó la huella del `retroarch.cfg` de Neo Arcade: no cambió.
- **Por perfil**, tres corridas:
  1. **captura** del mismo cuadro, después del shader, en píxeles de la TV;
  2. **sin límite** (sin vsync ni sincronía de audio, 3 000 cuadros): el máximo que da el equipo;
  3. **tiempo real** (como juega el usuario, 1 800 cuadros).
- **Fuentes de cada dato:**
  - **tiempo de cada cuadro:** HUD de Mesa (`GALLIUM_HUD_DUMP_DIR`), sin los primeros 120 cuadros;
  - **GPU:** `intel_gpu_top` cada 500 ms (ocupación de Render/3D, frecuencia y vatios);
  - **CPU y memoria:** `/proc` del proceso de RetroArch.
- **Perfiles probados** (`visual-enhancement-lab/perfiles/`):

| Perfil | Escalado | Shader |
|---|---|---|
| A | El de hoy (llena la altura) | ninguno |
| B | Entero | ninguno |
| C | Entero | zfast-crt (CRT de una pasada) |
| D | Entero | crt-geom (curvatura y máscara) |
| E | Entero | crt-easymode |
| F | El de hoy | sharp-bilinear-simple |
| G | Entero | scanline |
| H | Entero | hq2x |
| I | Entero | xbrz-freescale |
| J | Entero | crt-royale (el más pesado, como límite) |

## Métricas a 1920×1080

«ms sin límite» es lo que tarda cada cuadro, juego y shader juntos, cuando RetroArch corre tan rápido
como puede. El presupuesto a 60 Hz es de 16.7 ms.

**Metal Slug**

| Perfil | Imagen | FPS | ms media | ms p99 | FPS sin límite | ms sin límite | CPU RetroArch | GPU 3D | GPU MHz | W GPU | W equipo | RAM |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A original | 1440×1080 | 60.0 | 16.67 | 21.55 | 751 | 1.33 | 25.5 % | 10.6 % | 90 | 0.07 | 3.30 | 326 MB |
| B entero | 1196×896 | 60.0 | 16.66 | 21.58 | 761 | 1.31 | 26.1 % | 7.8 % | 89 | 0.07 | 3.24 | 326 MB |
| C zfast-crt | 1196×896 | 60.0 | 16.66 | 21.57 | 741 | 1.35 | 25.9 % | 10.7 % | 89 | 0.08 | 3.24 | 326 MB |
| D crt-geom | 1196×896 | 60.0 | 16.67 | 20.84 | 210 | 4.75 | 25.4 % | 62.8 % | 412 | 0.40 | 3.75 | 327 MB |
| E crt-easymode | 1196×896 | 60.0 | 16.66 | 21.32 | 418 | 2.39 | 26.0 % | 53.3 % | 201 | 0.17 | 3.36 | 327 MB |
| **F sharp-bilinear** | 1440×1080 | 60.0 | 16.65 | 21.64 | 725 | 1.38 | 25.7 % | 11.5 % | 86 | 0.08 | 3.25 | 326 MB |
| G scanline | 1196×896 | 60.0 | 16.66 | 21.62 | 670 | 1.49 | 27.2 % | 15.3 % | 91 | 0.08 | 3.31 | 326 MB |
| H hq2x | 1196×896 | 60.0 | 16.66 | 21.44 | 699 | 1.43 | 27.2 % | 15.7 % | 108 | 0.08 | 3.24 | 327 MB |
| I xbrz | 1196×896 | 60.0 | 16.67 | 19.43 | 157 | 6.39 | 26.8 % | 50.5 % | 446 | 0.55 | 3.92 | 328 MB |
| J crt-royale | 1196×896 | 60.0 | 16.67 | 21.05 | 123 | 8.10 | 32.5 % | 59.8 % | 603 | 0.86 | 4.74 | 346 MB |

**Nova the Squirrel**

| Perfil | Imagen | FPS | ms media | ms p99 | FPS sin límite | ms sin límite | CPU RetroArch | GPU 3D | GPU MHz | W GPU | W equipo | RAM |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A original | 1317×1080 | 60.0 | 16.67 | 21.96 | 468 | 2.14 | 43.4 % | 10.1 % | 67 | 0.07 | 3.50 | 212 MB |
| B entero | 1172×960 | 60.0 | 16.67 | 21.78 | 469 | 2.13 | 42.6 % | 8.3 % | 83 | 0.06 | 3.53 | 212 MB |
| C zfast-crt | 1172×960 | 60.0 | 16.67 | 21.41 | 470 | 2.13 | 43.6 % | 11.3 % | 88 | 0.08 | 3.49 | 213 MB |
| D crt-geom | 1172×960 | 60.0 | 16.67 | 21.45 | 199 | 5.02 | 42.6 % | 61.2 % | 405 | 0.45 | 4.04 | 214 MB |
| E crt-easymode | 1172×960 | 60.0 | 16.66 | 21.57 | 395 | 2.53 | 42.4 % | 54.7 % | 204 | 0.20 | 3.75 | 213 MB |
| **F sharp-bilinear** | 1317×1080 | 60.0 | 16.67 | 21.54 | 467 | 2.14 | 43.7 % | 11.0 % | 86 | 0.08 | 3.53 | 212 MB |
| G scanline | 1172×960 | 60.0 | 16.67 | 21.38 | 435 | 2.30 | 45.4 % | 16.4 % | 101 | 0.09 | 3.57 | 212 MB |
| H hq2x | 1172×960 | 60.0 | 16.67 | 21.71 | 453 | 2.21 | 44.1 % | 15.6 % | 95 | 0.08 | 3.59 | 213 MB |
| I xbrz | 1172×960 | 60.0 | 16.67 | 21.79 | 283 | 3.53 | 44.2 % | 57.9 % | 277 | 0.25 | 3.90 | 214 MB |
| J crt-royale | 1172×960 | 60.0 | 16.67 | 22.02 | 115 | 8.72 | 46.9 % | 57.7 % | 616 | 1.10 | 5.31 | 234 MB |

Notas sobre los datos:

- **Rendimiento:** todos los perfiles sostienen 60 cuadros por segundo. La diferencia está en la
  holgura y en el trabajo de la GPU:
  - A, B, C, F, G y H no la sacan de su frecuencia mínima (de 67 a 108 MHz);
  - D, E, I y J la llevan del 50 al 63 % de ocupación y de 200 a 616 MHz;
  - crt-royale sube el consumo del equipo de 3.3 a 4.7 W en Metal Slug y de 3.5 a 5.3 W en Nova.
- **Tiempos de cuadro:** el p99 de cerca de 21.5 ms aparece igual en todos, sin shader incluido.
  Es el tiempo medido del lado del procesador en Wayland: cuadros de 21 ms seguidos de otros de 12 ms,
  con media de 16.67.
- **Refrescos perdidos:** se calculó una cuenta de refrescos perdidos a partir de esos tiempos. En Nova
  dio 0 en todos los perfiles. En Metal Slug varió de 0 a 41 de 1 675 sin relación con el shader (sin
  shader, 13; con crt-royale, 0), así que no se atribuye a ningún perfil. Que venga de que Neo Geo
  corre a 59.18 Hz en una TV de 60 Hz es una inferencia.
- **Tearing:** no se vio en ninguna captura. Cage presenta cuadros completos. No se instrumentó.

## Métricas a 1280×720

Metal Slug, con la TV cambiada a 720p con `wlr-randr` y regresada a 1080p al terminar.

| Perfil | Imagen | FPS | FPS sin límite | ms sin límite | CPU RetroArch | GPU 3D | GPU MHz | W GPU | W equipo |
|---|---|---|---|---|---|---|---|---|---|
| A original | 960×720 | 60.0 | 819 | 1.22 | 25.9 % | 5.6 % | 84 | 0.07 | 3.17 |
| B entero | 897×672 | 60.1 | 822 | 1.22 | 26.2 % | 5.0 % | 94 | 0.06 | 3.20 |
| C zfast-crt | 897×672 | 60.0 | 818 | 1.22 | 26.2 % | 6.6 % | 92 | 0.07 | 3.23 |
| D crt-geom | 897×672 | 60.0 | 365 | 2.74 | 25.8 % | 60.0 % | 229 | 0.19 | 3.34 |
| **F sharp-bilinear** | 960×720 | 60.0 | 827 | 1.21 | 26.0 % | 6.0 % | 81 | 0.07 | 3.20 |
| J crt-royale | 897×672 | 60.0 | 194 | 5.15 | 32.4 % | 58.1 % | 395 | 0.41 | 4.10 |

## Evaluación de cada shader

Los números de rendimiento salen de las tablas. Nitidez, color, fidelidad y aspecto retro son la
evaluación de las capturas a la misma ampliación ([visual-comparison.md](visual-comparison.md)), con
estos criterios:

- **nitidez:** bordes definidos;
- **color:** brillo y saturación frente a la imagen sin shader;
- **fidelidad:** las formas del pixel art sin cambios y los píxeles parejos;
- **aspecto retro:** qué tanto se parece a una TV de tubo.

Se agrega cuánto alto de la pantalla usa la imagen, medido de las capturas, porque en una TV pesa.

| Perfil | Nitidez | Color | Fidelidad | Aspecto retro | Rendimiento | Alto usado (Neo Geo / NES / arcade vertical) |
|---|---|---|---|---|---|---|
| A original | 7 | 9 | 6 | 4 | 10 | 100 % / 100 % / 100 % |
| B entero | 10 | 9 | 10 | 4 | 10 | 83 % / 89 % / 71 % |
| C zfast-crt | 7 | 7 | 8 | 8 | 10 | 83 % / 89 % / 71 % |
| D crt-geom | 6 | 7 | 7 | 9 | 7 | 83 % / 89 % / 71 % |
| E crt-easymode | 6 | 6 | 7 | 8 | 8 | 83 % / 89 % / 71 % |
| **F sharp-bilinear** | 9 | 9 | 9 | 4 | 10 | 100 % / 100 % / 100 % |
| G scanline | 5 | 5 | 6 | 6 | 10 | 83 % / 89 % / 71 % |
| H hq2x | 7 | 8 | 4 | 3 | 10 | 83 % / 89 % / 71 % |
| I xbrz | 7 | 8 | 3 | 2 | 6 | 83 % / 89 % / 71 % |
| J crt-royale | 4 | 5 | 5 | 8 | 4 | 83 % / 89 % / 71 % |

Lo que se vio en cada caso:

- **Sin shader (A).** Es nítido, pero con píxeles de 4 o 5 puntos de la TV: los trazos de las letras
  salen de anchos distintos y la imagen tiembla al desplazarse.
- **Escalado entero (B).** Mejora claramente la nitidez: todos los píxeles iguales. Cuesta tamaño de
  pantalla, y en arcade vertical mucho.
- **sharp-bilinear (F).** Píxeles parejos al tamaño de hoy, con un borde de un punto apenas
  suavizado. No cambia formas ni color.
- **CRT.**
  - zfast-crt es ligero y convincente, pero oscurece la imagen.
  - crt-geom agrega curvatura y la imagen más «de época», con un costo seis veces mayor de GPU.
  - crt-easymode oscurece más.
  - crt-royale, a 1080p, deja la máscara de fósforo demasiado gruesa y la imagen muy oscura, y es el
    más pesado.
- **Suavizado de pixel art (H, I).** hq2x y xbrz redondean los bordes y agregan contornos: el pixel
  art se ve redibujado. Contradice la meta de conservar la estética.
- **scanline (G).** Hace una trama de rejilla y apaga el color.

## Configuración ganadora

| Ajuste | Valor | Por qué |
|---|---|---|
| Resolución de salida | La de la TV (1080p en la MP80) | Es la que da Cage; 720p también se probó |
| Relación de aspecto | La del núcleo (como hoy) | Cada núcleo da la suya: 4:3 en Neo Geo, la de su píxel en NES, 10:9 en Game Boy, 3:2 en GBA |
| Escalado | Sin escalado entero | El entero achica la imagen del 7 al 29 % según el sistema; sharp-bilinear ya deja los píxeles parejos |
| Shader | sharp-bilinear-simple (GLSL; con Vulkan, su versión slang) | Única opción que arregla la desigualdad sin achicar ni redibujar |
| Filtro | El del shader (bilineal solo en el borde de cada píxel) | `video_smooth` sigue apagado |
| VSync | Activo, como hoy | Con vsync todos los perfiles dieron 60.0 FPS |
| Overscan | Recortado, como hoy | No se cambió |
| GPU | La integrada de la MP80, en su frecuencia mínima | 11.5 % de ocupación, 86 MHz, 0.08 W |

Para quien prefiera otra imagen quedan dos perfiles más:

- **«entero»:** el escalado entero exacto. Es el mejor puntaje de nitidez y fidelidad, pero con la
  imagen más chica.
- **«crt-ligero»:** el aspecto de TV de tubo, con el costo de no tener shader.

Cómo elegirlos está en [visual-profiles.md](visual-profiles.md).

## Latencia

**No se midió la latencia de entrada.** Hace falta una cámara rápida o un sensor de luz frente a la TV.

Lo que sí se midió permite una inferencia. El perfil ganador no cambia la cadena de video (vsync, 3
imágenes de intercambio, sin retraso de cuadro) y agrega 0.05 ms de trabajo de GPU por cuadro. Eso
cabe de sobra en los 16.7 ms de cada cuadro, así que no debería sumar un cuadro de retraso.

crt-royale agrega 6.8 ms. También cabe a 1080p, pero deja poco margen.

## Fallas y fallback

`visual-enhancement-lab/probar-fallas.sh`, con Metal Slug:

| Caso | Qué hizo RetroArch |
|---|---|
| Shader que no existe (`--set-shader`) | «Could not read root preset… falling back to stock». Abrió el juego y lo dibujó |
| Shader que no compila | «Failed to compile vertex shader… falling back to stock». Abrió el juego y lo dibujó igual que sin shader |
| Archivo del perfil (`--appendconfig`) que no existe | Lo ignoró y abrió el juego |
| Clave que RetroArch no conoce | La ignoró |
| `config_save_on_exit` activo | **Guardó lo del perfil en su configuración al cerrar** (`video_scale_integer` pasó de `false` a `true`) |

El último caso obligó a que Neo Arcade lea antes del juego los valores de las claves del perfil y los
devuelva al cerrar.

Neo Arcade, además, no espera a que RetroArch falle:

- revisa antes que el shader exista;
- valida las claves del perfil;
- si RetroArch se cierra en los primeros 8 segundos con el perfil, vuelve a abrir el juego sin él.

## Compatibilidad

- **Sistemas.** `visual-enhancement-lab/probar-sistemas.sh` abrió un juego de cada sistema de la
  biblioteca de la MP80 con F y con C: arcade, Neo Geo, NES, SNES, Game Boy, Game Boy Color, GBA,
  Master System, Mega Drive, Game Gear y PC Engine. Los 22 abrieron (salida 0) sin una sola falla de
  shader. Con F todos llenan la altura de la TV.
- **Resoluciones.** 1080p y 720p, medidas. La TV de la MP80 no ofrece 1440p ni 4K, así que esas no se
  midieron. Una estimación sin medir: el costo de un shader crece con los píxeles de salida, y a 4K
  son cerca de cinco veces los de 1080p. crt-geom, crt-easymode, xbrz y crt-royale probablemente no
  sostendrían 60 FPS en esta GPU a 4K; sharp-bilinear y zfast-crt casi no cuestan, así que deberían
  sostenerlos.
- **Drivers de video.**
  - **`gl`** (el de la MP80) carga los presets GLSL.
  - **`vulkan`** ignora el GLSL («Loading stock shader») y abre el juego sin mejora. Con el preset
    slang del mismo shader sí lo aplicó. Por eso cada perfil trae `shader` y `shaderSlang`, y Neo
    Arcade elige según el `video_driver`.
  - **`glcore`** abrió el juego; no se confirmó en el registro si cargó el preset.
- **GPUs.** Solo se probó la Intel UHD de la MP80. En otra PC, si algo del perfil falla, el juego se
  abre igual (comprobado arriba).
- **Emuladores.** Solo RetroArch usa perfiles (`perfilesVisuales` en `emulators.json`). Dolphin y
  PPSSPP no cambian. Los sistemas 3D de RetroArch (Nintendo 64, PlayStation, Dreamcast) y los que no
  se probaron se quedan en «original».

## Verificación en Neo Arcade

Con los cambios instalados en la MP80 (`/opt/neo-arcade/resources/app`, con respaldo previo en
`~/respaldo-neo-arcade-20261022-visual`):

- **116 pruebas en verde** en la MP80 (`node --test`): las 105 de antes y 11 nuevas en
  `pruebas/visual.test.js`.
- **Juego de Nintendo 64 desde Neo Arcade:** perfil «original», sin argumentos extra, abrió y cerró
  con Select + Start.
- **Juego de GBA desde Neo Arcade:** perfil «nitido» aplicado. En la TV se vio a toda la altura con
  píxeles parejos, y cerró con Select + Start.
- **Al cerrar, `retroarch.cfg`** tenía `video_scale_integer` y `video_shader_enable` con los mismos
  valores de antes.
- **Con un shader que no existe**, puesto a propósito en una copia de `visual.json`, el registro dijo
  «no está el shader…» y el juego se abrió con el comando de siempre. La copia se quitó después.

## Límites

- La latencia de entrada no se midió.
- No hubo una TV de 1440p ni de 4K.
- Solo se probó una GPU (Intel UHD, Alder Lake-N).
- La evaluación de nitidez, color, fidelidad y aspecto retro es de las capturas; otra persona puede
  preferir el CRT.
- No se probó el escalado entero con sobreescala (`video_scale_integer_scaling`), que llena más
  recortando bordes.
