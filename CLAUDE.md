# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

Neo Arcade es un frontend de emulación para una PC conectada a una TV. Arranca solo al encender,
muestra la pantalla del prototipo aprobado y lanza RetroArch, Dolphin o PPSSPP al elegir Jugar, sin
que se vea el sistema operativo ni los menús de los emuladores. Debe instalarse y funcionar en
cualquier PC que cumpla los requisitos mínimos; la Blackview MP80 es el equipo de referencia. Es de
uso personal y el repositorio no incluye ROMs.

La fuente de verdad es el plan, [docs/plan-desarrollo.md](docs/plan-desarrollo.md). Ahí están los
cinco criterios de terminado, la tabla de requisitos técnicos, las nueve fases (0 a 8) con su prueba
de aceptación, el prompt de cada fase, las pruebas del producto final y la tabla de riesgos. La
sección «Ajustes al plan» de este archivo manda sobre el plan y sobre los prompts cuando choquen.

## Estado actual

Verificado el 2026-10-20. La fase 0 quedó aprobada por el usuario. **La fase 1 está terminada y
verificada; espera su revisión.** La pantalla del prototipo está reproducida por piezas, con 0.0 % de
píxeles distintos en todas las zonas salvo las dos con cambios aprobados (ficha a 24 px y pie con
teclas), y se recorre entera con el teclado (`docs/pruebas-fase1/`). `npm test` pasa (21 pruebas).
La tecnología es la de [docs/decision-tecnica.md](docs/decision-tecnica.md): Electron 44, emuladores
desde Flathub y Debian 13 con Cage. La MP80 ya tiene Debian en arranque dual y responde por SSH. El
contexto de la última sesión está en [handoffs/HANDOFF_LATEST.md](handoffs/HANDOFF_LATEST.md); léelo
al empezar.

**Dónde vive cada cosa.** El repositorio está en `C:\Users\ADMIN\Documents\UtilsDev\ArcadeRetro`, con
respaldo en GitHub: `https://github.com/ChuyHR/NeoRetro.git` (privado, rama `main`). Las carpetas
`roms/<sistema>/` y `media/<sistema>/` existen vacías, fuera de git. `credenciales/` (también fuera
de git) guarda la contraseña del Wi-Fi para armar la imagen de instalación; nunca se lee en voz alta
ni se sube. El Debian 13 de desarrollo es una distribución de WSL llamada `Debian`, con su disco
virtual en C:; su usuario por omisión es `arcade` (uid 1000, sudo sin contraseña, systemd activo).
El usuario pidió que le avises **antes de que C: se llene**: revisa el espacio libre antes de cada
instalación grande y detente si baja de 10 GB. Su disco externo D: no se usa: con escritura sostenida
su adaptador USB (puente JMicron JMS583) se restablece solo, en cualquier puerto, y el 2026-10-20 dañó
un Debian de WSL.

**PC de trabajo**: Windows 11 Pro, laptop con Intel Core i7-1165G7 (4 núcleos, 8 hilos), gráficos Iris
Xe, 8 GB de RAM y pantalla de 1366×768. En Windows tiene git 2.55, Node 20.20 y Python 3.14 como `py`
(`python` y `python3` abren la tienda de Microsoft). El Debian de WSL se prepara con
`scripts/preparar-desarrollo.sh --sin-emuladores`: bibliotecas de Electron y OpenGL, Python y Node
24.21.0 en `/opt` (Debian trae 20.19 y Electron 44 pide 22.12 o posterior). Los emuladores de Flathub
(unos 2.5 GB) se instalan en la fase 3, sin la opción, para no gastar C: antes. Sus gráficos son mucho más
potentes que los de la MP80, así que la fluidez medida aquí no cuenta como evidencia. El controlador
de discos de Windows ha avisado cuatro veces que su SSD interno (C:) anticipa una falla.

**Equipo de referencia**: Blackview MP80 (dato del usuario, 2026-10-20; especificaciones confirmadas
en la ficha de Intel y en la reseña de CNX Software). Intel N95 (4 núcleos, hasta 3.4 GHz, 15 W) con
gráficos UHD de 16 EU, 16 GB LPDDR5, SSD M.2 SATA de 512 GB, Wi-Fi 5, Bluetooth 4.2, tres HDMI 2.0 y
tres USB 3. Tiene Debian 13 en arranque dual con Windows 11 Pro: usuario `arcade` sin contraseña,
sesión automática en Xfce, sudo sin contraseña y SSH solo con la llave
`C:\Users\ADMIN\.ssh\neoarcade_ed25519` de la laptop. Está en el Wi-Fi de la casa en `192.168.100.94`
(tarjeta Realtek RTL8821CE, 5 GHz):

