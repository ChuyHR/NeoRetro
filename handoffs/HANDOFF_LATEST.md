# Handoff del 2026-10-20, noche (fase 8 terminada, biblioteca real, la MP80 como consola)

Antes de este, el mismo día: `history/HANDOFF_2026-10-20.md` (viabilidad, ajustes al plan, fase 0),
`_b` (Debian en la MP80), `_c` (fase 1), `_d` (fases 2 y 3), `_e` (fases 4, 5 y 6) y `_f` (fases 7 y
8 escritas, pruebas finales con la skill, carpetas en `~/NeoRetro`).

## Resumen

**La MP80 ya funciona como consola.** Enciende directo en Neo Arcade en unos 27 s, con la biblioteca
del usuario: 3 616 juegos de 12 sistemas, 3 605 con carátula. Abre los juegos con el mando, vuelve
con Select + Start en 1.9 s y se reinicia desde su propio menú. El usuario quiere probarla mañana con
sus tableros arcade reales.

**Las fases 1 a 8 están construidas y verificadas y esperan la revisión del usuario.** Informe completo
en `docs/pruebas-finales/README.md`; guía de instalación en `docs/guia-instalacion.md`.

## Pedidos del usuario en esta parte

- «Sí, arranca» (la prueba de la fase 8 en una máquina virtual).
- «¿En qué carpeta se están descargando?», «¿pero aquí o en la MP80?», «¿los emuladores van con
  juegos?»: preguntas, respondidas.
- «En mi carpeta Descargas hay unas ROMs: cópialas a la MP80, descomprímelas y organízalas. Son 12
  partes; no las puedes descomprimir si falta alguna». Después: «todas están completas, revisa bien»,
  «son 12», «sí, cuando termines de pasarlas bórralas si todo ok», «déjalas, las vuelvo a descargar,
  pero borra las defectuosas» y, al final, «ya procede a copiarlas aunque se pierdan datos».
- «Al finalizar localiza las ROMs: son las que usaremos en nuestro sistema», «corre pruebas reales para
  ver si funciona todo», «también pruebas del frontend final funcionando con todo y ROMs».
- «Tenía entendido que eran unos 3 000 juegos, ¿qué pasó?»: había 3 642; el «709» era la prueba en la
  máquina virtual con solo 3 sistemas.
- «¿En este punto ya puedo usar mi MP80 como tablero arcade?» y «sí, termina el proyecto para mañana;
  ya tengo mandos tipo tablero arcade».
- «Ya no debes pedir permisos» (también para reiniciar la MP80). Anotado en el CLAUDE.md y en la
  memoria: se avisa en una línea y se hace.
- «El barrido déjalo para mañana; me interesa más la instalación». «¿Para qué instalar en la VM?»: se
  explicó y se detuvo la segunda instalación limpia para ir directo a la MP80.

## Lo que se hizo

- **Fase 8 en una máquina virtual** dentro de la MP80 (`scripts/instalador/probar-en-maquina-virtual.sh`
  y `probar-consola-encendida.sh`, ayudante `scripts/herramientas/maquina-virtual.py`). Encontró y se
  corrigió:
  - ningún emulador abría en la consola: systemd da `CAP_WAKE_ALARM` a la sesión y bwrap la rechaza.
    Cage arranca con `setpriv --inh-caps=-all --ambient-caps=-all`; la opción de pam_systemd no acepta
    un conjunto vacío;
  - al volver de un juego, la pantalla se quedaba en «Abriendo…»: en Wayland, Electron no vuelve a
    dibujar una ventana que se ocultó. `OCULTAR_AL_JUGAR` (`core/main.js`) solo oculta en X11;
  - el puntero del ratón a la vista (CSS en la versión final);
  - la pregunta por otros discos de instalación (`preseed.cfg`);
  - el primer arranque mostraba el inicio de sesión de texto y no el avance (`consola.sh`);
  - el reloj de la máquina virtual (`-rtc base=localtime`).
  - Además: el registro guarda la salida de errores del emulador y de la terminal cuando fallan.
