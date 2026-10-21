# Pruebas finales con la skill neo-arcade

Fecha: 2026-10-20. Equipo: Blackview MP80 con su TV (HDMI-1, 1920×1080 a 75 Hz), Debian 13, RetroArch
1.22.2, Dolphin 2609a y PPSSPP 1.20.4 de Flathub. Rama `main`.

El usuario pidió usar su skill (`UtilsDev/skills/neo-arcade/skill.md`) para correr pruebas finales
reales. Este documento cruza cada sección de la skill y cada prueba del producto final del plan
(`docs/plan-desarrollo.md`) con lo que hay en el código y con lo que se probó en la TV.

La primera ronda usó programas y archivos propios. Después, el usuario puso su biblioteca
(un paquete de RetroBat) y pidió organizarla en la MP80 y probar con ella: ver «Biblioteca real del
usuario». La consola instalada se probó en una máquina virtual dentro de la MP80: ver «Consola
instalada».

## Resumen

**Con la biblioteca real** (3 616 juegos de 12 sistemas, 3 624 archivos con carátula):

- abren y se juegan 14 juegos de 11 sistemas;
- la versión final empaquetada funciona entera con el mando;
- la consola instalada arranca sola en 11 s, abre juegos, vuelve y se apaga desde el menú.

Hallazgos de esa ronda, todos corregidos:

- **En la consola instalada no abría ningún emulador.** systemd daba a la sesión `CAP_WAKE_ALARM` y la
  caja de Flatpak la rechazaba. Ahora Cage arranca con `setpriv`.
- **Al volver de un juego, la pantalla se quedaba en «Abriendo…».** En Wayland, la ventana ya no se
  oculta mientras se juega.
- Se veía el puntero del ratón.
- El instalador preguntaba por otros discos de instalación.
- Neo Arcade no respetaba los juegos ocultos del `gamelist.xml`.
- La revisión de juegos daba por dañados los juegos de NES en formato UNIF.

**Primera ronda, sin juegos de terceros.** Todo pasó en la TV de la MP80:

- lanzamiento y regreso al menú;
- avisos de BIOS y de `neogeo.zip` antes de abrir el emulador;
- juegos de varios discos con su lista `.m3u`;
- tiempo jugado;
- revisión de cada juego en el diagnóstico;
- los dos tipos de mando y su reconexión;
- lo que se recuerda al reabrir;
- 30 minutos de uso sin aumento de memoria.

Las 101 pruebas automáticas pasan en la laptop (WSL) y en la MP80.

Para cumplir la skill se agregaron en esta tanda:

- juegos de varios discos (§8);
- veces y tiempo jugado (§24);
- aviso y búsqueda de `neogeo.zip` (§39);
- revisión de juegos con estados y duplicados (§30–32);
- detección de emuladores en el registro al arrancar (§15);
- número de proceso de cada lanzamiento (§48).

Quedan tres grupos:

- **Lo que necesita tus archivos.** Juegos de PlayStation, GameCube y PSP: el paquete de RetroBat no
  los trae. Las BIOS de PlayStation y Sega CD ya están instaladas.
- **Lo que necesita tu permiso.** Instalar la consola en la MP80 misma implica reiniciarla.
- **Lo que la skill pide y el plan no tiene.** Ver «Lo que queda por decidir».

## Biblioteca real del usuario

El usuario bajó un paquete de RetroBat en 12 partes RAR (23.5 GB) y pidió copiarlo a la MP80,
descomprimirlo y organizarlo. Lo que se hizo:

- **Las partes 01, 04, 05 y 06 bajaron cortadas.** Se comprobó recorriendo los bloques del formato
  RAR5 y con la prueba de WinRAR («Final inesperado del archivo»). La 04 se volvió a bajar completa.
  Cada corte se detuvo en un punto distinto entre el 98.4 % y el 99.6 %: el servidor manda bien los
  datos y la conexión se cierra cerca del final.
- **Se descomprimió aceptando las pérdidas**, a pedido del usuario, por tramos: se aparta la parte
  cortada anterior para que `unrar` no se detenga en ella. Se perdieron 6 archivos: 2 juegos de arcade
  (`cybrcycc`, `cybstorm`), 2 adornos de MAME y 2 imágenes. El archivo no es sólido, así que el daño
  no pasó al resto.