```bash
ssh -i ~/.ssh/neoarcade_ed25519 arcade@192.168.100.94
```

Su firmware (AMI) impone su propio orden de arranque e ignora `efibootmgr`. Arranca Debian por la
entrada `Boot0003`, que apunta a una copia de shim y GRUB en la partición EFI de Windows; esa copia la
mantiene `/usr/local/sbin/neoarcade-copiar-grub`, que apt corre después de cada instalación
(`scripts/instalador/copiar-grub-a-esp-windows.sh`). Windows se elige en el menú de GRUB. El usuario
dio permiso para instalar ahí lo necesario, llevar el proyecto y abrir la app o los emuladores en su
TV sin preguntar. **Reiniciarla o apagarla sí se le avisa antes.** La fase 8 la reinstala como sistema dedicado. Su GPU es el
recurso más justo, tanto para los efectos de la interfaz como para GameCube.

## Comandos

Probados el 2026-10-20. Corren dentro de Debian, en la raíz del repositorio:

```bash
npm install                            # instala Electron 44.5.1 (única dependencia)
npm start                              # desarrollo: pantalla completa, Esc la cierra; baja el motor la 1.ª vez
npm start -- --captura=/tmp/a.png      # guarda lo que muestra la ventana y sale (solo desarrollo)
npm test                               # pruebas con el ejecutor de Node (carpeta pruebas/)
node --test pruebas/estado.test.js     # un solo archivo de pruebas
npm run comparar                       # app contra prototipo a 1920×1080: % distinto por zona y mapa
npm run recorrido                      # recorre la app con el teclado y captura cada pantalla
npm run empaquetar                     # versión final en dist/neo-arcade/ (ejecutable neo-arcade)
```

`comparar` y `recorrido` dejan sus capturas en `docs/pruebas-fase1/`. La comparación es la prueba de
fidelidad de cualquier cambio visual: fuera de los cambios aprobados, cada zona debe quedar en 0.0 %.
Necesita internet, porque el prototipo pide sus tipografías a Google Fonts.

Claude Code corre en Windows y todo lo de Linux se ejecuta en el Debian de WSL. Usa `--exec`: sin él,
WSL vuelve a interpretar el comando con otro shell y las variables llegan vacías. Desde Git Bash
hace falta `MSYS_NO_PATHCONV=1` para que las rutas de Linux no se conviertan en rutas de Windows.

```bash
export MSYS_NO_PATHCONV=1
wsl.exe -d Debian --exec bash -c 'cd /mnt/c/Users/ADMIN/Documents/UtilsDev/ArcadeRetro && <comando>'
wsl.exe -d Debian --exec bash -c 'cd /mnt/c/Users/ADMIN/Documents/UtilsDev/ArcadeRetro && bash docs/pruebas-fase0/correr.sh'
```

En WSL, toda ventana gráfica necesita `GALLIUM_DRIVER=d3d12`; sin esa variable Mesa dibuja por
software. Electron necesita además `--no-sandbox` porque corre desde `/mnt/c`. Ninguno de los dos se
usa en la MP80. `/mnt/c` no distingue mayúsculas y la MP80 sí: nombres de archivo en minúsculas y sin
acentos en el código. Otros detalles de WSL que ya costaron tiempo:

- Electron 44 no baja su motor con `npm install`, sino la primera vez que se ejecuta. Sin una primera
  ejecución, `npm run empaquetar` no encuentra `node_modules/electron/dist`.
- `xdotool` no consigue entregar teclas a la ventana en WSLg, aunque la tenga enfocada. Para probar
  el teclado, la tecla se manda desde Electron con `webContents.sendInputEvent`, que pasa por
  `before-input-event` igual que una tecla real.
- `/tmp` está en memoria y WSL apaga Debian cuando nadie lo usa, así que lo que dejes ahí entre dos
  comandos desaparece.
- `pkill -f` puede cerrar el propio comando que lo ejecuta, si el patrón aparece en su línea de
  comandos. Para la app usa `pkill -x electron` o `pkill -x neo-arcade`.

**Rehacer el Debian de desarrollo** (por ejemplo, si su disco virtual se daña). Desde PowerShell en
Windows:

