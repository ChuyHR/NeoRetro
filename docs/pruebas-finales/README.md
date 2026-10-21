# Pruebas finales con la skill neo-arcade

Fecha: 2026-10-20. Equipo: Blackview MP80 con su TV (HDMI-1, 1920×1080 a 75 Hz), Debian 13, RetroArch
1.22.2, Dolphin 2609a y PPSSPP 1.20.4 de Flathub. Rama `main`.

El usuario pidió usar su skill (`UtilsDev/skills/neo-arcade/skill.md`) para correr pruebas finales
reales. Este documento cruza cada sección de la skill y cada prueba del producto final del plan
(`docs/plan-desarrollo.md`) con lo que hay en el código y con lo que se probó en la TV.

Las pruebas usan programas y archivos propios, nunca juegos de terceros, y nunca tocan `roms/` ni
`media/`. Lo que necesita un juego comercial o una BIOS queda marcado como pendiente del usuario.

## Resumen

RESUMEN_PENDIENTE

## Resultados en la TV

RESULTADOS_PENDIENTES

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

PLAN_PENDIENTE

## Lo que queda por decidir

DECIDIR_PENDIENTE

## La skill como archivo

SKILL_PENDIENTE
