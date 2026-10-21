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

Verificado el 2026-10-20. La fase 0 quedó aprobada por el usuario. **Las fases 1 a 6 están construidas
y verificadas y esperan su revisión.** La fase 7 (pulido y rendimiento) no se ha empezado. Lo verificado:

- Fase 1: la pantalla del prototipo está reproducida por piezas, con 0.0 % de píxeles distintos salvo
  en las dos zonas con cambios aprobados, y se recorre entera con el teclado (`docs/pruebas-fase1/`).
  En la TV de la MP80 el carrusel va a 59 cuadros por segundo a 60 Hz y a unos 66 a 75 Hz
  (`docs/pruebas-fase1/fps-mp80.txt`).
- Fases 2 y 3: con una biblioteca de archivos vacíos y un emulador falso (`npm run simulacion`) y en
  la TV de la MP80 con RetroArch de verdad y un programa de prueba propio de SNES
  (`scripts/prueba-en-tv.sh`, `docs/pruebas-fase3/tv-mp80/`): abre a pantalla completa, responde al
  teclado y Esc vuelve a Neo Arcade en 375 ms. Avisos de núcleo, emulador, BIOS o juego faltante y de
  juego que no abre.
- Fase 4: en la TV con mandos virtuales (`scripts/prueba-mando-en-tv.sh`, `docs/pruebas-fase4/`), un
  mando de Xbox y una palanca de arcade que se configura sola la primera vez; los dos sirven dentro de
  RetroArch y Select + Start vuelve al menú.
- Fase 5: carátulas, capturas, vídeos y datos del `gamelist.xml` o de las carpetas de medios
  (`npm run simulacion`, `docs/pruebas-fase5/`), también en la TV.
- Fase 6: favoritos, recientes, búsqueda, Configuración completa y todo se recupera al cerrar y volver a
  abrir (`scripts/prueba-datos-en-tv.sh`, `docs/pruebas-fase6/`).
- `npm test` pasa (77 pruebas) en la laptop y en la MP80.

**Juegos reales.** Las pruebas usan programas y medios propios, no juegos de terceros. El 2026-10-20 el
usuario pidió conseguir los juegos de prueba sin depender de él; el filtro de seguridad de Claude Code
bloqueó bajar juegos de terceros y bajar o compilar código externo (OpenBIOS para PlayStation), y no se
rodeó ese bloqueo (tampoco con el navegador que ofreció el usuario). Por eso SNES se probó con
`scripts/juego-de-prueba-snes.mjs`, un programa escrito aquí. **Arcade y PlayStation siguen sin probarse
con un juego**: el núcleo de arcade solo acepta copias exactas de placas reales y PlayStation necesita
una BIOS; ambos los tiene que poner el usuario (en `roms/` y en la carpeta de BIOS de RetroArch).

La tecnología es la de [docs/decision-tecnica.md](docs/decision-tecnica.md): Electron 44, emuladores
desde Flathub y Debian 13 con Cage. El contexto de la última sesión está en
[handoffs/HANDOFF_LATEST.md](handoffs/HANDOFF_LATEST.md); léelo al empezar.

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

Lo que ya tiene instalado (2026-10-20): el proyecto en `~/NeoRetro` (un `git push` por SSH actualiza
también los archivos, porque el repositorio acepta `updateInstead`), Node 24.21.0, RetroArch 1.22.2,
Dolphin 2609a y PPSSPP 1.20.4 de Flathub, los 11 núcleos de RetroArch que pide `systems.json` y
RetroArch configurado para salir con Select + Start o con un solo Esc. No se suspende ni apaga la
pantalla (`scripts/instalador/sin-suspension.sh`). La TV está en HDMI-1 a 1920×1080 y 75 Hz; también
acepta 60 Hz. Los emuladores de Flathub leen la carpeta personal (RetroArch con escritura, Dolphin y
PPSSPP solo lectura), así que llegan a `~/NeoRetro/roms` sin permisos extra. Para abrir algo en su TV
por SSH:

```bash
export DISPLAY=:0 XAUTHORITY=$HOME/.Xauthority XDG_RUNTIME_DIR=/run/user/$(id -u)
export DBUS_SESSION_BUS_ADDRESS=unix:path=$XDG_RUNTIME_DIR/bus
```