```powershell
wsl --unregister Debian      # borra el Debian anterior y todo lo que tenga dentro
wsl --install Debian --no-launch
wsl -d Debian -u root --exec bash /mnt/c/Users/ADMIN/Documents/UtilsDev/ArcadeRetro/scripts/crear-usuario-wsl.sh
wsl --terminate Debian
wsl -d Debian --exec bash /mnt/c/Users/ADMIN/Documents/UtilsDev/ArcadeRetro/scripts/preparar-desarrollo.sh --sin-emuladores
```

Los pasos van en scripts y no en línea porque PowerShell 5.1 rompe las comillas internas al pasarle un
comando a WSL.

Para ver el prototipo hay que servir la carpeta, porque el navegador bloquea sus scripts por `file://`:

```bash
cd docs/referencia && py -m http.server 8765     # en Linux: python3 -m http.server 8765
# abrir http://localhost:8765/NeoArcade.dc.html
```

Probado el 2026-10-20. Los puertos 5173 a 5176, 8002, 8003, 8007, 8080 y 8090 los usan contenedores
de otros proyectos de esta PC. Si la fase 0 elige un servidor de desarrollo (Vite usa 5173 por
omisión), hay que fijarle otro puerto.

## Arquitectura

Electron con JavaScript sin framework ni paso de compilación: lo que está en `app/` es lo que corre.
`package.json` usa `"type": "module"`, así que todo es ESM, también el proceso principal.

- `core/main.js` es el proceso principal. Abre una ventana a pantalla completa, sin bordes ni menú, y
  carga `app/index.html`. Quitar el menú también quita sus atajos (recargar, herramientas de
  desarrollo, zoom). El modo desarrollo se decide con `app.isPackaged`: con `electron .` es
  desarrollo, y en la versión final el ejecutable se llama `neo-arcade` y Electron la da por
  empaquetada. Solo en desarrollo Esc cierra la app y existen las herramientas de desarrollo.
- `app/` es la interfaz. El flujo es de un solo sentido: tecla → acción → estado nuevo → vista →
  piezas.
  - `entrada-teclado.js` traduce teclas a acciones: flechas para mover, Enter para aceptar,
    Retroceso para volver, y Re Pág y Av Pág para cambiar de sistema. Esc no está porque en
    desarrollo cierra la app.
  - `estado.js` (`aplicar`) decide cómo cambia el estado con cada acción, en la pantalla principal o
    en una ventana.
  - `modelo.js` (`vistaDe`) calcula lo que cada pieza dibuja: los lugares del carrusel (tabla
    `RANURAS` del prototipo), la ventana de 12 sistemas, el reloj, el marcador y la portada.
  - Las tres son puras y se prueban con Node. `inicio.js` las conecta y vuelve a pintar tras cada
    cambio.
- `app/piezas/` tiene una pieza por parte de la pantalla: cabecera, barra de sistemas, carrusel, ficha,
  acciones, vista previa, pie, detalles, configuración, lanzamiento y decoración. Cada una crea su
  marcado una sola vez (`crearX(lienzo, contexto)`) y luego solo cambia lo dinámico en
  `actualizar(vista)`. **El marcado conserva los estilos en línea del prototipo, copiados tal cual**:
  así cada valor se compara directo con `docs/referencia/NeoArcade.dc.html`. El orden de creación en
  `inicio.js` es el del prototipo y define qué queda encima.
- El carrusel coloca cada portada al instante en su lugar final y anima el paso con `transform` y
  opacidad (técnica FLIP, `element.animate`), sin animar posición ni tamaño (ajuste 8).
- `datos-ejemplo.js` (los 14 juegos del prototipo, con ids de sistema del plan), `arte.js` (portada de
  reemplazo), `iconos.js` y `fuentes.css` con las cinco tipografías locales de `app/fuentes/`.
  `lienzo.js` escala el lienzo de 1920×1080 a la ventana sin deformarlo.
- `scripts/captura.mjs` abre una página a 1920×1080 aunque la pantalla sea más chica (emula el tamaño
  con el protocolo de depuración de Chromium) y compara capturas con `nativeImage`, sin dependencias.
- `core/entrada/`, `core/lanzador/`, `core/escaner/` y `core/almacenamiento/` están vacías; cada una
  se llena en su fase. La interfaz no toca Node: cuando necesite al núcleo, hablará con él por un
  `preload` con `contextBridge`, con aislamiento de contexto y sin integración de Node en la página.
- `scripts/empaquetar.sh` copia el motor de `node_modules/electron/dist`, renombra el ejecutable y
  pone la app en `resources/app`, que Electron carga en lugar de su app de ejemplo. En la MP80,
  `chrome-sandbox` necesita dueño root y permiso 4755 (lo hará `install.sh` en la fase 8).