- **Cuenta verificada**: el RAR trae 3 644 juegos de los 12 sistemas que maneja Neo Arcade y en la
  MP80 hay 3 642; faltan los 2 de arcade. Las listas de RetroBat mencionan 7 513 juegos porque
  describen una colección más grande.
- **Organización** en `~/NeoRetro/roms/` (se movieron, no se copiaron): `mame`→`arcade`, y `neogeo`,
  `nes`, `snes`, `n64`, `gb`, `gbc`, `gba`, `megadrive`, `mastersystem`, `gamegear` y `pcengine` con
  su mismo nombre, cada uno con su `gamelist.xml`, imágenes y videos.
- **8 juegos venían dentro de un `.rar`** (1 de SNES, 3 de N64, 4 de GBA). Se sacaron junto a los
  demás; los `.rar` quedaron en `~/descargas-retrobat/rar-internos/`. `st-z0rr-2.smc` se renombró a
  «Star Fox 2.smc».
- **Sonic 2 y Sonic 3 eran colecciones `.7z`** de 96 y 19 versiones y modificaciones de aficionados,
  y RetroArch abría la primera, una modificación de Sonic 1. Se sacó la versión original de cada uno
  (`(W) (REV01) [!]` y `(E) [!]`); las colecciones quedaron en `~/descargas-retrobat/colecciones/`.
- **BIOS** de PlayStation, Sega CD, Dreamcast y GBA copiadas a la carpeta de RetroArch. `neogeo.zip`
  se quedó junto a los juegos de Neo Geo y de arcade.
- **No se trajo** lo que es de Windows (RetroBat, sus emuladores, DirectX) ni las carpetas `ports`,
  `ps5`, `singe`, `sonicmania` y `sonicretro`. Todo sigue en `~/descargas-retrobat/extraido/`.

Diagnóstico con revisión (`npm run diagnostico -- --juegos`, 4 s): 3 540 de 3 642 archivos sin
avisos. Los avisos son 48 juegos de Neo Geo que RetroBat trae en `mame` y en `neogeo`, un juego de NES
con dos nombres, y 3 juegos de NES sin cabecera (Adventures of Lolo, Captain Comic y Swamp Thing).
Adventures of Lolo, en efecto, no abre.

| Prueba en la TV | Resultado | Evidencia |
| --- | --- | --- |
| 14 juegos de 11 sistemas con el comando de Neo Arcade | Todos abren y se ven: Super Mario Bros. 3, Super Mario World, Super Mario 64, Tetris, Zelda Link's Awakening DX, Mario Kart Super Circuit, Sonic 2, Alex Kidd, Bonk, Metal Slug (Neo Geo y arcade), Street Fighter II, Donkey Kong y Mortal Kombat II (que pide un botón la primera vez, como la placa real) | `juegos-reales/` |
| Biblioteca completa en Neo Arcade | 3 642 juegos leídos en 577 ms, 3 624 con carátula, descripciones en español. Un juego abierto desde el menú y Esc de vuelta en 372 ms | `juegos-reales/1-todos.png` a `5-detalles.png` |
| Versión final empaquetada, con el mando | Abre en 0.4 s; sistemas con RB, carrusel rápido, salto de letra, favorito, buscar «sonic», juego abierto y Select + Start de vuelta en 1.75 s; Esc ya no la cierra; Configuración reconoce el mando | `version-final/` |
| Compatibilidad de arcade y Neo Geo | Barrido de los 724 juegos con FinalBurn Neo en curso | `compatibilidad.txt` (al terminar) |

## Consola instalada

La imagen USB (`armar-iso-consola.sh` con la oficial de Debian 13.7.0, huella comprobada) se instaló en
una máquina virtual dentro de la MP80 (`scripts/instalador/probar-en-maquina-virtual.sh`: QEMU, KVM,
UEFI, 4 núcleos y 4 GB), sin tocar la MP80. Las pruebas de uso las hace
`scripts/instalador/probar-consola-encendida.sh`.

