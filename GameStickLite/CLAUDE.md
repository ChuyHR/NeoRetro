# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

GameStickLite es un trabajo aparte dentro del repositorio de Neo Arcade. El aparato es una consola
retro que se conecta directo al HDMI de la TV y trae dos mandos inalámbricos de 2.4 GHz con su
receptor USB. El usuario pide dos cosas:

1. **«Revivir un Game Stick Lite 4K».**
2. **Crear con lo aprendido algo similar a Neo Arcade** para ese aparato (2026-10-22).

El plan está en [docs/plan.md](docs/plan.md). El usuario pidió el 2026-10-22 «continúa hasta la fase
que puedas para no estar sacando y metiendo la memoria», así que se avanzó varias fases de una vez. Lo
construido y cómo probarlo está en [docs/sistema-propio.md](docs/sistema-propio.md).

## Comandos (en el Debian de WSL)

- `bash scripts/compilar.sh`: compila `neo-prueba`, `neo-menu` y los `neo-retro-*` en
  `compilado/`. Baja las fuentes de terceros a `~/gamestick/fuentes` en versión fija.
- `bash scripts/armar-data03.sh <DATA03 original V1.5>`: arma el `DATA03` con el lanzador en
  `compilado/DATA03`.
- **Probar en QEMU:** ver [docs/sistema-propio.md](docs/sistema-propio.md), «Probar en la laptop».
- **Ojo:** WSL monta `E:` (la tarjeta) solo si estaba al arrancar. Si no, usar
  `sudo mount -t drvfs E: /mnt/e`. Y `wsl -d Debian -e bash -c '…'` necesita `MSYS_NO_PATHCONV=1` desde
  Git Bash.

## Estado

Creado el 2026-10-22. La carpeta solo tiene este archivo: todavía no hay código, scripts ni
documentos.

**Identificado el 2026-10-22** (detalle en [docs/fase0.md](docs/fase0.md)):

- procesador Amlogic AML8726-MX, placa `M8_PRO 2023-08-22 V1.5` y 256 MB de RAM;
- el arranque está dentro del aparato y lee de una microSD FAT32 la carpeta `res/` (kernel Linux 3.0.50
  ARM en `DATA01` y árbol de dispositivos en `DATA02`);
- **revivido**: con el arranque, el kernel y el sistema V1.5 llega al menú de fábrica. Ese menú
  solo acepta los controles inalámbricos, que no tienen pilas, y no el tablero del usuario;
- **sistema propio en la tarjeta** (2026-10-22), sin probar todavía en el aparato:
  - un lanzador dentro de `DATA03` que corre lo de `neo/` y después el menú de fábrica;
  - un diagnóstico;
  - la prueba de controles;
  - el menú `neo-menu`;
  - cinco emuladores: NES, SNES, Game Boy y Game Boy Color, GBA y Mega Drive;
  - 60 juegos de la biblioteca del usuario, copiados de la MP80.

Lo de abajo sobre Hi3798MV100 y RK3032 era la búsqueda previa; no aplica a esta placa.

**Lo que dijo el usuario (2026-10-22):** usó la microSD del Game Stick para otra cosa y no guardó copia
del sistema. Sin esa tarjeta el aparato no tiene sistema que arrancar. Por eso hay que conseguir una
imagen que corresponda a su placa y escribirla en una microSD.

**Lo que dicen fuentes públicas (sin verificar en este aparato):**
- Con el mismo nombre comercial se venden placas con distinto procesador, al menos Rockchip RK3032 y
  HiSilicon Hi3798MV100. La imagen de una no arranca en la otra.
- La placa trae impresos el modelo y la versión (por ejemplo «M8 V9.0 20240430»), y el procesador
  tiene su nombre grabado. Se ven al abrir la carcasa.
- Tiene 256 MB de RAM (página de GStickOS). Por eso no cabe lo que usa Neo Arcade (Electron, Debian,
  Flatpak); el sistema propio va en C con SDL2, encima de RetroArch.
- Para Hi3798MV100 existe GStickOS (lucamot.github.io/GStickOS). Es gratis, trae RetroArch y unos 50
  núcleos, no trae juegos y pide una microSD de 2 GB o más. No publica licencia («All rights
  reserved») y solo publica su compilador (github.com/lucamot/HiSTBLinuxV100R005C00SPC050).
- Para RK3032 hay un port de EmuELEC («SpectralElec», en XDA) y copias completas de fábrica en
  archive.org. Esas copias **traen juegos comerciales**, así que no se descargan (regla del usuario).
  Si no hay una imagen sin juegos para su placa, se le plantea antes de seguir.

**Siguientes pasos, en orden:**
1. Identificar la placa: una foto del procesador y del modelo impreso.
2. Elegir la imagen solo de sistema que corresponda a ese procesador y versión.
3. Escribirla en una microSD buena, de preferencia nueva. Las que vienen con estos aparatos fallan
   seguido.
4. Cargar juegos de la biblioteca propia del usuario, la que está en la MP80 en `~/NeoRetro/roms`.

No se borra ni se reescribe ninguna tarjeta antes de confirmar la placa. Si aparece una tarjeta con el
sistema original, se respalda completa antes de tocarla.

## Relación con Neo Arcade

- Claude Code también carga el `CLAUDE.md` de la carpeta de arriba (Neo Arcade). Su plan, sus fases,
  sus ajustes y la skill `neo-arcade` **no** rigen aquí; son de otro producto y otro equipo.
- Sí aplican las reglas del usuario que no dependen del producto:
  - no se descargan ROMs comerciales;
  - no se borran sus archivos sin su «sí»;
  - todo va en español de México;
  - nada de subagentes.
- Las imágenes de tarjetas, los respaldos y las ROMs no se suben al repositorio: pesan gigas y pueden
  tener juegos con derechos de autor.
- Lo que se aprendió en Neo Arcade puede servir, pero se verifica en este aparato antes de usarlo:
  mandos USB, perfiles de RetroArch o salida de sonido por HDMI.