## Ajustes al plan (decididos con el usuario el 2026-10-20)

1. **Dónde se desarrolla.** En Debian dentro de WSL 2, en la PC de trabajo, con las ventanas gráficas
   de WSLg; el repositorio vive en el externo D: para no llenar C:. Ahí se
   construyen y prueban la interfaz, el escáner, el lanzador y el almacenamiento. No
   sirve para medir rendimiento ni para probar el arranque, la sesión de quiosco, el Bluetooth o los
   controles. Eso se prueba en la MP80 cuando el producto esté casi completo, y el instalador de la
   fase 8 antes en una máquina virtual completa.
2. **Cualquier PC.** Ni el código ni el instalador dependen del modelo de la MP80. Requisitos mínimos
   propuestos (por confirmar en la fase 0): PC x86-64 con Intel o AMD, 4 núcleos, 8 GB de RAM,
   gráficos con Vulkan u OpenGL 3.3, SSD y salida HDMI. Las metas de rendimiento solo se dan por
   cumplidas medidas en la MP80.
3. **Primero teclado.** La interfaz recibe acciones (mover, aceptar, volver, favorito, buscar,
   ajustes, filtro), nunca teclas, para que el control se agregue después como otra fuente de las
   mismas acciones. La fase 4 queda en pausa hasta que haya controles. Mientras tanto, las pruebas de
   cada fase y los criterios de terminado se hacen con teclado y sin ratón.
4. **Controles, cuando se retome la fase 4.** El mando se lee en el núcleo (dispositivos de entrada
   de Linux) y no en la interfaz, para cubrir tableros que se presentan como teclado, pasar del tope
   de 4 controles de Chromium y seguir escuchando con el emulador abierto. Una pantalla «Configurar
   control» mapea la primera vez cada control desconocido; el mapeo se guarda por control en la
   carpeta de datos y Neo Arcade lo escribe en la configuración de cada emulador antes de lanzar.
   Ajustes permite emparejar controles Bluetooth, y el instalador agrega xpadneo y xone para Xbox.
5. **Sistema dedicado con teclado.** En la versión final ninguna combinación de teclas saca de Neo
   Arcade: cerrar la ventana, recargar, abrir herramientas de desarrollo o cambiar de consola. Esc
   cierra la app solo en desarrollo. Los tres emuladores salen con la misma tecla, que Neo Arcade
   configura en cada uno (propuesta: Esc). La terminal de mantenimiento se abre con una combinación
   sostenida 3 segundos (propuesta: Ctrl + Alt + Mayús + M).
6. **Cualquier pantalla.** La interfaz se adapta a cualquier resolución y tamaño, de pantallas
   pequeñas a 4K, escalando el lienzo de 1920×1080 sin deformarlo. En pantallas que no son 16:9 el
   margen sobrante lleva el fondo `#050914`. La salida usa la resolución nativa de la pantalla, y
   Ajustes permite fijar 1080p si un equipo no sostiene 60 fps en 4K.
7. **Cambios aprobados al diseño**, que son excepciones a la regla de no cambiarlo:
   - Las carátulas reales se ven completas, sin recorte, sobre el color del sistema y sin cambiar el
     marco de la tarjeta. El título en Bungee encima queda solo para la portada de reemplazo.
   - El recuadro de vista previa (hoy 494×182 por dentro) se rediseña para que un vídeo 4:3 o vertical
     se vea completo. El espacio puede salir de la cabecera, que ocupa 232 de los 1080 px.
   - El texto de lectura tiene un mínimo de 24 px (descripción y ficha de detalles).
   - Un solo modelo de foco: izquierda y derecha mueven el carrusel, arriba y abajo recorren las
     acciones, aceptar ejecuta la acción marcada (Jugar por omisión) y cambiar de sistema tiene su
     propia tecla. La barra muestra 12 sistemas, se desplaza para seguir al activo y oculta los que
     no tienen juegos. Los 10 sistemas sin ícono se dibujan en el estilo de los existentes.
   - El pie de controles muestra las teclas o botones de la entrada en uso, no siempre los de Xbox.

   Los rediseños se muestran al usuario con capturas antes de darlos por buenos.
8. **Carrusel animado con `transform` y opacidad**, no con posición y tamaño como el prototipo, para
   sostener 60 fps con la GPU de la MP80. El resultado visual es el mismo.