| Prueba | Resultado | Evidencia |
| --- | --- | --- |
| Instalación automática | 12 min. Se detiene una sola vez, en el particionado, a propósito: el resumen de lo que se escribirá en el disco queda a la vista. La pregunta por otros discos de instalación ya no sale | `consola-vm/resultado.txt` |
| Primer arranque | 6.5 min: instala Neo Arcade, los tres emuladores y los 11 núcleos, y reinicia solo | `consola-vm/resultado.txt` |
| Arranque | Neo Arcade completo a los **11 s** de encender (meta del plan: 30 s). Sin menú ni textos del sistema; lo único que se ve antes es el logotipo del firmware y la animación de Neo Arcade. Sin errores en el diario | `consola-vm/arranque-*.png` |
| Carpetas | `~/NeoRetro` con sus ocho carpetas; RetroArch guarda en `saves/` y `states/`; la sesión lee `~/NeoRetro/config` | `consola-vm/resultado.txt` |
| Juegos reales en la consola | 709 juegos de SNES, Master System y Game Gear, 707 con carátula; un juego abierto desde el menú en 1.8 s y cerrado con Esc en 0.8 s | `consola-vm/con-juegos-*.png` |
| Terminal de mantenimiento | Abre con Ctrl + Alt + Mayús + M y cierra con `exit`. En la máquina virtual, sin tarjeta gráfica, tardó 16 s en aparecer; falta medirla en la MP80 | `consola-vm/uso-4-terminal.png` |
| Diagnóstico dentro de la consola | Corre con el Electron de la app como Node | `consola-vm/uso-con-juegos.txt` |
| Apagar desde Configuración | La máquina se apaga 1 s después de confirmar; el registro anota «equipo · apagar» y el apagado es limpio | `consola-vm/uso-con-juegos.txt` |

## Resultados en la TV

Guiones en `scripts/`. Capturas y salidas en `tv-mp80/`.

| Prueba | Resultado | Evidencia |
| --- | --- | --- |
| Diagnóstico del equipo | RetroArch 1.22.2, Dolphin 2609a y PPSSPP 1.20.4 de Flathub. Rutas reales leídas de `retroarch.cfg`. Los 11 núcleos presentes. Faltan las BIOS de Sega CD y PlayStation y `neogeo.zip`. | `tv-mp80/resultado.txt` |
| Revisión de juegos (`--juegos`) | De 9 archivos, 2 sin problemas. Detectó el archivo vacío, la pista que falta, la copia duplicada y los juegos sin BIOS o sin `neogeo.zip`. | `tv-mp80/resultado.txt` |
| PlayStation de 2 discos | Una sola tarjeta, «PLAYSTATION • 2 discos». Sin BIOS avisa antes de abrir RetroArch. | `1-inicio.png`, `2-disco-doble-sin-bios.png` |
| Dreamcast de 2 discos | Neo Arcade armó una lista `.m3u` con las rutas de los dos discos. RetroArch la recibió y la puede leer desde su caja de Flathub. Los discos son de mentira: Flycast salió con error a los 355 ms y Neo Arcade lo avisó. | `3-dreamcast-doble.png`, `5-dreamcast-de-vuelta.png` |
| Neo Geo sin `neogeo.zip` | Aviso antes de abrir, con la carpeta donde va el archivo. | `6-neo-geo-sin-neogeo-zip.png` |
| Tiempo jugado | Tras 65 s de juego, Detalles dice «Jugado: 1 vez, 1 min». `datos-usuario.json` guarda 1 vez y 65 segundos. | `8-detalles-con-tiempo-jugado.png` |
| Registro | Anota los emuladores y su versión al arrancar, y el número de proceso de cada lanzamiento. | `tv-mp80/resultado.txt` |
| Regresión fase 3 | RetroArch abre en 1446 ms. Con Esc, Neo Arcade vuelve en 376 ms. | `regresion-fase3.txt` |
| Regresión fase 4 | Select + Start vuelve en 1351 ms con el mando de Xbox y en 1358 ms con la palanca. La palanca se configura sola. | `regresion-fase4.txt` |
| Regresión fase 6 | Favoritos, recientes, Configuración y reabrir. Ahora también guarda las partidas. | `regresion-fase6.txt` |
| Reconexión del mando | 3 pasos con el primer mando, desconexión, otro mando y 3 pasos más, sin reiniciar la app. | `reconexion.txt`, `9-tras-reconectar-el-mando.png` |
| 30 minutos de uso con 3.000 juegos | Memoria total de 643 MB en el primer minuto y 647 MB en el último. Desde el minuto 4, entre 645 y 649 MB. | `../pruebas-fase7/memoria-30-min.txt` |
| Fluidez con 3.000 juegos | Con la cruceta sostenida, 59.4 cuadros/s a 60 Hz y 74.3 a 75 Hz. | `../pruebas-fase7/fluidez.txt` |
| Carpetas de la consola (`~/NeoRetro`) | Con un NeoRetro de prueba configurado como lo deja el instalador: los juegos salen de `roms/`, lo recordado va a `config/`, el registro a `logs/` y el estado guardado con F2 a `states/Snes9x/`. Nada de eso quedó en la carpeta de datos de Electron. | `carpetas-neoretro.txt`, `10-biblioteca-desde-neoretro.png`, `11-estado-guardado-en-states.png` |

