# Fase 0: identificar el aparato

Empezó el 2026-10-22 a pedido del usuario («comienza con la fase 0»).

## Restricción

La carcasa del Game Stick está pegada y el usuario no la puede abrir. El procesador no se puede leer
en la placa. Se identifica sin abrirlo, con pruebas que no lo dañan.

## La microSD que tiene el usuario

Revisada el 2026-10-22 en la laptop, solo con lectura. El usuario no la podía formatear.

- Tarjeta SDXC de 64 GB (58.2 GB útiles), en un lector USB Alcorlink (058F:6366).
- Una sola partición exFAT de 59.6 GB, casi llena: 0.6 GB libres.
- Contiene las carpetas `RECA`, `RECB`, `SAVE` e `IMG`, fechadas el 01/01/2025. Parece una tarjeta
  de cámara para auto, que graba sin parar.
- **Windows la marca de solo lectura** (`IsReadOnly = True`). No hay política de Windows que lo cause
  (`StorageDevicePolicies` no existe). Por eso no se deja formatear.

Hay dos causas posibles:

1. **El seguro del adaptador**, si la microSD va en un adaptador de tamaño SD. Se desliza hacia
   arriba y se vuelve a insertar.
2. **La tarjeta se bloqueó sola.** Las tarjetas que se desgastan, sobre todo por grabar video sin
   parar, pasan a solo lectura para proteger lo que tienen. Ese bloqueo es permanente y ninguna
   herramienta lo quita.

El usuario movió el seguro y volvió a insertarla. Sigue de solo lectura: Windows la reporta así aun
después de refrescar el estado de los discos, y una escritura de prueba de un archivo pequeño falló
con «El medio está protegido contra escritura». Para separar las dos causas, se prueba en una ranura
microSD directa, sin adaptador, o en otro lector. Si ahí sigue bloqueada, la tarjeta se bloqueó sola.

Segundo intento, el mismo día, después de que el usuario la volviera a conectar: sigue de solo lectura
y la escritura de prueba falla igual. No se sabe si esta vez entró sin adaptador.

Ocupación: `RECA` tiene 31 archivos y 32.4 GB, `RECB` 31 archivos y 21.8 GB, `SAVE` 4 archivos y
3.5 GB, e `IMG` está vacía.

Aunque se desbloquee, una tarjeta gastada por una cámara no conviene para el sistema del Game Stick.
Se recomienda una nueva, de buena marca, de 16 a 32 GB y clase A1 o mejor.

## La segunda microSD (la que se va a usar)

El usuario conectó otra tarjeta el mismo día.

- 64 GB (63 910 707 200 bytes), en el mismo lector. **Sí acepta escritura.**
- Windows no reconoce su formato. El sector 0 empieza con «WFS0.4» y termina con «XM»: es el formato
  de grabación de las cámaras de seguridad Xiongmai. Se leyeron los primeros 32 MB, solo con lectura.
  No es la tarjeta del Game Stick.
- El usuario escribió: «respaldo de la sd ya que no tengo espacio aquí, no es info importante». Se
  interpretó como «no hace falta respaldarla, se puede borrar».

## La imagen de GStickOS

- `GStickOS-1.0.1.zip`, publicada en GitHub el 2025-05-12: 411 418 654 bytes. Su SHA-256 es
  `6f779c74…a7f6`; GitHub no publica huella para compararla.
- Contiene `GStickOS-1.0.1.img`, de 1 258 291 200 bytes, con SHA-256 `d438b38b…e73d`.
- No tiene tabla de particiones MBR. El cargador está en el sector 0: «Fastboot 3.3.0-dirty», del 14 de
  octubre de 2024, para «Hi3798Mv100».
- Su línea de arranque fija `mem=256M` y estas particiones de `mmcblk0`: `1M(boot)`, `1M(bootar)`,
  `8M(kernel)`, `128M(rootfs)` y `-(free)`. Hay ext4 en el MB 10 (sistema) y en el MB 138 (espacio
  libre), como dice su página.

