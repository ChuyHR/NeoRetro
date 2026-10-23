# Guía de instalación de la consola Neo Arcade

Esta guía convierte una PC en la consola Neo Arcade: al encenderla aparece directamente la biblioteca
de juegos, sin escritorio ni textos del sistema. Se instala desde una memoria USB que se arma una vez.

## Lo que hace falta

- Una PC x86-64 con Intel o AMD, 4 núcleos, 8 GB de RAM, gráficos con OpenGL 3.3 o Vulkan, disco SSD y
  salida HDMI. El equipo de referencia es una Blackview MP80.
- Al menos 40 GB libres en su disco. Si el disco ya tiene otro sistema (por ejemplo Windows), la
  instalación usa solo el espacio libre más grande y deja el otro sistema como estaba. Ese espacio se
  libera antes desde el otro sistema (en Windows, «Administración de discos», «Reducir volumen»).
- Una memoria USB de 2 GB o más. Se borra al grabarle la imagen.
- Red con salida a internet durante la instalación: la consola baja Debian y, en su primer arranque,
  los emuladores y sus núcleos (unos 2.5 GB). Por cable no hay que configurar nada; para Wi-Fi, ver el
  paso 1.
- Una PC con Linux (o el Debian de WSL) y una copia del repositorio con `npm install` hecho, para armar
  la imagen.

## 1. Armar la imagen

Baja la imagen oficial de Debian 13 «netinst» para amd64 de
`https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/` junto con el archivo `SHA256SUMS`, y
comprueba que coincidan:

```bash
grep " debian-13.7.0-amd64-netinst.iso$" SHA256SUMS | sha256sum -c -
```

Arma la imagen de la consola desde la raíz del repositorio:

```bash
bash scripts/instalador/armar-iso-consola.sh debian-13.7.0-amd64-netinst.iso consola.iso \
  --llave ~/.ssh/mi-llave.pub
```

- `--llave` deja entrar a la consola por SSH con esa llave, para copiar juegos y dar mantenimiento.
  Sin ella no se puede entrar por la red.
- `--wifi RED archivo-con-la-contraseña` deja la red Wi-Fi escrita dentro de la imagen. Borra la
  memoria USB después de instalar, porque la contraseña queda en ella.

La imagen pesa alrededor de 1.1 GB y se arma en segundos.

## 2. Grabarla en la memoria USB

- En Windows, con Rufus: elige la imagen y, cuando pregunte, el modo **imagen DD**.
- En Linux: `sudo dd if=consola.iso of=/dev/sdX bs=4M status=progress conv=fsync`, con `/dev/sdX` la
  memoria USB (revísalo dos veces con `lsblk`: `dd` borra lo que haya en el destino).

## 3. Instalar

1. Conecta la memoria USB a la PC de la consola y enciéndela desde ella, en modo UEFI, con la tecla
   del menú de arranque de su firmware.
2. El menú muestra «Instalar la consola Neo Arcade» y lo elige solo a los 5 segundos.
3. La instalación es automática. Solo se detiene una vez, en «Particionado de discos», para preguntar
   **«¿Desea escribir los cambios en los discos?»**. Revisa que la lista mencione el disco correcto,
   elige **Sí** y pulsa **Continuar**.
4. Al terminar, la PC se reinicia sola. Retira la memoria USB.
5. En el primer arranque se ve texto en la pantalla: es la consola terminando de instalarse y bajando
   los emuladores. Tarda según la red. Al acabar se reinicia sola.
6. Desde ese momento, al encender aparece Neo Arcade.

## 4. Dónde van los juegos

Todo lo tuyo vive en la carpeta `NeoRetro` del usuario `arcade` (`/home/arcade/NeoRetro`):

| Carpeta | Qué va ahí |
| --- | --- |
| `roms/<sistema>/` | Los juegos, en la carpeta de su sistema (`snes`, `psx`, `arcade`…). |
| `media/<sistema>/` | Carátulas, capturas, vídeos y el `gamelist.xml` de Skraper (perfil EmulationStation). |
| `saves/` y `states/` | Partidas y estados guardados de RetroArch. Las crea él. |
| `config/` | Favoritos, recientes, ajustes y mandos configurados. Para cambiar un archivo de configuración de Neo Arcade, cópialo aquí desde `/opt/neo-arcade/resources/app/config` y edítalo. |
| `logs/` | El registro de Neo Arcade (`neo-arcade.log`). |
| `metadata/` y `backups/` | Reservadas; hoy nada las usa. |

