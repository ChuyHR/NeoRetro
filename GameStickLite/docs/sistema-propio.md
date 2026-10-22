# Sistema propio en el Game Stick

Cómo se monta nuestro sistema sobre el arranque de fábrica, cómo se compila y cómo se prueba en la
laptop. Lo averiguado del aparato está en [fase0.md](fase0.md).

## Cadena de arranque de fábrica (M8 Pro V1.5, verificada leyendo los archivos)

1. **El arranque** (u-boot de Amlogic M6) está en el primer MB de la microSD. Carga `res/DATA01`
   (kernel Linux 3.0.50 ARM) y `res/DATA02` (árbol de dispositivos) de la partición FAT32, que
   empieza en el MB 4.
2. **El kernel** trae dentro su sistema inicial: un cpio comprimido con LZO, en el byte 102 988 del
   kernel descomprimido. Contiene busybox 1.32, glibc 2.19 (Linaro 2014.08), `keypad_0810_0001.ko`,
   MiniGUI y `etc/init.d/rcS`.
3. **`rcS`**:
   - monta la tarjeta en `/mnt`;
   - crea las carpetas de `save/`;
   - usa `res/DATA06` como swap de 512 MB;
   - monta `res/DATA03` desde el byte 6 291 456 (ext3, solo lectura) en `/usr/res`;
   - corre en bucle `/usr/res/bin/arm-linux-gdb --tty=/dev/ttyS0 /entry --ex r`, que abre el menú de
     fábrica.

   Deja exportados `LD_LIBRARY_PATH` y `PATH` con `/usr/res`.

## Dónde se engancha lo nuestro

`scripts/armar-data03.sh` parte del `DATA03` original de la V1.5 y lo cambia así:

- `arm-linux-gdb` pasa a llamarse `arm-linux-gdb.fabrica`;
- su lugar lo ocupa `sistema/lanzador.sh`.

Lo demás de `DATA03` queda igual. El lanzador:

1. una vez por encendido (marca en `/tmp`) corre `/mnt/neo/arranque.sh` de la tarjeta;
2. después, o si algo falla, hace `exec` del menú de fábrica con los mismos argumentos.

El kernel y el arranque no se tocan. Todo lo nuestro vive en `neo/` de la tarjeta y se cambia desde
la laptop sin rearmar `DATA03`.

`neo/arranque.sh` corre en orden, cada paso con límite de tiempo (`timeout` de busybox):

1. `neo-menu --portada`, hasta 10 s. Pinta la portada de Neo Arcade (`neo/diseno/portada.frm`) y
   sale sin borrarla, para tapar cuanto antes la imagen del fabricante. Se queda a la vista hasta que
   el menú dibuja.
2. `diagnostico.sh`, hasta 60 s. Escribe `neo/diagnostico.txt`.
3. `neo-prueba`, hasta 200 s, **solo la primera vez**. Muestra la pantalla, los controles y el
   sonido y escribe `neo/registro-prueba.txt`. Al terminar deja `neo/prueba-hecha`; si se borra, la
   prueba vuelve a correr.
4. `neo-menu`, con un seguro de 6 horas. Es el menú de juegos y escribe `neo/registro-menu.txt`. Cada
   juego deja su registro en `neo/registro-retro.txt`.

Al final queda `neo/arranque.log`.

## Programas

Son estáticos con musl, para ARMv7 Cortex-A9 con hard-float. Los compila Zig 0.13 (`~/zig` en el
Debian de WSL) con `scripts/compilar.sh`.

**`neo-prueba`** (`src/prueba.c` + `src/pantalla.c`):

- dibuja directo en `/dev/fb0` (cualquier resolución, a 16, 24 o 32 bits, con el alfa opaco del OSD
  de Amlogic);
- lista los `/dev/input/event*` y muestra en vivo los botones 288 a 299 y la palanca;
- al primer botón reproduce un `.wav` de fábrica con `/usr/res/bin/aplay`;
- se cierra al mantener un botón 5 s, tras 60 s sin uso o a los 3 minutos.

**`neo-menu`** (`src/menu.c` + `pantalla.c` + `mandos.c`), al estilo de Neo Arcade:

- **Pestañas:** los sistemas con juegos, más FAVORITOS y RECIENTES cuando tienen algo.
- **Lista y ficha:** la lista va a la izquierda, con los títulos sin extensión ni marcas entre
  paréntesis y `*` en los favoritos. A la derecha van la carátula y la ficha: nombre, año, género,
  jugadores, desarrollador y la descripción partida en renglones.
