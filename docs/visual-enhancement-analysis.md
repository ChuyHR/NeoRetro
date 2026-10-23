# Mejora visual de los juegos retro: análisis de Neo Arcade

Fase 1 del pedido del 2026-10-22: analizar antes de cambiar nada. Todo lo de este documento se
comprobó en el código del repositorio o en la MP80 ese mismo día. Lo que es una hipótesis está marcado
como tal y se resuelve en [visual-enhancement-testing.md](visual-enhancement-testing.md).

## Conclusión

Neo Arcade abre todos los juegos retro con un solo RetroArch, y su configuración gráfica es la de
fábrica:

- escala la imagen para llenar la altura de la TV con un factor no entero;
- no usa shader ni suavizado;
- la relación de aspecto la da el núcleo.

Con eso, en una TV de 1080p los píxeles del juego quedan de tamaños desiguales: en Neo Geo, de 4 o 5
píxeles de la TV. Es el problema principal.

El lugar correcto para la mejora es el lanzador, que ya prepara RetroArch antes de cada juego.
RetroArch acepta un archivo de ajustes extra por juego (`--appendconfig`), así que no hace falta
modificar el `retroarch.cfg` del usuario.

## Arquitectura actual

| Parte | Qué es | Dónde |
|---|---|---|
| Lenguaje | JavaScript (Node 22 en el proceso principal, sin marco en la interfaz) | `core/`, `app/` |
| Frontend | Electron 44.5.1, interfaz para TV manejada con mando | `app/`, `core/main.js` |
| Sistema objetivo | Debian 13 con Cage (quiosco Wayland, sin escritorio). Neo Arcade corre como `neo-arcade.service` | `scripts/instalador/` |
| Hardware objetivo | Blackview MP80; la arquitectura no depende de él (`CLAUDE.md`) | |
| Configuración | JSON en `config/`. Cada archivo puede reemplazarse con uno igual en `~/NeoRetro/config/` | `core/configuracion.js` |
| Biblioteca | Recorre `roms/<sistema>/`, filtra por extensión, limpia nombres y guarda una caché | `core/escaner/escaner.js` |
| Lanzamiento | Arma el comando desde `systems.json` y `emulators.json`, comprueba juego, emulador, núcleo y BIOS, ejecuta y espera | `core/lanzador/lanzador.js` |
| Ajuste de RetroArch | Antes de cada juego cambia claves sueltas del `retroarch.cfg` (hoy, la combinación para salir) | `core/lanzador/retroarch-cfg.js` |

**Cómo se abre un juego retro.** Todos los sistemas retro usan RetroArch, con el mismo comando:

```
flatpak run org.libretro.RetroArch -f -L <carpeta de núcleos>/<núcleo>_libretro.so <juego>
```

GameCube va con Dolphin y PSP con PPSSPP. Esos dos dibujan en 3D a su resolución interna: no son pixel
art y quedan fuera de este trabajo.

## Lo que hay en la MP80

| Recurso | Valor | Cómo se comprobó |
|---|---|---|
| Procesador | Intel N95, 4 núcleos, de 800 MHz a 3.4 GHz | `lscpu` |
| Memoria | 16 GB | `/proc/meminfo` |
| GPU | Intel UHD Graphics (Alder Lake-N), con Mesa `iris` | `lspci`, registro de RetroArch |
| TV | HDMI-A-3 a 1920×1080. Modos disponibles: hasta 1920×1080; **no hay 1440p ni 4K** | `/sys/class/drm` |
| RetroArch | 1.22.2 (Flathub) | `flatpak info` |
| Núcleos | fbneo, mesen, snes9x, mgba, genesis_plus_gx, picodrive, flycast, swanstation, mednafen_pce, stella, mupen64plus_next | carpeta de núcleos |
| Otros | Dolphin 2609a, PPSSPP 1.20.4 | `flatpak list` |
| Shaders | 609 presets GLSL (los que acepta el driver `gl` actual) y 1 822 slang (piden `glcore` o `vulkan`) | dentro del Flatpak |

**Configuración gráfica de hoy** (`retroarch.cfg` de la MP80):