Las BIOS no van en `NeoRetro`: van en la carpeta de RetroArch,
`/home/arcade/.var/app/org.libretro.RetroArch/config/retroarch/system/` (PlayStation:
`scph5501.bin`, `scph5500.bin` o `scph5502.bin`; Sega CD: `bios_CD_U.bin`, `bios_CD_E.bin` o
`bios_CD_J.bin`). El `neogeo.zip` de Neo Geo va junto a sus juegos o en esa misma carpeta.

Para copiar desde otra PC de la red, con la llave del paso 1:

```bash
scp -r "Mis juegos de SNES/." arcade@<ip-de-la-consola>:NeoRetro/roms/snes/
```

Neo Arcade lee los juegos nuevos al volver a abrirse (o al reiniciar la consola).

## 5. Mandos y tableros arcade

- **Mandos de Xbox y compatibles** (USB): funcionan al conectarlos, sin configurar nada.
- **Tableros y palancas arcade** con placa USB (las «Zero Delay» y parecidas): no necesitan
  controladores. La primera vez que mueves su palanca o aprietas un botón, Neo Arcade abre «Configurar
  control» y te pide, uno por uno, mover la palanca y apretar cada botón; si tu tablero no tiene ese
  botón, espera 6 segundos y se salta solo. Lo que configures sirve en el menú y dentro de los juegos.
- **Dos tableros**: conecta los dos y configura cada uno una vez. Si los dos son del mismo modelo,
  comparten la configuración.
- **Para volver a configurar** un mando: Configuración → Control → Configurar. Probar muestra en
  pantalla cada botón que aprietas.
- **Para salir de un juego**: Select + Start (en Configuración puedes cambiarlo a mantener Start o a
  LB + RB + Select + Start), o Esc en el teclado. En el mando de Xbox son View + Menú; en un tablero,
  moneda + Start. Mantén el primero y aprieta el segundo.
- **Continuar donde te quedaste** (Configuración, de fábrica en SÍ): al salir de un juego se guarda el
  punto exacto, y al volver a abrirlo sigue ahí. Sirve también en los de arcade, que no guardan
  partida. Para empezar de nuevo, abre el menú del juego y elige Reiniciar.
- **Menú del juego** (Configuración, de fábrica «mantener Select»): mantén Select 2 segundos dentro
  de un juego (la moneda, en un tablero). El juego se pausa y aparece el menú de RetroArch, en español.
  Desde ahí:
  - **Reanudar** sigue jugando;
  - **Guardar estado** y **Cargar estado** guardan o recuperan un punto cuando quieras;
  - **Reiniciar** empieza de nuevo;
  - **Cerrar contenido** sale del juego.

  Los juegos que guardan partida por su cuenta, como Pokémon o Zelda, lo siguen haciendo solos.
- **Cómo se ven los juegos**: Configuración → Imagen de los juegos.
  - CRT (de fábrica) imita la pantalla de las máquinas de arcade.
  - CRT SUAVE se parece más a una TV de tubo.
  - NÍTIDA deja los píxeles parejos y definidos.
  - ORIGINAL no cambia nada.

  Vale para los juegos 2D. Los de Nintendo 64, PlayStation y Dreamcast se ven igual con cualquier
  opción.
- **Si un mando deja de responder a ratos**, revisa el cable: uno dañado o que solo sirve para cargar
  hace que el equipo lo pierda y lo vuelva a encontrar cada pocos segundos. Prueba otro cable u otro
  puerto.

## 6. Mantenimiento

- **Terminal**: mantén **Ctrl + Alt + Mayús + M** durante 3 segundos. Puede tardar unos segundos en
  aparecer. Al cerrarla (`exit`), vuelves a Neo Arcade.
- **Diagnóstico**: desde la terminal, revisa emuladores, núcleos, BIOS, carpetas y cada juego (archivos
  vacíos o cortados, pistas que faltan, posibles duplicados). Usa el Electron de la app como Node:

  ```bash
  NEO_ARCADE_CONFIG=~/NeoRetro/config ELECTRON_RUN_AS_NODE=1 /opt/neo-arcade/neo-arcade \
    /opt/neo-arcade-instalador/scripts/diagnostico.mjs --juegos
  ```
- **Menú de arranque**: aparece si mantienes Esc o Mayús durante el primer segundo de arranque. Sirve
  para elegir otro sistema instalado.
- **Volver al escritorio** (si la PC tenía uno): `sudo bash
  /opt/neo-arcade-instalador/scripts/instalador/volver-al-escritorio.sh` y reinicia. Para volver a la
  consola, `sudo bash /opt/neo-arcade-instalador/scripts/instalador/instalar-neo-arcade.sh`.
- **Apagar y reiniciar**: desde Configuración, en la fila Equipo (pide pulsar dos veces).