- **Botones** (con los nombres de Neo Arcade):
  - arriba y abajo eligen el juego, con repetición al mantener;
  - izquierda y derecha, o LB y RB, cambian de sistema;
  - LT y RT saltan de letra;
  - A juega y X marca favorito;
  - Select solo pasa por Favoritos, Recientes y el sistema de antes;
  - Select + Start mantenidos 2 s salen al menú de fábrica.
- **Start no abre juegos:** un Start un instante antes del Select abriría uno al querer salir.
- **Sin controles:** sale al menú de fábrica a los 30 s. No sale por inactividad.
- **Datos guardados:** favoritos y recientes (20) quedan en `neo/datos-usuario.txt`. Se escribe
  aparte y se renombra.
- **Carátulas y fichas:** `neo/medios/<carpeta>/<juego>.img` (RGB565 con cabecera `NEOI`) y `.txt`.
  Las prepara `scripts/preparar-medios.py` con el `gamelist.xml` y las imágenes de Neo Arcade de la
  MP80. Hay 59 de los 60 juegos copiados.
- **Velocidad:** solo redibuja cuando cambia algo, porque pintar 1280x720 en cada cuadro es lento en
  el Cortex-A9.

### El menú con el diseño de Neo Arcade (`src/diseno.c`)

Con `neo/diseno/` en la tarjeta, el menú se ve igual que Neo Arcade en la MP80. El Game Stick no
puede correr la interfaz de Neo Arcade (Electron), así que se usan sus propias pantallas, capturadas
en la laptop:

1. `scripts/preparar-diseno.py` arma en WSL una biblioteca de Neo Arcade con los juegos, las carátulas
   y las fichas de la tarjeta, más un favorito y un reciente de muestra.
2. `scripts/capturar-diseno.mjs` abre el Electron de Neo Arcade con esa biblioteca y lo maneja por el
   protocolo de depuración de Chromium. Captura a 1920×1080:
   - cada sistema y ALL GAMES, juego por juego, comprobando que el juego del centro sea el esperado;
   - la barra con FAVORITOS y RECIENTES activos;
   - el menú de acciones en sus cuatro estados (JUGAR o FAVORITOS elegido, estrella encendida o no);
   - la portada, el cuadro final de la animación de arranque (`app/piezas/arranque.js`).

   Antes de cada captura cambia lo que no aplica en el Game Stick: el reloj por «LITE / GAME STICK
   4K», la versión por «NEO ARCADE LITE / LINUX 3.0» y la leyenda del pie por los botones del
   tablero. Con `--solo-portada` captura solo la portada.
3. `scripts/convertir-diseno.py` las reduce a 1280×720 y las guarda como `.frm`: cabecera `NEOF`,
   posición y tamaño en 16 bits, largo en 32 bits y los píxeles en RGB565 comprimidos con LZ4 en
   bloque. Escribe también `indice.txt` con las vistas y el juego de cada pantalla. Con 62 juegos
   ocupa 31.8 MB.

En el aparato, `diseno.c` lee `indice.txt` y descomprime cada pantalla en el lienzo. Guarda en memoria
las 8 últimas piezas y adelanta las de los juegos vecinos, que son las que se piden después. Encima de
la pantalla del juego pinta la barra (en FAVORITOS y RECIENTES, que se arman con lo guardado y reusan
las pantallas de ALL GAMES), el menú de acciones y los avisos en el pie.

Botones en este modo:

- izquierda y derecha mueven el carrusel, con repetición al mantener;
- LB y RB cambian de sistema;
- arriba y abajo eligen JUGAR o FAVORITOS, y A lo ejecuta;
- X marca o quita el favorito;
- LT y RT saltan de letra;
- Select pasa por Favoritos y Recientes;
- Select + Start mantenidos 2 s salen al menú de fábrica.

El modo se usa solo si la pantalla es de 1280×720 en RGB565 y **todos** los juegos de la tarjeta
tienen pantalla. Un juego agregado después de capturar no la tiene; con uno solo así, el menú usa su
dibujo propio para no esconderlo, y lo anota en `neo/registro-menu.txt`. Para volver al diseño se
repiten los tres pasos. `NEO_SIN_DISENO=1` fuerza el dibujo propio.

**`neo-retro-<sistema>`** (`src/retro.c` + `pantalla.c` + `mandos.c`) es un frontend libretro
mínimo, con un núcleo enlazado dentro:

| Programa | Núcleo | Versión |
|---|---|---|
| `neo-retro-nes` | FCEUmm | `ac0d00a` |
| `neo-retro-snes` | Snes9x 2005 | `a79dfe9` |
| `neo-retro-gb` | Gambatte (Game Boy y Game Boy Color) | `d9d6cd0` |
| `neo-retro-gba` | gpSP con recompilador ARM | `5819380` |
| `neo-retro-md` | PicoDrive con núcleos de CPU en C | `1890c29` |