## La skill, sección por sección

Estados: **Cumple** (está y se probó), **Cumple distinto** (el objetivo se cubre de otra forma, decidida
en el plan), **Parcial**, **No está** y **Choca con el plan** (el plan manda, según el CLAUDE.md).

| § | Tema | Estado | Dónde o por qué |
| --- | --- | --- | --- |
| 1 | Propósito | Parcial | Todo menos importar juegos desde la app y descargar contenido legal (§33–37). |
| 2 | Hardware independiente | Cumple | Se adapta a cualquier pantalla; el instalador no depende de la MP80. |
| 3 | RetroArch, Dolphin y PPSSPP | Cumple | `config/emulators.json`; los tres probados en el diagnóstico de la MP80. |
| 4 | Carpetas `~/NeoRetro/{roms,media,saves,…}` | Cumple | Decidido por el usuario: en la consola instalada, las ocho carpetas de la skill. Dolphin y PPSSPP guardan en sus propias carpetas (de Flathub solo leen la carpeta personal). En desarrollo, en la MP80, `~/NeoRetro` es el repositorio. |
| 5 | Nombres de las 21 carpetas | Cumple | Los mismos 21 nombres; el instalador las crea. En desarrollo no se crean solas. |
| 6 | Formatos | Cumple distinto | Mismos formatos, salvo `.bin` suelto en Sega CD y PlayStation: es una pista de un `.cue`, y listarlo duplicaría el juego. |
| 7 | Subcarpetas | Cumple | El escáner baja tres niveles. |
| 8 | Multidisco | Cumple | Nuevo: `core/discos.js`. Un juego con «2 discos»; se abre con su `.m3u` o con una que arma la app. |
| 9 | BIOS | Cumple | Ruta real leída de `retroarch.cfg`, SHA-256 y MD5 contra las conocidas, aviso antes de abrir; nunca se descargan. |
| 10 | Detección de RetroArch | Cumple | Ejecutable, versión, tipo de instalación, configuración, BIOS y núcleos (`npm run diagnostico`). |
| 11 | Núcleos | Cumple | Por sistema en `systems.json`; la carpeta sale de `retroarch.cfg`, no de una ruta fija. |
| 12–13 | Dolphin y PPSSPP | Parcial | Se detectan con su versión; su carpeta de configuración no se muestra. |
| 14 | `EmulatorAdapter` | Cumple distinto | Un solo lanzador genérico con plantillas en JSON; agregar un emulador no pide código. |
| 15 | Detección al iniciar | Cumple | Nuevo: el registro anota los emuladores y su versión cinco segundos después de abrir. |
| 16 | Los 13 pasos del lanzamiento | Cumple | `core/main.js` (`jugar`). |
| 17 | Pantalla completa | Cumple | Cada emulador con su propia opción (`-f`, `Fullscreen=True`, `--fullscreen`). |
| 18 | Regreso al menú | Cumple | La app se oculta, sigue viva y vuelve al frente al cerrar el emulador. |
| 19 | Controles | Choca con el plan | Decidido por el usuario: mandan los del plan (A = elegir, Start = Configuración, View = filtros). Select + Start y Esc para salir sí coinciden. |
| 20 | Mando | Cumple | Detección al conectar, Probar control y Configurar control para mandos sin estándar. |
| 21–22 | Biblioteca y tarjeta | Cumple | ALL GAMES, sistemas, FAVORITOS y RECIENTES; carátula, nombre, sistema, año, género y jugadores. |
| 23 | Favoritos | Cumple | Referencias por id, sin copiar archivos. |
| 24 | Recientes, veces y tiempo jugado | Cumple | Nuevo: veces y tiempo total por juego, en Detalles («Jugado: 1 vez, 1 min»). |
| 25–26 | Skraper y `gamelist.xml` | Cumple | Perfil EmulationStation; ningún campo es obligatorio. |
| 27 | Medios | Parcial | Carátula, captura y vídeo. Logo y marquesina no tienen lugar en el diseño aprobado. |
| 28 | `RomScanner` | Cumple | Escaneo recursivo con caché; validación, huella, duplicados y multidisco. |
| 29 | Identificación | Parcial | Por extensión, carpeta, nombre y cabecera (en la revisión). Sin base de datos de huellas. |
| 30 | Estados de cada juego | Parcial | Nuevo: `npm run diagnostico -- --juegos` da VALID, INVALID, CORRUPTED, MISSING_BIOS y DUPLICATE. La interfaz no los muestra; avisa al intentar abrir. |
| 31 | Huellas | Parcial | SHA-256 (juegos y BIOS) y MD5 (BIOS). Sin SHA-1. |
| 32 | Duplicados | Cumple | Por SHA-256, comparando primero tamaño y extremos del archivo. No borra nada. |
| 33–37 | Contenido legal y descargas | No está | Fuera de las nueve fases del plan. Queda para decidir: ver «Lo que queda por decidir». |
| 38 | Comprimidos | Parcial | Los `.zip` y `.7z` no se extraen, renombran ni recomprimen; se revisa que no estén cortados. No se lista su contenido. |
| 39 | Neo Geo | Cumple | Nuevo: sin `neogeo.zip` avisa antes de abrir y el escáner ya no lo lista como juego. |
| 40–41 | PlayStation y Sega CD | Cumple | BIOS en la carpeta real del núcleo; multidisco. |
| 42 | Ports | Cumple | Se ejecutan con `bash`, con la ruta validada dentro de su carpeta. |
| 43 | Seguridad | Cumple | Sin shell, rutas validadas, `medio://` limitado a dos carpetas, aislamiento de contexto. |
| 44 | `~/NeoRetro/config/` | Cumple | En la consola, lo que se recuerda, los mapeos de mandos y cualquier archivo de configuración que se quiera cambiar; los que no estén ahí salen de la app. |
| 45–46 | Respaldos y base de datos | No está | Lo recordado son archivos JSON legibles que se escriben sin riesgo de corte. |
| 47–49 | Arquitectura y procesos | Cumple distinto | `core/` (servicios) y `app/` (interfaz) separados; cada lanzamiento anota comando, código de salida, duración y número de proceso. |
| 50–52 | Instalación, Flatpak y permisos | Cumple | `flatpak info`, permisos de la caja, aviso si una carpeta no se puede leer (en el diagnóstico). |
| 53–54 | Arranque y quiosco | Parcial | Instalador de la fase 8 escrito (Cage, sin escritorio). Falta probarlo en una máquina virtual. |
| 55 | Actualizaciones | No está | No se actualiza nada solo; tampoco avisa de versiones nuevas. |
| 56 | Registros | Cumple | En la consola, `~/NeoRetro/logs/neo-arcade.log`; en desarrollo, en la carpeta de datos de la app. |
| 57 | Pruebas automáticas | Cumple | 101 pruebas; Dolphin y PPSSPP se prueban por su comando, no abriendo un juego. |
| 58 | Fases | Choca con el plan | El proyecto sigue las nueve fases del plan. |
| 60 | Comandos `/neo-arcade …` | Parcial | `scan`, `detect-emulators`, `verify` y `bios` son `npm run diagnostico [-- --juegos]`; `test` es `npm test`. |