## Escritura en la tarjeta (2026-10-22)

La hizo un script de PowerShell con permiso de administrador. Antes de escribir:

- comprueba la tarjeta por bus USB, número de serie del lector y tamaño exacto;
- comprueba la imagen por su SHA-256;
- borra la tabla de particiones de la tarjeta, porque Windows no deja poner fuera de línea una tarjeta
  extraíble ni escribir sobre un volumen montado.

Resultado: 1 258 291 200 bytes escritos en 66 s. La tarjeta se volvió a leer y su SHA-256 es idéntico
al de la imagen.

Antes de que funcionara hubo tres intentos fallidos, todos por errores míos y ninguno escribió nada:

1. El script se guardó sin la marca UTF-8 y Windows PowerShell leyó la «Ó» como una comilla.
2. `Set-Disk -IsOffline` no se puede usar con tarjetas extraíbles.
3. El constructor de `FileStream` tenía argumentos ambiguos.

Para no gastar más permisos de administrador, se ensayó primero contra un archivo.

## Resultado: la placa (2026-10-22, foto del usuario)

Al final el usuario pudo abrir la carcasa. **No es Hi3798MV100 ni RK3032:**

- **Procesador:** Amlogic **AML8726-MX** (marcas `AML8726-MX-D`, `A-PRM275.00`, `DMIJN037`).
- **Placa:** `M8_PRO 2023-08-22 V1.5`.
- **Memoria:** dos Samsung `K4B1G1646E-HCF8`. Por el número de parte, cada uno es DDR3 de 1 Gbit; juntos
  suman 256 MB. Es una inferencia por el número de parte, sin hoja de datos abierta.
- Lado visible: ranura microSD, USB-A para el receptor, micro-USB para la corriente y el conector HDMI.

Con la tarjeta de GStickOS, el aparato prende un LED y no da imagen. Es lo esperable con una imagen para
otro procesador.

## El sistema original de esta familia de placas

Fuente: el elemento `m8-m8pro-gamestick-systemfiles` de archive.org, con su `m8pro-README.txt`. Es
para la placa `M8_PRO 2023-02-03_V1.3` con el sistema `M8-20230223-release-v2.0`.

- **El arranque está dentro del aparato.** La tarjeta solo lleva una partición FAT32 (activa, desde el
  sector 2048), con `res/` (el sistema), `roms/<sistema>/`, `download/` y `save/`. Por eso reusar la
  microSD no borró el arranque.
- Del RAR de 172 MB **se bajaron solo los 9 archivos de `res/`**, uno por uno. archive.org deja bajar
  archivos sueltos de dentro del RAR. No se bajó ningún juego; el RAR trae unos diez juegos pequeños y
  BIOS en `roms/`.

Qué es cada archivo (revisado sin ejecutarlo):

| Archivo | Tamaño | Qué es |
|---|---|---|
| `DATA01` | 3.9 MB | Kernel Linux 3.0.50 para ARM (cabecera uImage, LZMA, carga en 0x80008000), fechado el 2023-02-23 |
| `DATA02` | 20 KB | Árbol de dispositivos (DTB) |
| `DATA03` | 300 MB | Empieza como un initrd de x86 (microcódigo de AMD e Intel y un cpio gzip), pero desde el byte 17 303 552 trae programas ARM (ELF, máquina 0x28): el menú, RetroArch y núcleos libretro (por ejemplo uno de SNES derivado de Snes9x) |
| `DATA04`, `DATA05` | 8 y 16 KB | Bases SQLite |
| `DATA06` | 512 MB | Ceros, al menos al inicio: espacio reservado |
| `system.img` | 8.2 MB | Un kernel de x86 (`bzImage`); no corre en ARM |
| `settings/*.txt` | | Idioma, música de fondo y tono de botones |

