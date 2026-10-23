# Handoff del 2026-10-22, noche (imagen, continuar y menú del juego; juegos para el Game Stick)

Antes de este: `history/HANDOFF_2026-10-22_b.md` (laboratorio de la mejora visual) y
`history/HANDOFF_2026-10-22.md` (Game Stick en pausa, vuelta a Neo Arcade).

## Resumen

Tres cambios en Neo Arcade, instalados en la MP80, con 119 pruebas en verde ahí:

- **Imagen de los juegos en Configuración** (ef2dfb2): ORIGINAL, NÍTIDA, CRT y CRT SUAVE. De fábrica
  CRT (crt-hyllian-fast). El usuario vio «nitido» en la TV, le pareció muy pixeleado y pidió elegirlo
  sin estar probando, con el CRT recomendado de fábrica.
- **Continuar donde te quedaste y Menú del juego** (c4c90e6). El usuario preguntó cómo pausar y cómo no
  perder la partida; a la propuesta respondió «1 si, 2 si».
  - Continuar (de fábrica SÍ) usa el estado automático de RetroArch: lo guarda al salir y lo carga al
    abrir.
  - Menú del juego (de fábrica «mantener Select»): mantener Select 2 s abre el «Menú rápido» de
    RetroArch, que pausa el juego.
- **Corrección** (200a2d7): «Cerrar contenido» dejaba RetroArch abierto en su menú principal sin juego,
  y con el mando no había cómo volver. Neo Arcade escribe ahora `quit_on_close_content = "2"`.

Verificado sin pantalla en la MP80 (sesión de Cage sin TV, RetroPad remoto, Metal Slug), con
`visual-enhancement-lab/probar-continuar-y-menu.sh`, que lo repite:

- al salir quedó `mslug.state.auto` y al volver a abrir RetroArch lo cargó: la captura muestra el juego
  donde quedó y el aviso «Cargado automáticamente el guardado rápido»;
- Select mantenido 2.6 s abrió el «Menú rápido» en español;
- «Cerrar contenido» con el valor 0 dejó RetroArch abierto; con 2 lo cerró y dejó el estado guardado.

**Falta verlo en la TV con el mando real.** El tablero DragonRise usa la moneda como Select.

## Hallazgos

1. **El RetroArch de Flatpak tiene su propio `/tmp`.** Una configuración de prueba en `/tmp` no se lee
   y sus registros y capturas no aparecen fuera. Las pruebas van dentro de la carpeta personal
   (`~/visual-enhancement-lab/trabajo/`).
2. **En el menú de RetroArch, Aceptar es el botón de abajo del RetroPad** (B en el RetroPad, A en el
   mando de Xbox) y Volver el de la derecha. `control-remoto.py` usa los nombres del RetroPad: para
   aceptar se manda `b`.
3. **Nombres reales del menú en español** (1.22.2): Menú rápido → Reanudar, Reiniciar, Cerrar
   contenido, Guardados rápidos → Guardado rápido y Carga rápida. La guía ya los usa.
4. **Las claves nuevas se escriben al abrir cada juego.** Hoy `retroarch.cfg` sigue con los valores
   viejos (combinación del menú 0, estados automáticos en false, `quit_on_close_content` 0) porque no se
   ha abierto ningún juego desde la instalación.

## Apagados de la MP80 a las 19:31 y a las 20:37

Las dos veces, el registro del sistema dice «Power key pressed short» (19:31:33 y 20:37:29): alguien
presionó el botón de encendido y el equipo se apagó en orden. Volvió a encender a las 19:34 y a las
20:38. Se le preguntó al usuario si fue él; falta su respuesta.

Entre las 19:34 y las 20:37 las tres salidas HDMI figuraron desconectadas (TV apagada o desconectada).
Después del encendido de las 20:38 la TV aparece en HDMI-A-1; antes estaba en HDMI-A-3. Mientras no
hubo pantalla:

- Neo Arcade corre pero no escribe en su registro, porque la ventana no se dibuja hasta que hay
  pantalla;
- detener el servicio tarda 32 s en lugar de menos de uno: parece que la app no termina sola sin
  pantalla y systemd la corta al vencer el plazo. No se cambió nada; revisar si molesta.

## Juegos para el Game Stick

- El RAR se descomprimió en la MP80: `~/descargas-media/M8Pro-v1.5-release-V2.0.img`, de 62 534 975 488
  bytes, una imagen de la tarjeta del Game Stick con partición FAT32 desde el sector 8192.
- Se monta en solo lectura con `sudo /usr/sbin/losetup -r -P -f --show <imagen>` y
  `sudo mount -o ro /dev/loopNp1 /mnt/m8pro`. El montaje no sobrevive a un reinicio; hoy no quedó
  montada.
- **La imagen viene recortada:** la partición declara unos 6 MB más que el archivo (dmesg: «p1 size
  122144768 extends beyond EOD, truncated»). Siete archivos de `sfc` marcados «副本» caen en ese tramo y
  dan error de lectura; sus originales se leen bien. No es falla del disco de la MP80.