## Pruebas del producto final del plan

De las 15 pruebas, 10 cumplen, 2 se probaron en parte y 3 están pendientes.

| Prueba | Estado | Evidencia o lo que falta |
| --- | --- | --- |
| Encender y ver Neo Arcade en menos de 30 s, sin escritorio | Pendiente | Instalador de la fase 8 escrito y sin probar. Probarlo en la MP80 implica reiniciarla. |
| Pantalla igual al prototipo, con juegos reales y carátulas | Pendiente | Fidelidad de 0.0 % comprobada en la fase 1; carátulas con medios propios en la fase 5. Faltan tus juegos y tus carátulas. |
| 21 sistemas con LB/RB; los vacíos no aparecen | Cumple | `tv-mp80/1-inicio.png` (solo los 5 sistemas con juegos). |
| Cruceta sostenida fluida; LT/RT salta de letra | Cumple | `../pruebas-fase7/fluidez.txt` |
| Y abre el teclado en pantalla y filtra | Cumple | `../pruebas-fase6/` |
| Jugar arcade, SNES, PlayStation y GameCube a pantalla completa con sonido | Parcial | Solo SNES, con el programa propio. Los demás necesitan tus juegos y la BIOS de PlayStation. |
| Select + Start sale y vuelve en menos de 2 s | Cumple | 1351 ms (`regresion-fase4.txt`). |
| Tres favoritos; se quita uno y desaparece | Cumple | `regresion-fase6.txt` |
| Recientes muestra los cuatro, el último primero | Cumple | `regresion-fase6.txt` |
| Perfil Peques | Pendiente | Sigue como propuesta sin confirmar (ajuste 9 del CLAUDE.md). |
| Tema, CRT y animaciones se conservan al reiniciar | Cumple | `regresion-fase6.txt` |
| Ruta del emulador mal escrita: mensaje claro | Cumple | `../pruebas-fase3/04-falta-emulador.png` |
| Desconectar y reconectar el mando | Cumple | `reconexion.txt` |
| 30 minutos sin tirones ni aumento de memoria | Cumple | `../pruebas-fase7/memoria-30-min.txt` |
| Apagar desde el menú | Parcial | El botón y su doble confirmación están. En desarrollo solo se anota; la prueba real apaga la MP80 y necesita tu permiso. |