- **La biblioteca de RetroBat** (12 partes RAR, 23.5 GB, bajadas por el usuario):
  - Las partes 01, 04, 05 y 06 bajaron cortadas: se comprobó recorriendo los bloques RAR5 y con WinRAR.
    Las descargas de Chrome se cortaban entre el 98.4 % y el 99.6 %.
  - A pedido del usuario se descomprimió por tramos, aceptando las pérdidas: 2 juegos de arcade, 2
    adornos de MAME y 2 imágenes.
  - Se organizó en `~/NeoRetro/roms` de la MP80: `mame`→`arcade` y otros 11 sistemas con su nombre.
  - Se sacaron 8 juegos que venían dentro de `.rar`.
  - Sonic 2 y 3 eran colecciones `.7z` cuyo primer archivo era una modificación de aficionados; se
    sacó la versión original de cada uno.
  - Las BIOS de PlayStation, Sega CD, Dreamcast y GBA se copiaron a la carpeta de RetroArch.
  - Las partes, lo extraído para Windows y los `.rar` y `.7z` internos siguen en
    `~/descargas-retrobat/`. Las partes se borraron de Descargas de la laptop tras comprobar su huella
    en la MP80.
- **Cambios de código por la biblioteca real**:
  - las entradas `<hidden>true</hidden>` del gamelist no se muestran (26 «ZZZ(notgame)»);
  - la revisión acepta juegos de NES en formato UNIF.
- **La MP80 como consola**:
  - la copia de desarrollo pasó a `~/NeoArcade-desarrollo`, con `roms` y `media` como enlaces;
  - `~/NeoRetro` quedó como carpeta del usuario;
  - corrió `instalar-neo-arcade.sh`, se reinició, y se probaron un juego y Reiniciar desde el menú
    (`scripts/prueba-consola-en-tv.sh`, `docs/pruebas-finales/consola-mp80/`);
  - un ícono «Neo Arcade» en el escritorio Xfce, que ya no arranca, abre la versión empaquetada.
- **Herramientas en la MP80**: QEMU, OVMF, xorriso, unrar (non-free, solo ese paquete) y 7zip.

## Cómo se verificó

- `npm test`: 101 pruebas en verde en WSL y en la MP80.
- 14 juegos reales de 11 sistemas abren y se ven en la TV (`docs/pruebas-finales/juegos-reales/`).
- La versión final empaquetada con el mando virtual y la biblioteca completa
  (`docs/pruebas-finales/version-final/`): Select + Start de vuelta en 1.75 s, Esc ya no la cierra.
- La consola en la máquina virtual: arranque en 11 s, juegos reales, terminal, diagnóstico y apagar
  (`docs/pruebas-finales/consola-vm/`).
- La consola en la MP80: arranque de 24.2 s hasta el sistema listo y unos 27 s hasta la biblioteca;
  juego con el mando; Reiniciar desde Configuración.
- El barrido de compatibilidad de arcade quedó en 98 de 724: ninguno rechazado, 22 en negro a los 6 s.
  Resultados en `~/descargas-retrobat/compatibilidad-parcial/` de la MP80.

## Errores propios de esta parte

- Al agregar `__pycache__/` al `.gitignore` lo pegué a la última línea, que no terminaba en salto de
  línea, y `credenciales/` dejó de estar ignorada por dos commits. Se corrigió enseguida; no se subió
  nada de esa carpeta, y esos commits solo llegaron a la MP80.
- Subí por error un `.pyc` (`scripts/herramientas/__pycache__`); se quitó.
- Primero estimé que a las partes cortadas les faltaban 20 a 27 MiB comparando tamaños. Con la
  revisión de bloques resultó que faltaban entre 19 KB y 9 MB. Se corrigió ante el usuario.
- Las capturas de un reinicio por menú se guardaron en la raíz de la copia de desarrollo; se movieron a
  `docs/` y se borraron de ahí.

## Al final: partidas con el mando en la consola