9. **Perfil Peques en la fase 6**, junto con la persistencia (propuesta, sin confirmar).

## Cómo está hecho el prototipo

`docs/referencia/NeoArcade.dc.html` es un componente exportado de una herramienta de diseño, en dos partes:

- La plantilla `<x-dc>`: marcado con estilos en línea, marcadores `{{…}}` y las etiquetas `<sc-for>`
  y `<sc-if>`. Los colores, medidas, radios, sombras y tipografías a reproducir están en los
  atributos `style` y en el bloque `<helmet><style>`.
- La clase `Component extends DCLogic` dentro de `<script type="text/x-dc">`: el estado, los datos
  de ejemplo (14 juegos en `games()`) y el cálculo de cada valor que muestra la plantilla.

`support.js` y `vendor/react*.js` son el motor que dibuja el componente en el navegador. Son código
generado, no forman parte del diseño y no se portan.

Varios valores de diseño viven en `renderVals()` y no en el marcado:

- **Carrusel.** La tabla `slots` fija posición, tamaño, rotación en perspectiva y opacidad para cada
  desplazamiento de -4 a +5 respecto al juego seleccionado. Solo se dibujan las tarjetas que caen en
  esa ventana: ocho visibles y dos transparentes en los extremos para la transición de 0.3 s.
- **Tarjetas.** Si el título pasa de 18 caracteres, baja de 58 a 40 px en la central y de 26 a 18 px
  en las laterales. La banda inferior mide 62 px en la central y 36 px en las demás. El área de imagen
  de la central es apaisada (427×313) y la de las laterales vertical (188×248).
- **Portada de reemplazo.** `art(g)` genera el fondo con degradados CSS a partir de tres colores del
  juego (`c1`, `c2`, `c3`) y un motivo (`rays`, `grid`, `circles`, `stripes`, `diamond`, y `zigzag`
  como caso por omisión). La fase 5 la usa cuando falta la carátula.
- **Vista previa.** Es una escena dibujada con CSS (cielo con los colores del juego, suelo, marcador
  1P/HI) más la capa de líneas CRT que enciende Configuración. La fase 5 la sustituye por la captura
  y el vídeo.
- **Foco.** El elemento activo lleva borde `#1E90FF` y brillo azul: la tarjeta central, el sistema
  elegido y la acción elegida. El prototipo solo responde a clics; la navegación con teclado sigue el
  modelo del ajuste 7.
- **Reloj y fecha**, con abreviaturas en español (`LUN.`, `ENE.`).

Pantallas que trae: principal, Detalles, Configuración (solo el interruptor de Efecto CRT) y la de
lanzamiento («Abriendo <emulador>…», PRESS START). Tipografías: Bungee, Pixelify Sans (500, 600 y
700), Share Tech Mono, Kaushan Script y Press Start 2P. Hoy se piden a Google Fonts; la fase 1 las
guarda dentro del proyecto.

## Diferencias abiertas entre el plan y el prototipo

1. **Nombre del prototipo.** El plan lo llama `docs/referencia/neo-arcade.html`. El archivo real se
   llama `NeoArcade.dc.html` y está en `docs/referencia/` junto con `support.js` y `vendor/`, que
   necesita para verse.
2. **Ids de sistema.** El prototipo usa ids propios (`all`, `atari`, `genesis`, `ps`, `dc`…). La app
   ya usa los nombres de carpeta del plan (`todos`, `atari2600`, `megadrive`, `psx`, `dreamcast`…),
   también en los datos de ejemplo.
3. **Pantallas que el plan pide y el prototipo no dibuja.** Filtros Favoritos y Recientes, buscador
   con teclado en pantalla, perfil Peques, el resto de los ajustes (neón, animaciones, volumen, color
   del tema, combinación para salir), Apagar y Reiniciar, animación de arranque y mensajes de error
   del lanzador. Se proponen con la paleta, las tipografías y el estilo de los diálogos existentes, y
   se muestran al usuario antes de darlas por buenas.
4. **Textos en inglés.** El prototipo trae lemas de marca (PLAY AGAIN, Same games. New adventures.,
   INSERT COIN, RETRO IS NOT A STYLE…, PRESS START) y la pestaña ALL GAMES. Por la regla de no
   cambiar el diseño se conservan; si alguno debe pasar a español, lo decide el usuario.
5. **Títulos cortados a media palabra.** En las portadas laterales angostas, un título de hasta 18
   letras va a 26 px y se parte («HEDGEHO G», «FIGHTE R II») por `word-break: break-word`. Así lo hace
   el prototipo y se reprodujo tal cual; si se ajusta, lo decide el usuario.