`timeout` sobre `flatpak run` detiene el envoltorio de Flatpak pero no al emulador, que sigue abierto
en la TV. Para saber qué emulador corre, `flatpak ps`; para cerrarlo bien, `kill -INT` a su proceso
(`pgrep -x retroarch`). No uses `pgrep -f` con la ruta de un emulador: también encuentra el comando de
SSH que la menciona.

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
npm run simulacion                     # la app real con biblioteca, emulador y medios falsos (fases 2, 3, 5 y 6)
npm run medir-fps                      # fluidez del carrusel en la pantalla real (solo en la MP80)
npm run empaquetar                     # versión final en dist/neo-arcade/ (ejecutable neo-arcade)
npm run diagnostico                    # emuladores, núcleos, BIOS, carpetas y mandos del equipo (--json)
npm run diagnostico -- --juegos        # además cada juego: vacío, cortado, pistas, BIOS, duplicados
bash scripts/instalar-nucleos.sh       # núcleos de RetroArch de systems.json (--actualizar los renueva)
bash scripts/configurar-retroarch.sh   # salir con Select + Start o un solo Esc; perfiles de mando editables
```

En la MP80, con la sesión gráfica abierta (también por SSH), pruebas en la TV con RetroArch de
verdad. Arman su biblioteca en `~/juegos-de-prueba*` (nunca en `roms/`) y dejan capturas y
`resultado.txt` en `/tmp/prueba-*`. Cierran todo Electron al terminar: no corras dos a la vez.

```bash
bash scripts/prueba-en-tv.sh           # fase 3: programa de SNES, archivo dañado y disco sin BIOS
bash scripts/prueba-mando-en-tv.sh     # fase 4: mando de Xbox y palanca de arcade virtuales (pide sudo)
bash scripts/prueba-datos-en-tv.sh     # fase 6: favoritos, recientes, Configuración y reabrir (pide sudo)
bash scripts/prueba-fluidez-en-tv.sh   # fase 7: fluidez con 3.000 juegos a 60 y 75 Hz (pide sudo)
bash scripts/prueba-memoria-en-tv.sh   # fase 7: 30 minutos de uso, memoria minuto a minuto (pide sudo)
bash scripts/prueba-final-en-tv.sh     # final: multidisco, BIOS, neogeo.zip, tiempo jugado, revisión
```

Herramientas que usan esas pruebas, también sueltas: `node scripts/juego-de-prueba-snes.mjs <carpeta>`
(programa propio de SNES: pantalla azul que se pone roja al pulsar), `bash scripts/electron.sh
scripts/medios-de-prueba.mjs <carpeta de medios>` (carátula, captura, vídeo y gamelist propios),
`sudo python3 scripts/herramientas/mando-virtual.py xbox|palanca` (un mando por uinput que obedece
órdenes por la entrada estándar) y `scripts/herramientas/xwd-a-png.py` (captura de la TV con `xwd`).

`comparar` y `recorrido` dejan sus capturas en `docs/pruebas-fase1/`. La comparación es la prueba de
fidelidad de cualquier cambio visual: fuera de los cambios aprobados, cada zona debe quedar en 0.0 %.
Necesita internet, porque el prototipo pide sus tipografías a Google Fonts. `simulacion` arma todo en
una carpeta temporal (nunca toca `roms/` ni `config/`) y deja capturas en `docs/pruebas-fase2/`,
`docs/pruebas-fase3/`, `docs/pruebas-fase5/` y `docs/pruebas-fase6/`, con un `resultado.txt` en cada
una. Correrla en la MP80 cambia esas capturas en `~/NeoRetro`; restáuralas con `git checkout -- docs/`
o el siguiente `git push` será rechazado. Al cerrar una tanda, descarta las capturas de fases que solo
cambiaron por la hora del reloj.

Para probar con otra configuración o con otras carpetas sin tocar las reales: `NEO_ARCADE_CONFIG`
(carpeta con los JSON), `NEO_ARCADE_ROMS` (juegos), `NEO_ARCADE_MEDIOS` (medios) y `NEO_ARCADE_DATOS`
(caché, registros, `mandos.json` y `datos-usuario.json`, en lugar de la carpeta de datos de Electron).
En desarrollo, `NEO_ARCADE_DEPURAR=1` escribe en la terminal cada acción que llega del mando, y lo que
la página escribe en su consola sale siempre en la terminal.

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
- `app/` es la interfaz. El flujo es de un solo sentido: tecla o mando → acción → estado nuevo →
  vista → piezas.
  - `entrada-teclado.js` traduce teclas a acciones: flechas para mover, Enter para aceptar,
    Retroceso para volver, Re Pág y Av Pág para cambiar de sistema, Inicio y Fin para saltar de
    letra; letras y números se escriben en «Buscar». Esc no está porque en desarrollo cierra la app.
    Las acciones del mando llegan ya hechas del núcleo (`core/entrada/`).
  - `estado.js` (`aplicar`) decide cómo cambia el estado con cada acción, en la pantalla principal o
    en una ventana. También tiene lo que se guarda (favoritos, recientes, último juego por sistema,
    ajustes), la barra con sus filtros (`sistemasDeLaBarra`: los sistemas y, al final, Favoritos,
    Recientes y la búsqueda) y la lista de cada entrada (`juegosDeLaVista`). Las ventanas con varias
    filas (Configuración, el teclado de Buscar) se recorren por filas; las de una fila, en línea.
  - `modelo.js` (`vistaDe`) calcula lo que cada pieza dibuja: los lugares del carrusel (tabla
    `RANURAS` del prototipo), la ventana de 12 sistemas, el reloj, el marcador, la portada, la
    última partida y los resultados de Buscar.
  - `mapeo.js`: los pasos de «Configurar control» y cómo se asigna cada botón o eje. `ajustes.js`:
    ajustes de fábrica, colores del tema y combinaciones para salir. `caratulas.js`: carátulas con
    precarga y respaldo (si una no carga, ese juego usa la portada de reemplazo).
  - Las de arriba son puras y se prueban con Node. `inicio.js` las conecta, vuelve a pintar tras cada
    cambio, aplica al lienzo el tema, el neón y las animaciones, restaura la sesión anterior al abrir y
    manda a guardar cuando cambia algo que se recuerda.
- `app/piezas/` tiene una pieza por parte de la pantalla: cabecera, barra de sistemas, carrusel, ficha,
  acciones, vista previa, pie, detalles, configuración, buscar, probar control, configurar control,
  lanzamiento y decoración. Cada una crea su marcado una sola vez (`crearX(lienzo, contexto)`) y luego
  solo cambia lo dinámico en `actualizar(vista)`. **El marcado conserva los estilos en línea del
  prototipo, copiados tal cual**: así cada valor se compara directo con
  `docs/referencia/NeoArcade.dc.html`. La única excepción es el azul de acento `#1E90FF`, que es
  `var(--acento)` (y `color-mix` para sus variantes transparentes) para que Configuración cambie el
  color del tema; vale lo mismo, y la comparación sigue en 0.0 %. El orden de creación en `inicio.js`
  es el del prototipo y define qué queda encima.
