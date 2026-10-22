# Handoff del 2026-10-21 (primeros mandos reales en la consola)

Antes de este: `history/HANDOFF_2026-10-20_g.md` (fase 8, biblioteca real, la MP80 como consola) y los
anteriores del 2026-10-20 en `history/`.

## Resumen

**El tablero Zero Delay del usuario ya funciona dentro de los juegos.** En los juegos, RetroArch tomaba
para ese tablero un perfil de fábrica de un mando de Nintendo 64. Ese perfil no tiene Select, así que no
entraba la moneda ni se podía salir con Select + Start. Se corrigió en `ab7ade4`, se instaló en la MP80
y se verificó con el tablero del usuario.

**El mando de Xbox Series S funciona por USB**, pero su cable o conector falla y se desconecta a ratos.

## Pedidos del usuario en esta parte

- Por la mañana, con un mando de Xbox:
  - «¿Si quisiera conectar un mando de Xbox cómo sería?».
  - «Lo conecté así como me dijiste, pero no hace nada; al desconectarlo vibra». Después: «Series S»,
    «vuelve a revisar» y «no responde como tal».
  - «¿Cómo saldría de los juegos? No me deja», «¿cómo navego entre las consolas?» y «estoy en un juego
    pero no hace nada, revisa».
- Por la tarde, con un tablero: «tengo conectado un tablero de un jugador, pero no me agarra el coin»
  y «tampoco se sale del juego para irse al menú».

## Lo que se encontró y se hizo

### Mando de Xbox Series S (USB, 045e:0b12, controlador xpad)

- RetroArch trae perfil propio para el mando: View es Select (botón 6) y Menú es Start (botón 7).
  Neo Arcade lo reconoce como estándar.
- **El cable o el conector falla.** El núcleo registra errores -71 al reconocerlo y desconexiones
  repetidas: 6 en 7 segundos a las 09:40, y otras a las 09:42, 09:45, 09:46 y 09:49. Si se desconecta
  durante un juego, RetroArch se queda unos 12 segundos sin mando y lo vuelve a tomar solo. Se comprobó
  que reabre `/dev/input/event9`.
- «No responde» en Neo Bomberman: el juego sí recibía el mando y marcaba CREDITS 19. Estaba en la
  demostración y faltaba apretar Start.
- Salir: hay que mantener View y apretar Menú. Al principio el usuario los apretaba por separado, como
  mostró la lectura de los botones. Después salió por su cuenta de tres juegos.
- Se le explicó la navegación: LB y RB cambian de consola, LT y RT saltan de letra, View cambia entre
  Todos, Favoritos y Recientes, Y busca y X marca favorito.

### Tablero Zero Delay (DragonRise 0079:0006)

- Neo Arcade lo configuró bien. El mapeo se guardó cuatro veces en `~/NeoRetro/config/mandos.json`:
  moneda en el código 297 y Start en el 296. La palanca está girada en el tablero: el eje 0 es arriba y
  abajo, y el eje 1 es derecha e izquierda.
- **Causa.** RetroArch 1.22.2 elige el perfil por puntos (`tasks/task_autodetect.c`):
  - fabricante y producto suman 30, el nombre exacto 20 y el puerto (`input_phys`) 10, o resta 10 si
    no coincide;
  - un empate lo gana el archivo que lee primero, en el orden de la carpeta y sin ordenar.

  El nombre que da el núcleo trae dos espacios al final («DragonRise Inc.   Generic   USB  Joystick  »).
  `lector-mandos.py` lo recortaba, y el perfil de Neo Arcade sumaba 30. `DragonRise_N64.cfg`, de
  fábrica, tiene el mismo modelo y el nombre exacto, sumaba 50 y ganaba. Con ese perfil no había
  Select, y Start quedaba en el botón de moneda.
- **Corrección (`ab7ade4`)**:
  - `lector-mandos.py` entrega también `nombreExacto` (sin recortar) y `fisico` (el puerto USB).
  - El perfil lleva ese nombre e `input_phys` y suma 60. Ningún perfil de fábrica trae puerto, así que
    el de Neo Arcade gana siempre.
  - Dos tableros del mismo modelo comparten archivo, y cada uno va en su propia entrada (`_alt1` a
    `_alt9`) con su puerto.
  - Cuatro pruebas nuevas en `pruebas/mando.test.js`.
