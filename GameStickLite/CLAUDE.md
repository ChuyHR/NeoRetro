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
- `bash scripts/armar-imagen.sh [--tamano-mb N] [--roms …] [--medios …] [--bios …] [--diseno …]`: imagen completa
  de la microSD en `compilado/gamestick.img`. Usa `fabrica/`, que está fuera del repositorio.
- `python3 scripts/preparar-medios.py <origen> <tarjeta>`: carátulas y fichas del menú, a partir del
  `gamelist.xml` y las imágenes de Neo Arcade.
- Diseño de Neo Arcade, en tres pasos: `python3 scripts/preparar-diseno.py <tarjeta> <origen> <salida>`, luego
  `node GameStickLite/scripts/capturar-diseno.mjs <biblioteca> <capturas>` desde la raíz de
  ArcadeRetro y `python3 scripts/convertir-diseno.py <capturas> <tarjeta>`. Cada juego nuevo pide
  repetirlos; sin eso el menú usa su dibujo propio.
- La guía para el usuario está en [docs/guia.md](docs/guia.md).
- **Probar en QEMU:** ver [docs/sistema-propio.md](docs/sistema-propio.md), «Probar en la laptop».
- **Ojo:** WSL monta `E:` (la tarjeta) solo si estaba al arrancar. Si no, usar
  `sudo mount -t drvfs E: /mnt/e`. Y `wsl -d Debian -e bash -c '…'` necesita `MSYS_NO_PATHCONV=1` desde
  Git Bash.

## Estado (2026-10-22, noche)

Detalle de la placa y del arranque en [docs/fase0.md](docs/fase0.md); lo construido, en
[docs/sistema-propio.md](docs/sistema-propio.md).

- **Placa:** `M8_PRO 2023-08-22 V1.5`, Amlogic AML8726-MX, 256 MB de RAM. No tiene memoria propia: el
  arranque, el kernel 3.0.50 y el sistema viven en la microSD.
- **Revivido:** arranca con el sistema de fábrica V1.5 y llega a su menú.
- **Sistema propio, probado en el aparato:** el lanzador dentro de `DATA03` corre `neo/arranque.sh`
  y después el menú de fábrica. El menú `neo-menu` y cinco emuladores (NES, SNES, Game Boy y Color,
  GBA, Mega Drive) funcionan con el tablero Zero Delay del usuario por usbfs, porque el kernel no crea
  su control. Hay 60 juegos de la biblioteca del usuario, copiados de la MP80. Las partidas se guardan.
- **Diseño de Neo Arcade (sin probar en el aparato):** el menú pinta pantallas capturadas de Neo
  Arcade (`neo/diseno/`, 124 pantallas) y una portada al encender para tapar la imagen del fabricante.
  Verificado en QEMU con la pantalla en RGB565.

**Pendiente, en orden:**

1. Que el usuario pruebe en el aparato el diseño y la portada. Si la imagen del fabricante sigue
   apareciendo antes de la portada, pedirle una foto: no se sabe qué la pinta (u-boot dice «not
   display in uboot» y el `init` de fábrica está cifrado).
2. Pospuesto por el usuario para el final: velocidad de SNES, GBA y Mega Drive en el aparato, sonido
   en una TV con bocinas y confirmar izquierda y derecha de la palanca.

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