**Corrección:** primero se anotó que `system.img` y `DATA03` eran de x86 y de relleno. Para `DATA03`
era falso: solo su inicio es de x86, y el resto es el sistema del menú para ARM. Se comprobó buscando
cabeceras ELF y textos («RetroArch», «libretro» y otros 188 de «loading»). `system.img` sí es un
kernel de x86 y su función sigue sin conocerse. El formato del contenedor de `DATA03` se estudia en la
fase 2.

Si la versión 1.3 no arranca en la placa 1.5, hay una copia para la 1.5:
`m8-plus-20230420-20230822-game-stick-system`. Viene como un RAR de 2.7 GB para DiskGenius o un 7z de
32.4 GB, y los dos traen juegos. Antes de bajarla se le pregunta al usuario.

## La tarjeta preparada (2026-10-22)

- `diskpart`: `clean`, una partición primaria de 32 GB activa y formato FAT32 con clústeres de 8 KB,
  etiqueta `GAMESTICK`. Windows no formatea FAT32 de más de 32 GB. `New-Partition` no sirvió, porque
  Windows trataba la tarjeta sin MBR como una sola unidad.
- Se copiaron `res/` y `res/settings/`, y se crearon las carpetas vacías de `roms/`, `download/` y
  `save/`. Los SHA-256 de lo copiado coinciden con los originales.

**Prueba en el aparato (2026-10-22): no da imagen; solo prende el LED azul.** Hipótesis, en orden:

1. El sistema 1.3 no sirve para la placa 1.5 (otro kernel u otro árbol de dispositivos).
2. En la placa 1.5 el arranque no está dentro del aparato sino en la tarjeta, antes de la partición:
   el primer MB, que una copia de archivos no lleva. Se distingue viendo si el reverso de la placa
   tiene un chip de memoria (8 patas o 48 patas).
3. Falta de corriente: estos aparatos fallan con el USB de la TV y piden un cargador de 5 V y 2 A.

**Reverso de la placa (foto del usuario):** no tiene chip de memoria. Bajo el USB hay un hueco de 8
patas sin soldar, donde iría una memoria SPI. **En la V1.5 el arranque vive en la microSD**, en su
primer MB, y una copia de archivos no lo lleva. Por eso la tarjeta 1.3 no arrancó. Con cargador de 5 V
y 2 A el resultado fue el mismo, así que la corriente queda descartada.

## El arranque de la V1.5 (2026-10-22)

El usuario autorizó bajar la copia V1.5, aunque trae juegos. Se bajó lo mínimo:

- archive.org abre el RAR de `m8pro-20230822-v1_5-m8-20230420-release-v2_0` y sirve su imagen de
  62 534 975 488 bytes como un flujo. Se leyeron **solo los primeros 100 MB** y se cortó la conexión.
- **Primer MB**: el u-boot de Amlogic M6 (`/home/a64/8726/uboot/...`, inicialización de DDR3), unos
  295 KB desde el sector 0, con la tabla MBR en su lugar. Partición FAT32 (tipo 0x0C, no activa) desde
  el sector 8192 (MB 4). Clústeres de 32 KB, 2 FAT de 14 907 sectores y sin etiqueta. Firma del disco
  `0x0000d3be`, igual que en la V1.3.
- **Directorio**: `res/` en el clúster 2332 (MB 91) y `roms/` en el clúster 28232 (MB 925).
  `DATA01` y `DATA02` están dentro de los 100 MB. `download/` (MB 18 a 90) tiene unos juegos de
  ejemplo (Contra, Final Fight, KOF 98 y otros) que pasaron por la descarga. No se copiaron a la
  tarjeta, y los archivos de 16, 32 y 100 MB se borraron.
- **`DATA01` de la V1.5**: Linux 3.0.50 del 2023-04-20, de 3 397 688 bytes. Es distinto del de la
  V1.3; su CRC de datos coincide con el de su cabecera (`8ACFA4D3`).