- **Lista de copia:** 8 299 juegos distintos por contenido (sha1), 14.12 GB, de `nes` (en el Game Stick
  se llama `fc`), `sfc`, `md`, `gb`, `gbc` y `gba`. Entre copias iguales se queda el nombre sin «副本».
  `mame`, `ps1` y `atari` no entraron en esta copia.
- **Copia a E:** (la tarjeta del Game Stick conectada a la PC), con `tar` por SSH y `--skip-old-files`.
  - El primer intento se cortó con el apagado de las 19:31: 863 archivos copiados, uno a medias («Shaun
    Palmer's Pro Snowboarder(UE).gba», 3.3 de 8.4 MB), que se borró antes de reintentar.
  - El segundo intento corrió de 19:41 a 20:37 y se cortó con otra pulsación del botón de encendido
    de la MP80. El usuario pidió entonces cancelar lo que faltaba y dejarlo anotado.
  - **Dónde quedó:** 6 536 de 8 299 juegos completos, revisados uno por uno contra el tamaño de
    origen. Están completos `fc` (3 021), `gb` (199), `gba` (1 132), `gbc` (160) y `md` (363). De
    `sfc` hay 1 661 de 3 424. Faltan 1 763 juegos de `sfc`, 2.55 GB, de «Mr Nutz (USA) (En,Fr)
    (Beta)» en adelante, en orden alfabético. Ese archivo había quedado a medias y se borró.
  - E: quedó con 12 GB usados y 21 GB libres.
- **Para retomar** (con la tarjeta conectada a la laptop como E:): montar la imagen como arriba y, desde
  la laptop,

  ```bash
  ssh arcade@192.168.100.94 'cut -f2 ~/descargas-media/listas-gamestick/faltan-tamanos.tsv > /tmp/faltan.txt
    cd /mnt/m8pro/roms && tar -cf - -T /tmp/faltan.txt' | tar -xf - -C /e/roms --skip-old-files
  ```

  Las listas están en `~/descargas-media/listas-gamestick/` de la MP80: `copiar-tamanos.tsv` (los
  8 299, con tamaño y nombre de destino; `nes/` ya aparece como `fc/`) y `faltan-tamanos.tsv` (los
  1 763 pendientes, todos de `sfc`). Al terminar, comparar tamaños contra `copiar-tamanos.tsv`. Si la
  copia se vuelve a cortar, el último archivo queda a medias y `--skip-old-files` no lo repone: hay que
  borrarlo antes.
- El menú del Game Stick (`GameStickLite/src/biblioteca.c`) arma la lista con los archivos de cada
  carpeta y usa el `gamelist.xml` solo si existe, así que los juegos nuevos deberían aparecer aunque no
  tengan ficha. Falta ver en el aparato cuánto tarda en leer más de 3 000 juegos por sistema.
- El RAR (33 GB) y la imagen (62.5 GB) siguen en la MP80. Se borran solo con el «sí» del usuario.

## Lo que cambió en la MP80

- `/opt/neo-arcade/resources/app`: los siete archivos de c4c90e6 y `core/lanzador/retroarch-cfg.js` de
  200a2d7. Respaldo de los anteriores en `~/NeoRetro/backups/app-antes-de-c4c90e6/` (el
  `retroarch-cfg.js` intermedio, con el sufijo `.c4c90e6`). Neo Arcade se reinició dos veces y quedó
  activo.
- `~/NeoArcade-desarrollo` en 200a2d7.
- `~/visual-enhancement-lab/trabajo/prueba-sesion/`, `prueba-cerrar/` y `prueba-continuar-y-menu/`:
  capturas de estas pruebas. `probar-continuar-y-menu.sh` copiado a `~/visual-enhancement-lab/codigo/`.
- `~/descargas-media/listas-gamestick/`: las listas de la copia al Game Stick.

## Pendiente, en orden

1. **Probar en la TV con el mando:** las tres filas nuevas de Configuración, Select mantenido dentro de
   un juego, Guardado rápido y Carga rápida, y Cerrar contenido.
2. **Terminar la copia al Game Stick** (1 763 juegos de `sfc`, 2.55 GB; cómo, arriba) cuando el
   usuario lo pida, y **probar el Game Stick con la tarjeta**: que arranque, cuánto tarda la biblioteca
   y que abra un juego de cada sistema. Se puede probar ya con lo copiado.
3. Qué hacer con el RAR y la imagen (95 GB en la MP80).
4. La detención de 32 s con la TV apagada, si molesta.
5. Volver a armar la imagen USB del instalador con todo esto.
6. Lo que sigue abierto de los handoffs anteriores:
   - la latencia de entrada (sin medir);
   - la moneda y la palanca del tablero y el sonido en la TV;
   - el cable del mando de Xbox;
   - juegos de PlayStation, GameCube y PSP.

## Observaciones

- Los scripts del laboratorio no corren si hay un `retroarch` abierto (salen con 3), para no tocar una
  partida del usuario. La prueba nueva cierra RetroArch con la orden QUIT por la red, no con `pkill`.
- La unidad C: de la laptop quedó con 8.5 GB libres, debajo de los 10 GB acordados. Nada de esta tanda
  escribe ahí; se le avisó al usuario.