## Reglas del proyecto

Vienen de la sección «CLAUDE.md del proyecto» del plan, con las rutas corregidas y los ajustes de
arriba incorporados.

### Diseño
- `docs/referencia/NeoArcade.dc.html` es el diseño final aprobado, con los cambios del ajuste 7. No cambies
  colores, tipografías, medidas, disposición ni animaciones sin que te lo pida explícitamente.
- La interfaz es un lienzo de 1920×1080 escalado manteniendo la proporción. Nunca uses scroll vertical
  en la pantalla principal.
- Todo debe poder usarse sin ratón: hoy con teclado y, cuando se retome la fase 4, con mando. Cada
  elemento nuevo necesita estado de foco visible desde 3 metros.
- Textos de la interfaz en español, cortos y en lenguaje de usuario («Jugar», no «Ejecutar emulador»).

### Código
- La tecnología es la que apruebe la fase 0 en `decision-tecnica.md`. No la cambies sin proponerlo
  primero.
- Interfaz, entrada, lanzador de emuladores, escáner de juegos y almacenamiento viven en módulos
  separados, con una frontera clara entre ellos.
- Configuración en `config/*.json` (`systems.json`, `emulators.json`, `gamepad-map.json`). Nada de
  rutas ni nombres de emuladores escritos dentro del código.
- Datos del usuario (favoritos, recientes, último juego por sistema, perfil, ajustes y mapeos de
  controles) en la carpeta de datos del usuario, en un formato legible.
- Sin dependencias nuevas salvo que sean imprescindibles; pregunta antes de añadir una.
- Registra errores en un archivo de log. La interfaz muestra mensajes claros, nunca pantallas en blanco.

### Juegos y emuladores
- Las carpetas `roms/` y `media/` son del usuario: nunca las modifiques, borres ni descargues contenido
  en ellas. Quedan fuera de git.
- No descargues ni sugieras descargar ROMs. Si falta un juego para probar, pídelo.
- Las rutas de los emuladores se le preguntan al usuario; no se inventan.
- RetroArch se lanza con `retroarch -f -L <ruta del núcleo> "<ruta del juego>"`. Dolphin y PPSSPP,
  con sus propios comandos de `config/systems.json`.
- Carpetas de sistema, con estos nombres exactos: `arcade`, `neogeo`, `cps`, `nes`, `snes`, `n64`,
  `gb`, `gbc`, `gba`, `gamecube`, `mastersystem`, `megadrive`, `segacd`, `sega32x`, `gamegear`,
  `dreamcast`, `psx`, `psp`, `pcengine`, `atari2600`, `ports`. Los medios y el `gamelist.xml` de cada
  una (generados con Skraper, formato EmulationStation) van en `media/<sistema>/` y se unen con la
  biblioteca por ruta de archivo.
- Las extensiones de cada sistema incluyen los formatos comprimidos que acepta su emulador (CHD para
  discos de PlayStation, Dreamcast y Sega CD; RVZ para GameCube; CSO para PSP).

### Forma de trabajar
- Una fase por sesión y en orden. Cada fase termina con su prueba de aceptación; si falla, no se pasa
  a la siguiente.
- Antes de tocar código, explica en 3 a 5 líneas qué vas a hacer.
- Cambios pequeños y probados. Ejecuta la app y verifica antes de dar algo por terminado; la
  fidelidad al prototipo se comprueba con capturas lado a lado.
- Al terminar una tarea: resumen de lo hecho, cómo probarlo y un commit con mensaje claro.
- Si algo del plan no se puede hacer en este sistema operativo, dilo y propone la alternativa más simple.
- Lo que no está en las nueve fases ni en los ajustes va a la lista de extras para después de la
  primera versión (perfil Peques con lista blanca, 4 jugadores, tema de colores por emulador, versión
  para Android TV).
- Al cerrar cada sesión se actualiza `handoffs/HANDOFF_LATEST.md`, en el mismo commit que el trabajo,
  y el anterior se archiva en `handoffs/history/HANDOFF_<fecha>.md`. Registra lo hecho, lo que quedó a
  medias, las decisiones que esperan al usuario y el porqué de cada decisión tomada.
- Respuestas y documentos en español de México.
- En Windows no edites archivos con `Get-Content`/`Set-Content` de PowerShell ni con `perl -CSD`,
  porque rompen los acentos. Usa las herramientas de edición.