- El carrusel coloca cada portada al instante en su lugar final y anima el paso con `transform` y
  opacidad (técnica FLIP, `element.animate`), sin animar posición ni tamaño (ajuste 8).
- `datos-ejemplo.js` (los 14 juegos del prototipo, con ids de sistema del plan), `arte.js` (portada de
  reemplazo), `iconos.js` y `fuentes.css` con las cinco tipografías locales de `app/fuentes/`.
  `lienzo.js` escala el lienzo de 1920×1080 a la ventana sin deformarlo.
- `scripts/captura.mjs` abre una página a 1920×1080 aunque la pantalla sea más chica (emula el tamaño
  con el protocolo de depuración de Chromium) y compara capturas con `nativeImage`, sin dependencias.
  Con la emulación, la página no se adapta a la ventana: cree medir 1920×1080. Por eso la ventana la
  muestra reducida con `scale`; sin él, en la pantalla de la laptop solo se veía la esquina superior
  izquierda y parecía que la app no se adaptaba. La adaptación real se prueba con `npm start`
  (`docs/pruebas-fase2/pantalla-1366x768.png`).
- La interfaz no toca Node. Habla con el núcleo por `core/preload.cjs` (CommonJS, porque un preload
  con aislamiento no puede ser ESM), que expone en `window.neoArcade` la biblioteca, `jugar(id,
  opciones)`, los datos del usuario, el mapeo de mandos y `escuchar(canal)` para lo que mandan los
  mandos; `core/main.js` los atiende con `ipcMain.handle`. Sin el puente (en `comparar` y
  `recorrido`) `app/inicio.js` usa los datos de ejemplo.
