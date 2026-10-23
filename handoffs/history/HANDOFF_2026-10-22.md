# Handoff del 2026-10-22 (Game Stick en pausa; se vuelve a Neo Arcade)

Antes de este: `history/HANDOFF_2026-10-21.md` (primeros mandos reales en la consola, sonido por el
HDMI de la TV).

## Resumen

El día se dedicó casi entero a **GameStickLite**, un trabajo aparte dentro de este repositorio
(`GameStickLite/`, con su propio `CLAUDE.md`):

- Se revivió el Game Stick Lite 4K del usuario.
- Se le hizo un sistema propio con menú y cinco emuladores, que funcionan con su tablero.

Al final el usuario dijo: «de momento este proyecto Game Stick lo veo ya todo bien, volvamos a Neo
Arcade». **El Game Stick queda en pausa** y lo siguiente es Neo Arcade, sin un pedido concreto todavía.

En Neo Arcade no se cambió código hoy. Solo se usó su Electron en WSL para capturar pantallas, y ese
trabajo se descartó después (ver abajo).

## Neo Arcade

- **Descarga en la MP80, en curso.** El usuario pidió mandar a la MP80 el enlace de
  `links/media.txt` sin abrir el archivo. Se hizo así:
  - el archivo se copió a la MP80 y `wget -c -i` lee el enlace allá;
  - corre en segundo plano en `~/descargas-media/` con su registro en `descarga.log`;
  - baja `M8Pro-20230822-v1.5--M8-20230420-release-V2.rar`, de 33.2 GB (31 GiB). Por el nombre es el
    paquete de fábrica de la placa del Game Stick;
  - a las 16:36 iba en 47 % y calculaba unos 77 minutos más;
  - no se abre ni se descomprime sin pedido del usuario;
  - `links/` no está en git ni en `.gitignore`, y no se sube: es del usuario.
- Los pendientes del handoff anterior siguen igual. El usuario no ha vuelto a mencionar la moneda ni
  el sonido en la TV, así que siguen sin confirmar.

## GameStickLite (en pausa)

Detalle completo en `GameStickLite/CLAUDE.md`, `GameStickLite/docs/` y la memoria
`gamesticklite-proyecto`.

- **Placa:** `M8_PRO 2023-08-22 V1.5`, Amlogic AML8726-MX, 256 MB. No tiene memoria interna: el
  arranque, el kernel 3.0.50 y el sistema van en la microSD.
- **Sistema propio:**
  - un lanzador dentro de `DATA03`;
  - el menú `neo-menu`;
  - emuladores libretro estáticos (musl con Zig): NES, SNES, Game Boy y Color, GBA, Mega Drive.
  - El tablero Zero Delay se lee por usbfs, porque ese kernel no le da controlador.
- **Menú.** El usuario rechazó el primero, hecho con capturas de Neo Arcade: cada juego nuevo pedía la
  laptop, y Recientes mostraba los vecinos de ALL GAMES. Dijo: «no es viable para mí ni para nadie».
  - El menú actual sigue un diseño que el usuario pidió a GPT (`GameStickLite/docs/prompt-diseno-gpt.md`).
  - Se dibuja en el aparato, por software en C.
  - Lee `gamelist.xml` e imágenes de RetroBat tal como están en la MP80.
- **En la tarjeta** desde las 16:40, verificado por SHA-256:
  - el menú nuevo;
  - los `gamelist.xml` y las imágenes de los 60 juegos;
  - se quitaron las capturas del menú descartado.
- **Prueba en el aparato:** el usuario dijo «parece que todo bien». No se ha leído su registro, así que
  la velocidad del carrusel en el aparato no está medida.
- **Opciones que se le ofrecieron**, sin elegir ninguna:
  1. leer juegos `.zip`: en la MP80 casi todo está así, 466 de 470 de Mega Drive y 441 de 444 de SNES;
  2. arcade y Neo Geo: 599 y 127 juegos;
  3. Master System, Game Gear y PC Engine;
  4. las pruebas que pospuso: velocidad de SNES, GBA y Mega Drive, sonido en TV y la palanca.
- **Hallazgos** que sirven si se retoma (en `GameStickLite/docs/hardware.md`):
  - el kernel de fábrica usa un solo núcleo y no tiene red;
  - por USB no se puede conectar a la PC;
  - para probar sin mover la tarjeta haría falta un cable serie a la placa;
  - con un kernel propio se tendría Wi-Fi y dos núcleos, pero es un proyecto aparte.

## Pendiente, en orden

1. **Preguntar al usuario qué quiere en Neo Arcade.** Solo dijo «volvamos a Neo Arcade».
2. Lo que sigue abierto del handoff del 2026-10-21:
   - confirmar la moneda, la palanca y la salida con el tablero, y el sonido en la TV;
   - el cable del mando de Xbox;
   - volver a armar la imagen USB del instalador;
   - la revisión de las fases 1 a 8, la skill (§19) y juegos de PlayStation, GameCube y PSP.
3. Cuando termine la descarga, avisarle al usuario. No tocar el archivo sin su pedido.

## Observaciones

- Ruta de control de la MP80: SSH por Wi-Fi a `192.168.100.94` con `~/.ssh/neoarcade_ed25519`.
- C: tenía 11 GB libres por la tarde; el límite que pidió el usuario es 10 GB.
- Las notas intermedias se le ven plegadas al usuario: lo importante va en el mensaje final, siempre en
  español.
