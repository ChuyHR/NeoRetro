# Pruebas finales con la skill neo-arcade

Fecha: 2026-10-20. Equipo: Blackview MP80 con su TV (HDMI-1, 1920×1080 a 75 Hz), Debian 13, RetroArch
1.22.2, Dolphin 2609a y PPSSPP 1.20.4 de Flathub. Rama `main`.

El usuario pidió usar su skill (`UtilsDev/skills/neo-arcade/skill.md`) para correr pruebas finales
reales. Este documento cruza cada sección de la skill y cada prueba del producto final del plan
(`docs/plan-desarrollo.md`) con lo que hay en el código y con lo que se probó en la TV.

Las pruebas usan programas y archivos propios, nunca juegos de terceros, y nunca tocan `roms/` ni
`media/`. Lo que necesita un juego comercial o una BIOS queda marcado como pendiente del usuario.

## Resumen

Todo lo que se pudo probar sin juegos de terceros pasó en la TV de la MP80. Eso incluye:

- lanzamiento y regreso al menú;
- avisos de BIOS y de `neogeo.zip` antes de abrir el emulador;
- juegos de varios discos con su lista `.m3u`;
- tiempo jugado;
- revisión de cada juego en el diagnóstico;
- los dos tipos de mando y su reconexión;
- lo que se recuerda al reabrir;
- 30 minutos de uso sin aumento de memoria.

Las 97 pruebas automáticas pasan en la laptop (WSL) y en la MP80.

Para cumplir la skill se agregaron en esta tanda:

- juegos de varios discos (§8);
- veces y tiempo jugado (§24);
- aviso y búsqueda de `neogeo.zip` (§39);
- revisión de juegos con estados y duplicados (§30–32);
- detección de emuladores en el registro al arrancar (§15);
- número de proceso de cada lanzamiento (§48).

Quedan tres grupos:

- **Lo que necesita tus archivos.** Un juego real de arcade, PlayStation, GameCube y PSP, y las BIOS
  de PlayStation y Sega CD.
- **Lo que necesita tu permiso.** Probar la instalación como consola y apagar desde el menú implica
  reiniciar o apagar la MP80.
- **Lo que la skill pide y el plan no tiene.** Ver «Lo que queda por decidir».

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

## La skill, sección por sección

Estados: **Cumple** (está y se probó), **Cumple distinto** (el objetivo se cubre de otra forma, decidida
en el plan), **Parcial**, **No está** y **Choca con el plan** (el plan manda, según el CLAUDE.md).

| § | Tema | Estado | Dónde o por qué |
| --- | --- | --- | --- |
| 1 | Propósito | Parcial | Todo menos importar juegos desde la app y descargar contenido legal (§33–37). |
| 2 | Hardware independiente | Cumple | Se adapta a cualquier pantalla; el instalador no depende de la MP80. |
| 3 | RetroArch, Dolphin y PPSSPP | Cumple | `config/emulators.json`; los tres probados en el diagnóstico de la MP80. |
| 4 | Carpetas `~/NeoRetro/{roms,media,saves,…}` | Choca con el plan | En la consola los juegos van en `~/roms` y `~/media`; los datos de la app, en `~/.config/neo-arcade`. En la MP80, `~/NeoRetro` es el repositorio. |
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
| 19 | Controles | Choca con el plan | La skill pone Start = Iniciar y Select = Menú. El plan pone A = elegir, Start = Configuración y View = filtros. Select + Start y Esc para salir sí coinciden. |
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
| 44 | `~/NeoRetro/config/` | Choca con el plan | `config/` va con la app y lo del usuario en su carpeta de datos. |
| 45–46 | Respaldos y base de datos | No está | Lo recordado son archivos JSON legibles que se escriben sin riesgo de corte. |
| 47–49 | Arquitectura y procesos | Cumple distinto | `core/` (servicios) y `app/` (interfaz) separados; cada lanzamiento anota comando, código de salida, duración y número de proceso. |
| 50–52 | Instalación, Flatpak y permisos | Cumple | `flatpak info`, permisos de la caja, aviso si una carpeta no se puede leer (en el diagnóstico). |
| 53–54 | Arranque y quiosco | Parcial | Instalador de la fase 8 escrito (Cage, sin escritorio). Falta probarlo en una máquina virtual. |
| 55 | Actualizaciones | No está | No se actualiza nada solo; tampoco avisa de versiones nuevas. |
| 56 | Registros | Cumple distinto | En `~/.config/neo-arcade/registros/`, no en `~/NeoRetro/logs/`. |
| 57 | Pruebas automáticas | Cumple | 97 pruebas; Dolphin y PPSSPP se prueban por su comando, no abriendo un juego. |
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

Además, dos puntos de la skill chocan con lo aprobado y conviene corregirlos en la skill:

- **Carpetas (§4, §44, §56).** La skill pone todo en `~/NeoRetro/`. En la MP80 esa carpeta es el
  repositorio, y en la consola instalada los juegos van en `~/roms` y `~/media`.
- **Botones (§19).** La skill pone Start = Iniciar y Select = Menú. El plan aprobado pone A = elegir,
  Start = Configuración y View = filtros.

## La skill como archivo

Como está, Claude Code no la reconoce como skill:

1. Todo el texto está dentro de un bloque ```` ```md ````. El encabezado `---` con `name` y
   `description` debe ser lo primero del archivo, sin nada antes.
2. El archivo debe llamarse `SKILL.md`, dentro de una carpeta con el nombre de la skill:
   `.claude/skills/neo-arcade/SKILL.md` (en el proyecto) o `~/.claude/skills/neo-arcade/SKILL.md` (para
   todos los proyectos).
3. La parte final, «Cómo usar esta Skill», son notas para ti; conviene sacarla del archivo.
4. Los comandos de la §60 pueden apuntar a los que ya existen: `npm run diagnostico`,
   `npm run diagnostico -- --juegos` y `npm test`.
