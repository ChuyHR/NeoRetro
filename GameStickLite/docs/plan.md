# Plan: revivir el Game Stick Lite 4K y darle un sistema propio

Propuesta del 2026-10-22, pendiente de aprobación del usuario.

## Objetivo

Dos cosas, en este orden:

1. **Revivirlo**: que vuelva a arrancar y a abrir juegos con sus mandos inalámbricos. Hoy no tiene
   sistema, porque la microSD donde vivía se usó para otra cosa y no hay copia.
2. **Darle un sistema propio parecido a Neo Arcade**: encender directo a una biblioteca con carátulas,
   moverse con el mando como en la MP80 y volver al menú al salir de un juego.

## Lo que limita al aparato

Según fuentes públicas, todavía sin verificar en este aparato:

- Tiene **256 MB de RAM**. La MP80 tiene 16 GB.
- Con el mismo nombre comercial se venden placas con distinto procesador, al menos HiSilicon
  Hi3798MV100 y Rockchip RK3032. Todo lo demás depende de cuál sea.

Con 256 MB no cabe lo que usa Neo Arcade (Electron, Debian, Flatpak). El sistema nuevo tiene que ser
mucho más ligero:

- una interfaz escrita en C con SDL2, que dibuja directo en la pantalla;
- RetroArch para los juegos;
- la interfaz se cierra al abrir un juego y vuelve al salir, para dejarle toda la memoria al juego.

Qué sistemas corren a velocidad completa se mide en la fase 2, no se supone. Lo esperable es NES,
SNES, Game Boy, Mega Drive, Master System, PC Engine y parte de arcade. Nintendo 64, PSP y GameCube
quedan fuera.

## Qué se reutiliza de Neo Arcade

- **El diseño**: la barra de sistemas, el carrusel de carátulas y la ficha del juego, simplificados
  para que quepan en memoria.
- **Los botones**:
  - LB y RB cambian de sistema; LT y RT saltan de letra;
  - X marca favorito y Y busca;
  - Select + Start sale del juego.
- **El formato de la biblioteca**: `roms/<sistema>/`, `gamelist.xml` y carátulas. Los juegos salen de
  la biblioteca propia del usuario que está en la MP80.
- **Lo aprendido con RetroArch**:
  - el perfil del mando con su nombre exacto y su puerto;
  - la combinación para salir;
  - el sonido por HDMI.
- **La forma de probar**: por SSH desde la laptop, con capturas de la TV y un mando virtual.

## Fases

Cada fase termina con su prueba en el aparato real y espera aprobación antes de la siguiente.

| Fase | Qué se hace | Cómo se sabe que terminó |
|---|---|---|
| 0. Identificar | Abrir la carcasa y fotografiar la placa por los dos lados: procesador, chips de memoria y versión impresa. | Procesador, RAM y versión confirmados con las marcas de los chips. |
| 1. Revivir | Escribir en una microSD nueva un sistema sin juegos que corresponda a la placa. Para Hi3798MV100 existe GStickOS; para RK3032 hay que buscar una opción sin juegos. | Arranca, los mandos 2.4G responden y abre un juego de la biblioteca propia. |
| 2. Medir | Con ese sistema: memoria libre, velocidad de cada sistema en RetroArch, cómo se ven los mandos y la pantalla. | Tabla de qué sistemas corren bien, con su medición. |
| 3. Base propia | Compilador cruzado para el procesador, SDL2 y una prueba mínima que dibuje en la TV y lea el mando. | Una imagen de prueba en la TV, movida con el mando. |
| 4. Interfaz | La interfaz en C y SDL2: biblioteca, carátulas, sistemas, favoritos, búsqueda; abrir y volver de RetroArch. | Recorrido completo con el mando en el aparato, con memoria y tiempos medidos. |
| 5. Biblioteca | Copiar de la MP80 los sistemas que corren bien, con carátulas reducidas al tamaño de la pantalla. | La biblioteca completa abre en el aparato en un tiempo medido. |
| 6. Imagen final | Un solo archivo para escribir en una microSD y una guía para hacerlo. | Una microSD nueva, escrita con la guía, arranca directo en la interfaz. |

## Decisiones que toma el usuario

- **El nombre** del sistema nuevo.
- **La base** de la fase 3, cuando se sepa el procesador:
  - conservar el núcleo y el arranque del sistema de la fase 1 y cambiar solo lo de encima;
  - o compilar todo desde cero.

  GStickOS no publica licencia (su página dice «All rights reserved»), y solo publica su compilador.
  Para uso personal no estorba; para compartir la imagen, sí.
- **Si la placa es RK3032 y no aparece un sistema sin juegos**: cómo seguir. Las copias completas de
  fábrica que circulan traen juegos comerciales y no se descargan.

## Lo que hace falta

- Una microSD, de preferencia nueva y de buena marca. Para el sistema basta con 8 GB; para la
  biblioteca, más.
- Un lector de microSD para la laptop.
- Si se quiere controlarlo por red: un adaptador Wi-Fi USB con chip RTL8188EU (GStickOS lo reconoce) y
  un hub USB, porque el aparato tiene un solo puerto.