- `core/configuracion.js` lee `config/systems.json` (21 sistemas: carpeta, extensiones, emulador,
  núcleo, BIOS que necesita y plantilla de comando), `config/emulators.json` (comando de cada emulador
  de Flathub y sus carpetas de núcleos, BIOS, perfiles de mando y `retroarch.cfg`),
  `config/biblioteca.json` (carpetas de juegos y medios) y `config/gamepad-map.json` (qué hace cada
  control del mando y qué código de Linux es cada uno en los mandos estándar). `~` es la carpeta del
  usuario y una ruta relativa parte de la raíz del repositorio.
- `core/escaner/escaner.js` recorre `roms/<carpeta>/` hasta tres niveles, filtra por extensión,
  limpia el nombre (quita paréntesis y corchetes salvo el número de disco, y los guiones bajos) y
  guarda el resultado en `biblioteca.json` de la carpeta de datos. Un sistema se vuelve a leer solo si
  cambió la fecha de alguna de sus carpetas. `core/biblioteca.js` lo convierte en lo que dibuja la
  interfaz (el id de un juego es `<sistema>/<archivo>`) y bloquea cualquier id que salga de la
  carpeta de su sistema.
- `core/lanzador/lanzador.js` arma el comando reemplazando `{emulador}`, `{nucleo}` y `{juego}`, sin
  shell (los espacios del nombre no importan). Antes de lanzar comprueba que existan el juego, el
  programa, la app de Flathub, el núcleo y, si el sistema la pide, una de sus BIOS (sin BIOS,
  SwanStation deja la pantalla en negro sin cerrarse); si algo falta, lanza `ErrorLanzamiento` con un
  mensaje para el usuario. Un emulador que sale con error en los primeros 8 s no abrió el juego y
  también se avisa. `main.js` escribe antes en RetroArch la combinación para salir
  (`retroarch-cfg.js`) y los perfiles de los mandos, deja ver «Abriendo…» 1.2 s, oculta la ventana,
  espera a que el emulador cierre y la vuelve a mostrar con foco (encima de todo durante 300 ms, como
  pide la tabla de riesgos; también al abrir la app). `core/registro.js` anota cada lectura,
  lanzamiento, mando y error en `registros/neo-arcade.log`.
- `core/entrada/` lee los mandos (ajuste 4). `lector-mandos.py` (solo biblioteca estándar de Python)
  abre los dispositivos de entrada que son mandos, consulta el rango real de cada eje y escribe una
  línea JSON por suceso; va aparte porque Node no puede hacer esa consulta (ioctl) ni esperar a varios
  dispositivos sin ocupar un hilo por cada uno. `mandos.js` lo arranca (y lo reinicia si se cae),
  elige el perfil de cada mando (el estándar si tiene `BTN_SOUTH`, o el que se guardó en
  `mandos.json`), y entrega acciones, controles pulsados y sucesos crudos. `traductor.js` lleva ejes y
  botones a controles con nombre, con margen para que una palanca en el borde no parpadee;
  `navegacion.js` los convierte en acciones y repite las direcciones (380 ms, luego cada 90 ms).
  `perfil-retroarch.js` escribe el perfil de RetroArch de cada mando configurado aquí con la
  numeración de botones y ejes de RetroArch (`udev_joypad.c`). Con un emulador abierto, el mando no
  llega a la interfaz.
- `core/medios/` une `gamelist.xml` (en `media/<sistema>/`, o en `roms/<sistema>/` como lo deja
  Skraper) y las carpetas comunes de medios con la biblioteca, por ruta de archivo. `<thumbnail>` es
  la carátula y `<image>` la captura; si solo hay `<image>`, es la carátula. Los medios llegan a la
  página por el protocolo `medio://` (`servidor.js`, con rangos para los vídeos), que se registra
  antes de que la app esté lista y solo sirve archivos de las carpetas de medios y de juegos; la CSP
  de `app/index.html` lo permite para imágenes y vídeo.
- `core/almacenamiento/` guarda `datos-usuario.json` (favoritos, recientes, último juego por sistema,
  último sistema, perfil y ajustes), juntando los cambios seguidos y escribiendo aparte y renombrando.
  Lo que manda la interfaz se limpia antes de guardarse; al cerrar la app se escribe lo pendiente.
- `scripts/empaquetar.sh` copia el motor de `node_modules/electron/dist`, renombra el ejecutable y
  pone la app en `resources/app`, que Electron carga en lugar de su app de ejemplo. En la MP80,
  `chrome-sandbox` necesita dueño root y permiso 4755 (lo hará `install.sh` en la fase 8).