| Clave | Valor | Qué significa |
|---|---|---|
| `video_driver` | `gl` | OpenGL; acepta shaders GLSL |
| `video_vsync`, `video_swap_interval` | `true`, `1` | un cuadro por refresco de la TV |
| `video_threaded`, `video_hard_sync`, `video_frame_delay` | `false`, `false`, `0` | sin técnicas para bajar la latencia |
| `video_max_swapchain_images` | `3` | |
| `video_scale_integer` | `false` | escala no entera para llenar la altura |
| `video_smooth` | `false` | sin suavizado (vecino más cercano) |
| `video_shader_enable` | `false` | sin shader |
| `aspect_ratio_index` | `22` | la relación de aspecto que da el núcleo |
| `video_crop_overscan` | `true` | recorta el borde que una TV de tubo no mostraba |
| `run_ahead_enabled` | `false` | |
| `config_save_on_exit` | `true` | RetroArch guarda su configuración al cerrarse |
| `auto_shaders_enable`, `auto_overrides_enable` | `true`, `true` | acepta shaders y ajustes guardados por núcleo o por juego; hoy no hay ninguno |

## Problemas encontrados

1. **Escalado no entero.** Neo Geo da 224 líneas (304×224) y la TV tiene 1080: 1080 / 224 = 4.82. Unas
   líneas del juego ocupan 4 líneas de la TV y otras 5. Se ve en la captura del cuadro 1200 de Metal
   Slug: las letras de «INSERT COIN» tienen trazos de anchos distintos. Al desplazarse la pantalla, esa
   diferencia se mueve y la imagen «tiembla». En NES pasa lo mismo.
2. **Un solo `retroarch.cfg` para todo.** Neo Arcade ajusta claves de ese archivo antes de cada juego.
   Para perfiles visuales por juego eso obligaría a reescribirlo cada vez, y como
   `config_save_on_exit` está activo, lo que se cambie en el menú de RetroArch se mezcla con lo de Neo
   Arcade.
3. **Sin perfiles.** No existe forma de dar a un juego o a un sistema una imagen distinta.

## Opciones disponibles

| Opción | Qué hace | Costo |
|---|---|---|
| Escalado entero (`video_scale_integer`) | Cada píxel del juego mide lo mismo en la TV. Deja bordes negros. | Ninguno |
| Relación de aspecto | La del núcleo (hoy), 4:3 fija o personalizada | Ninguno |
| Suavizado (`video_smooth`) | Filtro bilineal: borra los bordes del pixel art | Ninguno; no conviene para pixel art |
| Shaders de escalado | sharp-bilinear (pixeles parejos sin escalado entero), hq2x, xbrz, scalefx | Bajo a medio |
| Shaders de CRT | De zfast-crt (una pasada) a crt-royale (muchas) | Bajo a alto |
| Ajustes por núcleo o por juego de RetroArch | `config/<núcleo>/<juego>.cfg` y presets de shader guardados | Ninguno, pero quedan fuera del control de Neo Arcade |
| `--appendconfig` | Un archivo de ajustes extra solo para esa ejecución | Ninguno |

## Propuesta (por comprobar en el laboratorio)

1. Los perfiles viven en la configuración de Neo Arcade, que ya es JSON por sistema
   (`systems.json`, `emulators.json`): un `config/visual.json` sigue la misma forma y se puede
   reemplazar en `~/NeoRetro/config/` como los demás.
2. Antes de abrir el juego, el lanzador escribe el perfil que le toca en un `.cfg` aparte y agrega
   `--appendconfig` al comando. El `retroarch.cfg` del usuario no se toca.
3. Si el shader no existe o RetroArch se cierra al abrir con el perfil, el juego se abre otra vez sin
   perfil.

Hipótesis que el laboratorio debe confirmar o descartar:

- que `--appendconfig` se aplica sin que RetroArch lo guarde después en el `retroarch.cfg`, aun con
  `config_save_on_exit` activo;
- qué shader da la mejor relación entre calidad, fidelidad y rendimiento en la GPU de la MP80;
- que el escalado entero no deja la imagen demasiado chica en sistemas de 240 líneas.

## Riesgos

- **Un shader que no compila** deja la pantalla en negro o cierra RetroArch. Por eso el fallback es
  obligatorio.
- **Otras PCs.** Neo Arcade debe funcionar en cualquier PC. Una GPU sin OpenGL 3 no acepta todos los
  shaders, y los slang piden `glcore` o `vulkan`.
- **Rendimiento.** Los CRT pesados pueden no sostener 60 cuadros por segundo en una GPU integrada.
- **Gusto.** El CRT es una preferencia. La configuración ganadora no debe ser la más procesada, y debe
  poder apagarse.

## Compatibilidad y rendimiento esperado

Hipótesis, sin medir todavía: el escalado entero no cuesta nada, los shaders de una pasada caben con
holgura en la GPU de la MP80 a 1080p, y crt-royale es el más probable en fallar. Los resultados medidos
están en [visual-enhancement-testing.md](visual-enhancement-testing.md).