Con la consola ya instalada, el usuario pidió ver que funcionara «desde la consola». Con el mando
virtual de Xbox, en la TV de la MP80:

- **KOF '98**: buscado con el teclado en pantalla («SLUGFEST», 1 coincidencia), abierto, moneda,
  Start, equipo Kyo, Benimaru y Daimon, y dos rounds. Salir con Select + Start: 0.24 s de vuelta al
  menú, en el mismo juego.
- **1942** de Game Boy Color, elegido en ALL GAMES sin borrar la búsqueda: abre en su menú en español.
- **Metal Slug 3** en NEO GEO, alcanzado con 11 saltos de letra (RT) y 6 pasos: abre hasta la selección
  de soldado. Se agregó a Favoritos con X y el filtro FAVORITOS lo muestra; quedó guardado en
  `~/NeoRetro/config/datos-usuario.json`.
- Antes de que el usuario lo detuviera, un barrido rápido abrió sin problema 8 KOF de arcade ('94 a
  '99, '98 UMH y 2000).

**Hallazgo por confirmar con mandos reales**: en los juegos de Neo Geo, las pulsaciones del mando
virtual de 150 a 300 ms a veces no entraban (moneda, Start, golpes); las de 500 ms o más, siempre.
Puede ser propio del mando virtual. Una pulsación humana suele durar más, pero hay que confirmarlo con
los tableros del usuario. Si le pasa, revisar en RetroArch `input_poll_type_behavior` y la latencia
del núcleo FBNeo.

El usuario pidió apagar todo y dará su retroalimentación mañana, cuando juegue de verdad.

## Lo que espera al usuario

1. **Probar con sus tableros arcade** mañana. La primera vez que use cada uno, Neo Arcade abre
   «Configurar control» (`docs/guia-instalacion.md`, «Mandos y tableros arcade»).
2. **El sonido** sale por un aparato USB conectado a la MP80 («USB Audio and HID», Zoran 0573:1573), no
   por el HDMI de la TV. Confirmar cuál quiere.
3. **Revisión** de las fases 1 a 8 y de las pantallas nuevas (diferencia 8 del CLAUDE.md).
4. **Decidir** lo de la skill que no está en el plan y corregir su §19 (botones).
5. Juegos de PlayStation, GameCube y PSP, si los quiere: el paquete no los trae.
6. Pendientes viejos: perfil Peques, títulos largos (diferencia 5), probar Windows desde GRUB (ahora con
   Esc o Mayús al encender), formatear la memoria USB con la contraseña del Wi-Fi.

## Lo que sigue

- Terminar el barrido de compatibilidad (`scripts/prueba-compatibilidad-en-tv.sh arcade neogeo`).
  Usa `xdotool` y `xwd`, así que hay que adaptarlo a `grim` para correrlo con la consola instalada.
  Revisar a ojo los juegos que quedan en negro.
- Repetir la instalación limpia de la imagen USB en la máquina virtual (`~/vm-consola`) para confirmar
  las correcciones de `preseed.cfg` y `consola.sh`.
- Medir la terminal de mantenimiento en la MP80 real: en la máquina virtual tardó 16 s.
- Pendientes de la fase 4: emparejar Bluetooth desde Configuración, xpadneo y xone, y el mapeo de
  mandos en Dolphin y PPSSPP.

## Observaciones

- La laptop tiene 21 GB libres en C:.
- La MP80 sale a internet por el cable hacia la laptop (comparte conexión, `192.168.137.165`) además
  del Wi-Fi (`192.168.100.94`). El control por SSH se hizo por el Wi-Fi: la ruta del cable dejó de
  responder desde la laptop a media sesión. Si se desconecta el cable, sigue por Wi-Fi.
- `~/vm-consola` (2.6 GB) y `~/descargas-retrobat` (33 GB entre partes y extraído) se pueden limpiar
  cuando ya no se necesiten. Antes hay que confirmarlo con el usuario: son sus archivos. La MP80 tiene
  116 GB libres.