## Ajustes al plan (decididos con el usuario el 2026-10-20)

1. **Dónde se desarrolla.** En Debian dentro de WSL 2, en la PC de trabajo, con las ventanas gráficas
   de WSLg; el repositorio y el Debian viven en C: (el externo D: se descartó). Ahí se
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
   mismas acciones. La fase 4 estuvo en pausa hasta que el usuario pidió hacerla el 2026-10-20; como
   no hay controles físicos, se probó con mandos virtuales en la MP80. Todo se sigue pudiendo usar con
   teclado y sin ratón.
4. **Controles.** El mando se lee en el núcleo (dispositivos de entrada de Linux) y no en la interfaz,
   para cubrir tableros que se presentan como teclado, pasar del tope de 4 controles de Chromium y
   seguir escuchando con el emulador abierto. Una pantalla «Configurar control» mapea la primera vez
   cada control desconocido; el mapeo se guarda por control en la carpeta de datos y Neo Arcade lo
   escribe en la configuración de cada emulador antes de lanzar. Ajustes permite emparejar controles
   Bluetooth, y el instalador agrega xpadneo y xone para Xbox. **Hecho en la fase 4**: lectura,
   «Configurar control», «Probar control» y los perfiles de RetroArch. **Falta**: emparejar por
   Bluetooth desde Ajustes (la MP80 no tiene BlueZ instalado), xpadneo y xone (van en el instalador de
   la fase 8) y escribir el mapeo en Dolphin y PPSSPP (hoy usan su propia detección de mandos).
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
   letras va a 26 px y se parte («HEDGEHO G», «FIGHTE R II», «BONK ADVENTUR E») por
   `word-break: break-word`. Así lo hace el prototipo y se reprodujo tal cual; si se ajusta, lo decide
   el usuario. Propuesta con captura en `docs/pruebas-fase2/propuesta-titulos-sin-cortar.png`: achicar
   la letra solo cuando la palabra más larga no cabe en el ancho de la portada (a 0.72 em por letra
   de Bungee). En la pantalla de lanzamiento, un título muy largo se parte en líneas que tocan los
   bordes; la propuesta es un ancho máximo de 1600 px.
6. **Pantallas nuevas de las fases 2 y 3, pendientes de aprobación.** Los 10 íconos de sistema que no
   traía el prototipo (`app/iconos.js`, captura en `docs/pruebas-fase2/02-barra-al-final.png`); el
   aviso de biblioteca vacía («Todavía no hay juegos», `04-biblioteca-vacia.png`); y la variante de
   error de la pantalla de lanzamiento (`docs/pruebas-fase3/03-falta-nucleo.png`). El aviso de un
   sistema vacío es el del prototipo, a 20 px tal cual.
7. **Pantallas nuevas de las fases 4, 5 y 6, pendientes de aprobación.** Todas siguen el estilo de los
   diálogos del prototipo:
   - Fase 4: «Probar control» y «Configurar control» (`docs/pruebas-fase4/08-…`, `13-…`, `15-…`) y la
     fila de Control en Configuración. Con el mando, el pie muestra la leyenda del prototipo (A, B,
     MENÚ).
   - Fase 5: la carátula en la ficha ocupa el lugar del ícono del mando (72×72); la vista previa
     muestra captura y vídeo completos dentro del recuadro actual, con franjas negras. El ajuste 7
     permitía rediseñar ese recuadro para un vídeo más grande; no se hizo, queda como opción.
   - Fase 6: Favoritos, Recientes y la búsqueda como entradas al final de la barra (al final para no
     mover los sistemas; LB desde ALL GAMES llega a ellos); «Buscar» con teclado en pantalla;
     Configuración en filas con brillo neón (dos niveles: alto y sin brillos), animaciones, volumen,
     cuatro colores de la paleta del prototipo (azul, magenta, violeta, naranja), combinación para
     salir y RESTABLECER con confirmación; «Última partida» en Detalles (`docs/pruebas-fase6/`).
   - El perfil Peques (ajuste 9) no se hizo: sigue como propuesta sin confirmar. El perfil se guarda,
     siempre «normal».

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
- No descargues ni sugieras descargar ROMs. Si falta un juego para probar, pídelo. Para probar sin
  juegos del usuario se usan programas y medios escritos aquí (`scripts/juego-de-prueba-snes.mjs`,
  `scripts/medios-de-prueba.mjs`), en carpetas aparte, nunca en `roms/` ni `media/`.
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