- **`DATA02`**: idéntico al de la V1.3.
- Se guardó solo el arranque: `arranque-v1.5-1MB.bin`, SHA-256 `1f24f567…4881`.

## La tarjeta V1.5 (2026-10-22)

Un script con permiso de administrador, ensayado antes contra un archivo, la dejó así:

- `diskpart clean`, una partición de 32 GB desde el MB 4 y FAT32 con clústeres de 32 KB;
- el primer MB con el arranque V1.5, conservando la tabla de particiones de la tarjeta. Se volvió a
  leer y coincide.

Copiado a la tarjeta y comprobado por SHA-256:

- `res/DATA01` y `DATA02` de la V1.5;
- `DATA03` a `DATA06`, `system.img` y `settings/` de la V1.3 (de esos, la V1.5 tiene los mismos
  tamaños salvo `DATA05`);
- las carpetas vacías de `roms/`, `download/` y `save/`.

**Prueba en el aparato (2026-10-22): el usuario dice «ya está cargando».** El arranque V1.5 en la
tarjeta funciona. Después: «aún muestra loading..». Se sospecha que el `DATA03` de la V1.3 (el menú) no
encaja con el kernel V1.5. Se baja el tramo de la imagen V1.5 hasta justo antes de `roms/`
(944 517 120 bytes), para sacar sus `DATA03`, `DATA06`, `system.img` y `settings/`.

**Segunda tarjeta (2026-10-22):**

- Se bajó el tramo V1.5 de 944 517 120 bytes. Su primer MB coincide con el arranque guardado.
- Siguiendo la FAT se sacaron `DATA03` (9 152 clústeres), `DATA06` (16 384) y `system.img` (251), todos
  contiguos. `DATA03` y `DATA06` son **distintos** de los de la V1.3; `system.img` es igual.
  `settings/`, `DATA04` y `DATA05` de la V1.5 están más allá de los juegos, así que se dejaron los de
  la V1.3. `DATA04` son favoritos (`tbl_collect`) y `DATA05` el historial (`tbl_history`), ambos SQLite.
- El tramo se borró al terminar.
- Antes de cambiar nada se revisó la tarjeta: **el Game Stick había corrido su sistema**. Creó en
  `save/` las carpetas `atari`, `gb`, `gba`, `gbc`, `mame`, `md`, `nes`, `ps1` y `sfc`, con hora 00:00
  porque no tiene reloj.
- Se copiaron `DATA03` y `DATA06` de la V1.5 y se comprobaron por SHA-256.
- El usuario sospechó que el menú necesitaba juegos y pidió usar los del paquete. **Se negó bajar
  juegos comerciales**: no son copias suyas. En su lugar se pusieron dos juegos caseros libres, bajados
  de sus repositorios oficiales:
  - `roms/fc/Nova the Squirrel.nes`, de NovaSquirrel/NovaTheSquirrel v1.0.6a, GPL-3.0;
  - `roms/gbc/uCity.gbc`, de AntonioND/ucity v1.3.

  La MP80, con la biblioteca del usuario, no respondía en la red.

**Resultado (2026-10-22): «ya salió el menú».** El aparato queda revivido con el arranque, el kernel y
el `DATA03` de la V1.5.

Los mandos inalámbricos no tienen pilas y el tablero arcade del usuario (DragonRise 0079:0006, el
mismo de la MP80) no responde en el menú. Lo encontrado en `DATA03`:

- El programa lee `/sys/class/input/event%d/device/id/vendor` y `.../product` y los compara con los
  textos `0810` y `0001`, en el byte 25 211 452 y siguientes. Lo más probable es que solo acepte un
  mando con ese fabricante y producto, que sería el receptor de 2.4 GHz. Falta confirmarlo
  conectando el receptor a la laptop.
- Hay más apariciones de `0810` (en 25 486 413, 25 518 076, 31 253 170 y otros), quizá en otros
  programas del mismo contenedor.