- **Instalación en la MP80**: se copiaron los dos archivos a `/opt/neo-arcade/resources/app` y se
  reinició `neo-arcade.service`. La imagen USB del instalador no se ha vuelto a armar.

### Sonido en la TV

- El usuario: «no se escucha al conectarla en una TV» y «no tiene sonido ni los juegos ni nuestra
  interfaz». Esto resuelve el pendiente del sonido del handoff anterior: lo quiere en la TV.
- La salida predeterminada era «USB Audio and HID», un adaptador de sonido USB de CSCTEK (0573:1573)
  conectado a la MP80. WirePlumber lo prefería sobre el HDMI.
- La TV («Union TV») está en el primer HDMI: el jack `HDMI/DP,pcm=3` está encendido y los otros tres
  apagados. Ese es el sink `alsa_output.pci-0000_00_1f.3.hdmi-stereo`.
- Se hizo con `wpctl set-default` en la sesión de `arcade`, con el volumen al 100 % y sin silencio,
  porque la TV controla su propio volumen. WirePlumber lo guarda en
  `~/.local/state/wireplumber/default-nodes`, así que sobrevive a reinicios.
- Se movió solo el juego que estaba abierto: RetroArch pasó a sonar en «Union TV». El usuario todavía
  no confirma que ya se escucha.
- No se cambió el instalador. En otra PC con un adaptador USB pasaría lo mismo. Una opción para
  después es una fila «Salida de sonido» en Configuración; decide el usuario.

## Cómo se verificó

- 105 pruebas en verde en la MP80 (`node --test --test-reporter=tap`). En Windows no hay Python, y la
  distribución de WSL por omisión ahora es la de Docker, sin bash.
- Con el registro de RetroArch encendido un rato, el usuario abrió Metal Slug:
  - el perfil escrito trae el nombre exacto, `input_phys = "usb-0000:00:14.0-2/input0"`, Select en el
    botón 9 y Start en el 8;
  - RetroArch registró «[Autoconf] Se ha configurado DragonRise Inc. Generic USB Joystick en el
    puerto 1». Con el perfil de fábrica habría dicho «DragonRise N64».
- El juego se cerró después de 105 s con salida 0, sin intervención desde aquí. Para salir hace falta
  Select + Start, así que la moneda ya entra. Esto es una inferencia: el usuario todavía no lo ha
  confirmado.
- El registro de RetroArch se apagó de nuevo (`log_to_file` y `log_verbosity` en `false`).

## Pendiente, en orden

1. **Que el usuario confirme** con el tablero:
   - que la moneda suma créditos;
   - que la palanca va en la dirección correcta dentro de los juegos;
   - que Select + Start lo regresa al menú.
2. **El cable del mando de Xbox**: cambiarlo o usar otro puerto.
3. **Límite conocido**: el perfil se escribe antes de cada juego con el puerto de ese momento. Si el
   tablero se cambia de puerto con un juego abierto, pierde 10 puntos y gana el de fábrica hasta el
   siguiente juego.
4. **Volver a armar la imagen USB** del instalador con esta corrección.
5. **Observación sin revisar**: la MP80 arrancó seis veces entre las 16:09 y las 17:27, con encendidos
   de 1 a 4 minutos. Puede ser el usuario al cambiar de tablero; no se investigó.
6. Siguen los pendientes del handoff anterior:
   - la revisión de las fases 1 a 8;
   - la skill (§19);
   - juegos de PlayStation, GameCube y PSP;
   - el barrido de compatibilidad adaptado a `grim`;
   - la instalación limpia en la máquina virtual;
   - la terminal de mantenimiento en la MP80;
   - Bluetooth, xpadneo y xone;
   - limpiar `~/descargas-retrobat` y `~/vm-consola`, solo con el «sí» del usuario.

## Observaciones

- Ruta de control: SSH por Wi-Fi a `192.168.100.94` con `~/.ssh/neoarcade_ed25519`.
- Para cerrar un juego trabado desde SSH: `pkill -INT -x retroarch`. Neo Arcade vuelve al menú solo.
- Para ver qué perfil eligió RetroArch, encender un rato `log_to_file` y `log_verbosity` en
  `retroarch.cfg` y buscar `[Autoconf]` en `~/.var/app/org.libretro.RetroArch/config/retroarch/logs/`.