Para gpSP, `neo/sistema/gba_bios.bin` es la BIOS del usuario, copiada de la MP80.

- **Video:** escala entera y centrado. Si el núcleo cambia de tamaño, se borra lo que sobra.
- **Sonido:** tinyalsa 1.1.1. Prueba la frecuencia del núcleo y luego 48 000 y 44 100, en las tarjetas
  0 y 1 con los dispositivos 0 a 3. Si la salida no acepta la frecuencia del núcleo, la convierte con
  interpolación lineal. El sonido marca el paso del juego.
- **Controles** (`mandos.c`): el DragonRise 0079:0006 usa el mapeo que el usuario hizo en la MP80,
  con la palanca girada; otros controles usan un mapeo genérico.
- **Salir:** Select + Start (moneda + Start). No sale por inactividad, para no cerrar un juego en
  pausa. Ante SIGTERM, SIGINT o SIGHUP sale por el camino normal.
- **Partidas** (`RETRO_MEMORY_SAVE_RAM` y `RETRO_MEMORY_RTC`):
  - se leen de `neo/partidas/<sistema>/<juego>.srm` (y `.rtc`) al abrir;
  - se escriben si cambiaron, revisando cada 30 s, y al salir;
  - para saber si cambiaron se compara una huella FNV-1a;
  - se escriben aparte, con `fsync`, y se renombran.

  Comprobado en QEMU con Pokémon Oro: guardó 32 KB y en la siguiente vuelta los cargó.

## Imagen completa de la tarjeta

`scripts/armar-imagen.sh` arma `compilado/gamestick.img`, lista para balenaEtcher o Win32DiskImager:

- **Tabla:** MBR con firma `0x0000d3be`, como la de fábrica.
- **Arranque:** el de fábrica en los bytes 0 a 445 y en los sectores 1 a 2047.
- **Partición:** FAT32 tipo 0x0C desde el sector 8192, con `res/`, `neo/`, `roms/`, `save/` y
  `download/`. Con `--diseno <carpeta>` incluye las pantallas de Neo Arcade en `neo/diseno/`. El clúster depende del tamaño: 4 KB hasta 8 GB y 32 KB, como el de fábrica, desde 32
  GB. FAT32 pide al menos 65 525 clústeres; con menos, Linux la toma por FAT16.

Usa `sfdisk`, `mkfs.fat` y `mtools`, sin montar nada. Toma los archivos de fábrica de `fabrica/`, que
no está en el repositorio, y los comprueba con `fabrica/HUELLAS.txt`.

Verificado con una imagen de 2 GB:

- el primer MB es igual al de fábrica salvo 6 bytes de la tabla;
- `fsck.fat` la da limpia;
- la cadena completa corre en el `chroot` montando la partición de la imagen en `/mnt`.

La guía para el usuario está en [guia.md](guia.md).

## El tablero del usuario no aparece como control en el Game Stick (2026-10-22)

En la primera prueba en el aparato, la pantalla y el menú funcionaron (OSD de 1280x720 a 16 bits,
RGB565), pero el tablero no respondía. Lo dijeron `neo/diagnostico.txt` y `dmesg`:

- el tablero se enumera bien (`usb 2-1: … idVendor=0079, idProduct=0006`, «DragonRise Inc. Generic
  USB Joystick»), pero no se crea ningún dispositivo de entrada: `/dev/input` no existe y
  `/proc/bus/input/devices` está vacío;
- la causa: el kernel 3.0 pone al DragonRise 0079:0006 en `hid_have_special_driver`, así que
  `generic-usb` no lo toma, y `CONFIG_HID_DRAGONRISE` no está compilado. Ningún driver lo maneja. Por
  eso tampoco funcionaba en el menú de fábrica.

**Solución en `mandos.c`:** el tablero se lee directo por usbfs.

- Lo busca en `/sys/bus/usb/devices` (0079:0006) y abre `/dev/bus/usb/BBB/DDD`, que existe por
  `CONFIG_USB_DEVICE_CLASS=y`. Si falta el nodo, lo crea en `/tmp` con major 189.
- Toma la interfaz 0 y pide reportes de interrupción con `USBDEVFS_SUBMITURB`, que recoge sin bloquear
  con `USBDEVFS_REAPURBNDELAY`.
- Traduce cada reporte a los códigos que da Linux cuando sí lo maneja: ejes 0 a 5, cruceta 16 y 17,
  botones 288 a 299. Con eso sirve el mapeo de la MP80.
- El menú suelta el tablero (`cerrar_mandos`) antes de abrir un juego y lo vuelve a tomar al regresar,
  porque solo un programa a la vez puede tener la interfaz.