- El mismo programa lee el número del procesador (`ioctl GET_CPUID`) y un registro OTP de la memoria
  SPI (`spi_flash_read_otp_reg`). Parece una protección contra copias. A tener en cuenta si se
  modifica algo.

## El menú y los controles (2026-10-22)

**Formato de `DATA03`:**

- Los primeros 6 MB son el relleno de x86.
- Del MB 6 al final hay un **ext3** de 286 720 bloques de 1 KB, montado en fábrica en
  `/home/a64/8726/sd-8726/tmp_mnt`.
- Tiene `bin/` (pruebas), `db/` (listas de juegos), `font/`, `lib/` (núcleos `libemul*.so`, MiniGUI,
  `libsys_hdmi_common.so`), `modules/` (`keypad_0810_0001.ko` y `mali.ko`), `ui_m8/`, `wav/` y
  `xml/` (idiomas).
- Se lee con `debugfs` en el Debian de WSL (`~/gamestick/`); ahí se instaló
  `binutils-arm-linux-gnueabi`.

**Cómo acepta un control** (`init_usb_keypad_data`, código Thumb):

- Recorre `event0` a `event5` y lee de cada uno `capabilities/abs`, `product` y `vendor`.
- Lo acepta solo si `atoi(capabilities/abs) % 100 == 27`. El receptor de fábrica da `30027`: ejes X,
  Y, Z, Rz y cruceta.
- `0810:0001` solo activa el traductor especial `switch_0801_0001_keycode`. Cualquier otro control
  usa el traductor genérico (en `0xfbc4`), que entiende los botones 288 a 316 para hasta cuatro
  controles. Los ejes y la cruceta los maneja la función en `0x10074`.

**El tablero del usuario** (DragonRise 0079:0006, leído con la API HID de Windows):

- valores Rz, Z, Z, Y, X (8 bits, de 0 a 255) y una cruceta;
- 12 botones.

En el kernel 3.0 el Z repetido pasa a Rx, así que `capabilities/abs` = `3002f`, y `atoi` da 3002. **No
cumple la regla del 27.**

**Cambio aplicado**, en `libsys_hdmi_common.so` en `0xfa4c`; es el byte 24 542 796 de `DATA03`:

- `cmp r3,#27 / bne` (`1b 2b 33 d1`) pasa a `cmp r2,#0 / beq` (`00 2a 33 d0`): se acepta todo
  dispositivo con algún eje.
- El receptor de fábrica sigue cumpliendo. El control remoto y los teclados, sin ejes, siguen fuera.
- Se comprobó desensamblando la copia y con `e2fsck -fn`, y la tarjeta quedó con el mismo SHA-256 que
  la copia (`fda61992…d18d`).
- El `DATA03` original de la V1.5 sigue en `scratchpad/m8-sistema-v1.5/res/` para regresarlo.

**Pendiente de probar:**

- que el menú acepte el tablero;
- el orden de sus botones;
- que el sistema no detecte el cambio: hay una protección que lee el número del chip.

En la MP80 la palanca de este tablero está girada (el eje 0 es arriba y abajo), así que en el menú
las direcciones pueden salir cambiadas.

## Pruebas para identificar el aparato sin abrirlo

| Prueba | Qué dice | Estado |
|---|---|---|
| Conectarlo a la TV sin microSD | Si aparece un logo o un mensaje, el arranque vive en una memoria interna, como en las placas Hi3798MV100. | Pendiente |
| Conectar el receptor de los mandos a la laptop | Su fabricante y producto USB: cómo se van a ver los mandos en el sistema propio. | Pendiente |
| Etiquetas del aparato y de la caja | Modelo y versión. | Pendiente |
| Arrancar GStickOS desde una microSD que funcione | Si arranca, es Hi3798MV100. Su autor dice que probarlo no daña el aparato. | Tarjeta escrita y verificada; falta probarla en el aparato |