## Lo que queda por decidir

Lo siguiente está en la skill y no en las nueve fases del plan. Según el plan, va a la lista de extras
para después de la primera versión, salvo que decidas otra cosa:

1. **Descubrir y descargar contenido legal** (§33–37): un `GameProvider` con proveedores que declaren
   que su contenido es distribuible (homebrew, freeware, demos). Es una pantalla nueva y acceso a red;
   el diseño aprobado no la tiene. Para hacerlo bien hace falta elegir las fuentes una por una.
2. **Importar un juego desde la app** (§34). Hoy basta con copiarlo a su carpeta.
3. **Respaldos** (§45) y **base de datos** (§46). Hoy lo recordado son archivos JSON que se escriben
   sin riesgo de corte de luz.
4. **Mostrar el estado de cada juego en la interfaz** (§30). Hoy vive en el diagnóstico y en el aviso
   al abrir.
5. **Avisar de versiones nuevas de los emuladores** (§55).

Los dos choques de la skill con lo aprobado los decidió el usuario el 2026-10-20:

- **Carpetas (§4, §44, §56): como la skill.** En la consola instalada todo va en `~/NeoRetro/`
  (ajuste 10 del CLAUDE.md). Probado sin instalar la consola: `tv-mp80/carpetas-neoretro.txt`.
- **Botones (§19): como el plan.** A = elegir, Start = Configuración y View = filtros. La §19 de la
  skill (Start = Iniciar, Select = Menú) conviene corregirla para que no vuelva a chocar.

## La skill como archivo

Resuelto el 2026-10-20, a pedido del usuario: los puntos 1 a 3 están aplicados en
`.claude/skills/neo-arcade/SKILL.md` (las líneas 2 a 2009 del original, sin cambiar el texto). El
original en `UtilsDev/skills/neo-arcade/skill.md` quedó como estaba. El punto 4 sigue abierto.

Como estaba, Claude Code no la reconocía como skill:

1. Todo el texto está dentro de un bloque ```` ```md ````. El encabezado `---` con `name` y
   `description` debe ser lo primero del archivo, sin nada antes.
2. El archivo debe llamarse `SKILL.md`, dentro de una carpeta con el nombre de la skill:
   `.claude/skills/neo-arcade/SKILL.md` (en el proyecto) o `~/.claude/skills/neo-arcade/SKILL.md` (para
   todos los proyectos).
3. La parte final, «Cómo usar esta Skill», son notas para ti; conviene sacarla del archivo.
4. Los comandos de la §60 pueden apuntar a los que ya existen: `npm run diagnostico`,
   `npm run diagnostico -- --juegos` y `npm test`.