- Los primeros 20 reportes quedan en el registro, para revisar el formato.

**Formato del reporte**, confirmado con el tablero en la laptop: lectura de 40 s con la API HID de
Windows, que antepone el byte de reporte 00. Son 8 bytes:

| Bytes | Contenido |
|---|---|
| 0 y 1 | X e Y, de 00 a FF, con centro 7F |
| 2 | Z: eje sin conectar que cambia solo, entre 84 y 88 |
| 3 y 4 | Z y Rz |
| 5, bits bajos | Cruceta (0F es centro; este tablero trabaja con ejes) |
| 5, bits altos | Botones 1 a 4 |
| 6 | Botones 5 a 12 |
| 7 | C0 fijo |

- **Botones**, físicamente de izquierda a derecha: 1, 2, 3, 4, 11, 12, 6 y 5. Moneda es el 10 y Start
  el 9. Coincide con el mapeo de la MP80.
- **Palanca:** pedida en el orden arriba, abajo, izquierda y derecha, dio X=00, X=FF, Y=00 e Y=FF.
  El mapeo de la MP80 dice que la derecha es Y-. Con ese mapeo el usuario jugó Metal Slug sin
  notar nada, así que se dejó así. **Por confirmar en el Game Stick.**

**Segunda prueba:** `CLAIMINTERFACE` daba «Resource busy», porque `usbhid` sí toma la interfaz aunque
no le dé driver de control. Se suelta con `USBDEVFS_DISCONNECT` antes de tomarla. El registro dice:
«la interfaz 0 la tenía «usbhid»; se soltó».

**Tercera prueba (2026-10-22): funciona.** El usuario jugó Bomberman (NES) con el tablero:

- la palanca y los botones responden;
- se ve fluido: 598 cuadros en 10 s, 1 801 en 30 s;
- moneda + Start regresó al menú;
- el sonido abrió la tarjeta 0, dispositivo 0, a 48 000 Hz, sin huecos. No se pudo oír: la TV del
  usuario no tiene bocinas.

Se corrigió además que el eje suelto (byte Z), que cambia solo, contara como uso e impidiera que el
menú y los juegos se cerraran por inactividad.

**Falta medir en el aparato:** Super Nintendo, GBA y Mega Drive, los núcleos más pesados.

## Probar en la laptop

En el Debian de WSL, con `qemu-user-static`, `binfmt-support`, `e2fsprogs`, `lzop` y
`binutils-arm-linux-gnueabi`:

- `NEO_SIMULAR=1 NEO_CAPTURA=/tmp/x.png qemu-arm-static compilado/neo-prueba /tmp/r.txt` dibuja en
  memoria y guarda la pantalla.
- `NEO_SIMULAR=1 NEO_CUADROS=600 NEO_CAPTURA=/tmp/nes.png qemu-arm-static compilado/neo-retro-nes <juego>`
  hace lo mismo con un emulador. Con `NEO_SALIDA_HZ=48000` también prueba la conversión de
  frecuencia y anota la razón obtenida contra la esperada.
- `NEO_SIMULAR=1 NEO_ROMS=/mnt/e/roms NEO_CAPTURA=/tmp/menu.png qemu-arm-static compilado/neo-menu`
  dibuja el menú con los juegos de la tarjeta. En WSL la tarjeta se monta con
  `sudo mount -t drvfs E: /mnt/e`; el montaje se pierde cuando WSL se reinicia.
- Con `NEO_SIMULAR=16` la pantalla simulada es RGB565, como la del aparato, y el menú usa el diseño
  de Neo Arcade si `NEO_NEO` apunta a una carpeta con `diseno/`. `NEO_SIMULAR_TECLAS=derecha,x,rb…`
  aplica botones antes de la captura, y `neo-menu <registro> --portada` captura la portada.

Verificado así el 2026-10-22, con una captura de cada emulador en su pantalla de título:

- Nova the Squirrel (NES);
- Super Mario World (SNES);
- Sonic (Mega Drive);
- Tetris (Game Boy);
- Mario Kart Super Circuit (GBA).

La conversión de frecuencia dio exactamente la razón esperada en Snes9x, gpSP y Gambatte.
- **El arranque completo** se prueba en un `chroot`:
  1. el sistema inicial del kernel (`~/gamestick/rd`);
  2. el `DATA03` armado, montado en `/usr/res`;
  3. `neo/` en `/mnt`.

  Al correr ahí `/usr/res/bin/arm-linux-gdb`, la primera vuelta corre lo nuestro y la segunda va
  directo al menú de fábrica.

Lo que no se emula: la salida de video Amlogic, el sonido real y la velocidad del aparato.
