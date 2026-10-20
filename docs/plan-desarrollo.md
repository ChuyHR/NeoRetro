# Plan de desarrollo: frontend Neo Arcade con Claude Code

Oct 20, 2026 · @manuel

> Copia sin cambios del plan entregado el 2026-10-20. Los ajustes decididos con el usuario ese mismo
> día (desarrollo en WSL, teclado primero, cualquier PC y pantalla, cambios al diseño) y las rutas
> reales (el prototipo está en `docs/referencia/NeoArcade.dc.html`) están en `CLAUDE.md` y mandan sobre este plan.

## Objetivo

El producto final es **Neo Arcade**: un frontend propio que arranca solo al encender la mini PC, muestra la pantalla que aprobamos (cabecera, barra de sistemas, carrusel de portadas, ficha, acciones, vista previa y pie de controles) y lanza el emulador correcto al pulsar Jugar, sin que el usuario vea nunca Windows, Linux ni los menús de los emuladores.

Está terminado cuando se cumplen las cinco cosas siguientes, todas con el control Xbox y sin teclado ni ratón:

1. La mini PC enciende y en menos de 30 segundos aparece Neo Arcade a pantalla completa.
2. Se puede recorrer cualquier sistema y cualquier juego de las carpetas reales de ROMs, con carátula, vídeo y datos.
3. Jugar abre el juego en pantalla completa; salir del juego con la combinación configurada devuelve al menú en el mismo punto.
4. Favoritos, recientes y ajustes se conservan entre reinicios.
5. Funciona igual con el perfil Jugador 1 y con el perfil Peques.

Uso personal: el proyecto no incluye ROMs comerciales; Claude Code solo trabaja con las copias que ya tengas en tus carpetas.

## Requisitos técnicos (la tecnología la elige Claude Code)

La tecnología concreta (lenguaje, motor de interfaz, forma de empaquetar la app) **la propone Claude Code en la fase 0**, después de revisar la mini PC, el prototipo aprobado y los requisitos de esta tabla; tú apruebas la propuesta antes de que escriba código. Debe comparar al menos tres caminos: reutilizar el prototipo web dentro de una app de escritorio (por ejemplo Electron o Tauri), rehacerlo en un motor como Godot 4, o adaptar un frontend existente (Pegasus, ES-DE) si puede reproducir el diseño. Cualquier opción vale si cumple todo lo siguiente.

| Requisito | Qué debe cumplir la tecnología elegida |
| --- | --- |
| Fidelidad al diseño | Reproducir el prototipo aprobado tal cual a 1920×1080 y escalarlo a 1366×768, 1440p y 4K sin deformarse |
| Lanzar emuladores | Ejecutar RetroArch, Dolphin y PPSSPP con un juego, esperar a que cierren y volver al menú en el mismo punto |
| Mando | Control Xbox y tableros arcade USB, con detección de conexión y desconexión en caliente |
| Rendimiento | 60 fps al mover el carrusel con 3.000 juegos, arranque de la app en menos de 10 s, memoria estable |
| Medios | Carátulas, vídeo en bucle sin sonido y datos en formato gamelist.xml de EmulationStation |
| Persistencia | Favoritos, recientes, perfil y ajustes guardados en local, en un formato legible y fácil de respaldar |
| Sistema | Funcionar en Linux: el sistema final será un Debian mínimo dedicado solo a Neo Arcade (fase 8); mientras tanto se desarrolla en el sistema actual de la mini PC |
| Sin internet | Todo funciona desconectado: tipografías, medios y datos locales |
| Mantenible | Una sola persona, con ayuda de Claude Code, puede entenderlo y modificarlo; pocas dependencias |

Estructura orientativa del proyecto. Claude Code puede proponer otra según la tecnología elegida, pero debe mantener separados la interfaz, el lanzador, el escáner, el almacenamiento y la configuración:

```markdown
neo-arcade/
  CLAUDE.md               reglas del proyecto (sección más abajo)
  docs/
    referencia/           neo-arcade.html (el prototipo aprobado) y capturas
    decision-tecnica.md   la comparación y la tecnología elegida en la fase 0
  app/                    la interfaz, en la tecnología elegida
  core/                   lanzador de emuladores, escáner de juegos, almacenamiento
  config/
    systems.json          por sistema: carpeta, extensiones, emulador, núcleo, comando
    emulators.json        rutas de RetroArch, Dolphin y PPSSPP
    gamepad-map.json      botones del control por acción
  roms/<sistema>/         tus juegos (fuera de git)
  media/<sistema>/        carátulas, vídeos y gamelist.xml (fuera de git)
```

## Antes de empezar

Esto lo haces tú a mano una sola vez; toma alrededor de una hora. Claude Code no puede instalar RetroArch ni elegir tus juegos por ti.

- [ ] Instalar Git en la mini PC; lo demás (Node, Godot u otro) se instala cuando Claude Code proponga la tecnología en la fase 0.
- [ ] Instalar RetroArch y, desde su menú, descargar los núcleos: FinalBurn Neo, MAME, Mesen, Snes9x, Mupen64Plus-Next, mGBA, Genesis Plus GX, PicoDrive, Flycast, DuckStation (o SwanStation), Beetle PCE y Stella.
- [ ] Instalar Dolphin y PPSSPP como programas aparte y anotar la ruta de cada ejecutable.
- [ ] Configurar en RetroArch el control Xbox y la combinación para salir del juego (recomendado: Select + Start). Probar que abre y cierra un juego en pantalla completa.
- [ ] Crear la carpeta `neo-arcade` y dentro `roms/<sistema>/` con los nombres exactos: `arcade`, `neogeo`, `cps`, `nes`, `snes`, `n64`, `gb`, `gbc`, `gba`, `gamecube`, `mastersystem`, `megadrive`, `segacd`, `sega32x`, `gamegear`, `dreamcast`, `psx`, `psp`, `pcengine`, `atari2600`, `ports`. Copiar uno o dos juegos tuyos en tres carpetas distintas para las pruebas.
- [ ] Descargar [Skraper](https://www.skraper.net) y generar las carátulas, vídeos y `gamelist.xml` de esas tres carpetas, con salida en `media/<sistema>/`.
- [ ] Guardar el prototipo aprobado como `docs/referencia/neo-arcade.html` (el archivo que te entrego junto con este plan).
- [ ] Instalar Claude Code siguiendo [la guía oficial](https://docs.claude.com/en/docs/claude-code/overview), abrir una terminal dentro de `neo-arcade` y ejecutar `claude`.
- [ ] Iniciar el repositorio: `git init`, y crear `.gitignore` con `roms/`, `media/`, `node_modules/` y `dist/`.

Regla de trabajo con Claude Code: una fase por sesión, un `git commit` al terminar cada fase que funcione, y revisar cada comando que pida ejecutar antes de aceptarlo.

## Fases de desarrollo

Nueve fases en orden; cada una termina con una prueba que se hace con el control en la TV. Si la prueba falla, no se pasa a la siguiente. Trabajando por las tardes, el total ronda dos a tres semanas.

| Fase | Qué construye Claude Code | Prueba de aceptación | Tiempo |
| --- | --- | --- | --- |
| 0. Base del proyecto | Compara tecnologías, propone una y, tras tu aprobación, crea el proyecto base: ventana a pantalla completa, lienzo 1920×1080 escalado, estructura de carpetas, CLAUDE.md | `docs/decision-tecnica.md` aprobado por ti; la app abre a pantalla completa con el texto Neo Arcade y Esc la cierra | 2 h |
| 1. Portar la interfaz | Reproduce el prototipo en componentes separados, con los datos de ejemplo actuales y la navegación por teclado | La pantalla es idéntica al prototipo aprobado; se recorre todo con flechas y Enter | 1 día |
| 2. Biblioteca real | El escáner lee `roms/<sistema>/` según `systems.json`, limpia nombres de archivo y guarda una caché JSON; la interfaz muestra esos juegos | Aparecen tus juegos reales por sistema; con 500 archivos tarda menos de 2 s | 1 día |
| 3. Lanzador | El lanzador arma el comando por sistema, oculta la ventana, espera a que el emulador cierre y vuelve al mismo juego | Jugar abre un juego en RetroArch a pantalla completa; Select + Start vuelve al menú en menos de 2 s | 1 día |
| 4. Mando | Lectura del mando con el mapeo de Xbox, repetición al mantener, LB/RB sistemas, LT/RT saltar letra, Start ajustes; pantalla de lanzamiento | Toda la prueba de la fase 3 se repite sin tocar el teclado | 1 día |
| 5. Medios y datos | Lee `gamelist.xml` y `media/` (carátula, vídeo, descripción, año, género, jugadores); vídeo en la vista previa tras 1 s quieto; portada original cuando falte imagen | Los juegos escrapeados muestran su carátula y vídeo; los demás, la portada de reemplazo | 1–2 días |
| 6. Persistencia | Favoritos, recientes, último juego por sistema, ajustes y perfil guardados en JSON; filtros Favoritos y Recientes; ficha de detalles | Reinicias la app y todo sigue donde estaba | 1 día |
| 7. Pulido | Transiciones del carrusel, sonidos de navegación, reloj real, arranque con animación, rendimiento a 60 fps con 3.000 juegos | Sin tirones al mover el carrusel rápido; memoria estable tras 30 min | 1–2 días |
| 8. Sistema dedicado | Linux mínimo (Debian sin escritorio) dedicado a Neo Arcade: instalación desde USB, emuladores y mandos configurados por script, arranque directo a la app, apagado desde el menú y guía de instalación | Instalas desde USB en la mini PC; enciende y en menos de 20 s estás en el menú, sin ver ningún texto del sistema; los juegos de la fase 3 funcionan igual | 2 días |

Después de la fase 8 quedan como extras opcionales: perfil Peques con lista blanca de juegos, soporte de 4 jugadores, tema de colores por emulador y la versión para Android TV.

## Prompts para Claude Code

Uno por fase, en orden. Pega el texto tal cual al iniciar la sesión; al terminar, pídele siempre "haz commit con un mensaje claro".

**Fase 0**

```markdown
Vamos a construir Neo Arcade, un frontend de emulación para esta mini PC conectada a una TV, controlado con mando Xbox.
Antes de escribir código, tú eliges la tecnología. Haz esto:
1. Revisa esta máquina: sistema operativo, CPU, RAM, GPU y qué tiene instalado (node, python, godot, etc.).
2. Abre docs/referencia/neo-arcade.html: es el diseño final aprobado y debe reproducirse tal cual, con sus animaciones y navegación por mando.
3. Lee los requisitos: fidelidad al diseño a 1920x1080 escalable; lanzar RetroArch, Dolphin y PPSSPP con un juego, esperar a que cierren y volver al menú; mando Xbox y tableros USB con conexión en caliente; 60 fps con 3.000 juegos; carátulas, vídeo en bucle y datos en formato gamelist.xml de EmulationStation; favoritos, recientes y ajustes guardados en local; arranque como única aplicación al encender; funcionar sin internet; pocas dependencias y código que una persona pueda mantener contigo.
4. Compara al menos tres caminos: reutilizar el prototipo web dentro de una app de escritorio (Electron, Tauri u otro), rehacerlo en un motor como Godot 4, o adaptar un frontend existente (Pegasus, ES-DE). Para cada uno: esfuerzo, rendimiento en esta máquina, facilidad para lanzar emuladores y leer el mando, riesgos.
5. Escribe docs/decision-tecnica.md con la tabla comparativa y tu recomendación justificada, incluyendo la estructura de carpetas que propones.
El sistema operativo final será un Linux mínimo (Debian sin escritorio) dedicado solo a Neo Arcade, aunque ahora desarrollemos en el sistema actual de esta máquina: la tecnología que elijas debe funcionar bien en Linux.
No instales nada ni crees el proyecto todavía. Detente y espera mi aprobación.
```

**Fase 0, segundo prompt (cuando apruebes la propuesta)**

```markdown
Apruebo la tecnología de docs/decision-tecnica.md. Crea el proyecto base con ella en esta carpeta.
La app debe abrir a pantalla completa, sin bordes ni menú, fondo #050914, y cerrarse con Esc solo en desarrollo.
La interfaz es un lienzo fijo de 1920x1080 que se escala para caber en cualquier pantalla manteniendo la proporción.
Crea la estructura de carpetas que propusiste, separando interfaz, lanzador, escáner, almacenamiento y config/.
Deja un comando para ejecutar en desarrollo y otro para generar la versión final; dime cuáles son.
Crea el archivo CLAUDE.md con el contenido que te paso a continuación. Cuando la app muestre la ventana con el texto NEO ARCADE, detente.
```

**Fase 1**

```markdown
Reproduce docs/referencia/neo-arcade.html en la tecnología elegida, dividido en piezas separadas: cabecera, barra de sistemas, carrusel, ficha del juego, menú de acciones, vista previa, ficha de detalles, configuración y pantalla de lanzamiento.
Conserva exactamente la misma apariencia, colores, tipografías, medidas, animaciones y navegación por teclado del prototipo; no rediseñes nada.
Mantén los datos de ejemplo en un solo archivo, para reemplazarlos después por la biblioteca real.
Las tipografías deben guardarse dentro del proyecto, porque la máquina puede no tener internet.
Al terminar, abre la app y compara con el prototipo lado a lado; corrige cualquier diferencia visual.
```

**Fase 2**

```markdown
Crea config/systems.json con una entrada por sistema: id, nombre visible, carpeta en roms/, extensiones de archivo, emulador, núcleo de RetroArch y plantilla de comando.
Usa estas carpetas e ids: arcade, neogeo, cps, nes, snes, n64, gb, gbc, gba, gamecube, mastersystem, megadrive, segacd, sega32x, gamegear, dreamcast, psx, psp, pcengine, atari2600, ports.
Escribe el módulo escáner: recorre roms/<sistema>/, filtra por extensión, limpia el nombre (quita paréntesis de región, guiones bajos y extensión) y guarda la biblioteca en una caché en la carpeta de datos del usuario. Debe tardar menos de 2 segundos con 500 archivos y volver a escanear solo si cambió la carpeta.
Conecta la biblioteca con la interfaz y reemplaza los datos de ejemplo. Un sistema sin juegos no debe aparecer en la barra.
Prueba con mis carpetas reales y muéstrame cuántos juegos encontró por sistema.
```

**Fase 3**

```markdown
Crea config/emulators.json con las rutas de RetroArch, Dolphin y PPSSPP (pregúntame las rutas, no las inventes).
Escribe el módulo lanzador: al recibir Jugar arma el comando desde systems.json (ejemplo RetroArch: retroarch -f -L <núcleo> "<ruta del juego>"), oculta la ventana de Neo Arcade, ejecuta el emulador, espera a que termine y vuelve a mostrar la ventana con el mismo juego seleccionado y el foco recuperado.
Muestra la pantalla de lanzamiento del prototipo mientras arranca el emulador y un mensaje claro si el ejecutable o el núcleo no existen.
Registra cada lanzamiento en un archivo de log con fecha, comando y código de salida.
Prueba con un juego de arcade, uno de SNES y uno de PlayStation.
```

**Fase 4**

```markdown
Implementa la lectura del mando con el mapeo de config/gamepad-map.json para control Xbox: cruceta y stick izquierdo navegan, A selecciona, B vuelve, X favorito, Y busca, LB/RB cambian de sistema, LT/RT saltan de letra, Start abre ajustes, View cambia de filtro.
Al mantener una dirección, repite cada 90 ms después de 380 ms. Ignora el mando mientras un emulador está abierto y detecta conexión y desconexión en caliente.
Añade una pantalla de prueba de botones en Ajustes que muestre qué botón se pulsa.
Toda la app debe poder usarse sin teclado ni ratón; verifica cada pantalla.
```

**Fase 5**

```markdown
Lee media/<sistema>/gamelist.xml (formato EmulationStation) y los archivos de media/<sistema>/: carátula, vídeo, captura, descripción, año, desarrollador, género y jugadores. Une esos datos con la biblioteca por ruta de archivo.
Muestra la carátula en el carrusel y en la ficha; en la vista previa, reproduce el vídeo en bucle y sin sonido cuando el juego lleva 1 segundo seleccionado, y la captura mientras tanto.
Si falta la carátula, genera la portada de reemplazo del prototipo (fondo con el color del sistema y el título). Nunca dejes imágenes rotas.
Carga las imágenes de forma diferida para que el carrusel no se trabe con 3.000 juegos.
```

**Fase 6**

```markdown
Escribe el módulo de almacenamiento: guarda en la carpeta de datos del usuario, en un formato legible, favoritos, recientes (últimos 50 con fecha), último juego seleccionado por sistema, perfil activo y ajustes (intensidad del neón, efecto CRT, animaciones, volumen, color del tema, combinación para salir).
Conecta Favoritos, el filtro de Recientes, la ficha de Detalles y la pantalla de Configuración del prototipo con ese almacenamiento.
Al abrir la app debe restaurarse el último sistema y juego seleccionados.
Añade un botón de Restablecer en Configuración.
```

**Fase 7**

```markdown
Optimiza el rendimiento: el carrusel solo debe dibujar las 9 portadas visibles, las imágenes deben estar en caché y el movimiento rápido con el mando debe mantenerse a 60 fps con 3.000 juegos.
Añade sonidos cortos de navegación y selección (archivos propios, generados por código o libres de derechos), con volumen desde Ajustes.
Conecta el reloj y la fecha reales en la cabecera.
Añade la animación de arranque: logo Neo Arcade 2 segundos y entrada de la pantalla principal.
Mide el uso de memoria tras 30 minutos de uso simulado y corrige fugas si las hay.
```

**Fase 8**

```markdown
El producto final corre en un Linux mínimo dedicado solo a Neo Arcade. Prepara esa instalación:
1. Escribe docs/instalacion-linux.md con los pasos para instalar Debian estable mínimo (sin escritorio) en la mini PC desde una memoria USB, con un usuario "arcade" que inicia sesión solo.
2. Crea scripts/install.sh que, sobre esa instalación limpia: instale drivers de gráficos y sonido, Bluetooth para mandos, RetroArch con los núcleos de config/systems.json, Dolphin, PPSSPP, las dependencias de Neo Arcade y las tipografías; copie la app; configure el arranque directo a Neo Arcade como única aplicación en una sesión gráfica mínima, con reinicio automático si se cierra; oculte los mensajes de arranque y ponga el logo de Neo Arcade al encender; y desactive actualizaciones automáticas, suspensión y salvapantallas.
3. Añade en Ajustes las opciones Apagar y Reiniciar, y una combinación secreta del mando (LB + RB + Start durante 3 segundos) para salir a una terminal de mantenimiento.
4. Prueba todo primero en una máquina virtual y luego en la mini PC desde la USB.
5. Documenta en README.md cómo instalar en una mini PC nueva, cómo añadir juegos por USB o por carpeta compartida en red, y cómo actualizar la app.
```

## CLAUDE.md del proyecto

Este archivo va en la raíz de `neo-arcade`. Claude Code lo lee al empezar cada sesión, así que no hace falta repetirle estas reglas en cada prompt.

```markdown
# Neo Arcade

Frontend de emulación para una mini PC conectada a una TV, controlado con mando Xbox o tablero arcade.
Uso personal. La tecnología es la elegida en docs/decision-tecnica.md; no la cambies sin proponerlo primero.

## Diseño
- docs/referencia/neo-arcade.html es el diseño final aprobado. No cambies colores, tipografías, medidas,
  disposición ni animaciones sin que te lo pida explícitamente.
- La interfaz es un lienzo de 1920x1080 escalado; nunca uses scroll vertical en la pantalla principal.
- Todo debe poder usarse solo con mando. Cada elemento nuevo necesita estado de foco visible desde 3 metros.
- Textos de la interfaz en español, cortos y en lenguaje de usuario ("Jugar", no "Ejecutar emulador").

## Código
- Interfaz, lanzador de emuladores, escáner de juegos y almacenamiento viven en módulos separados,
  con una frontera clara entre ellos.
- Configuración en config/*.json; nada de rutas ni nombres de emuladores escritos dentro del código.
- Datos del usuario (favoritos, recientes, ajustes) en la carpeta de datos del usuario, en un formato legible.
- Sin dependencias nuevas salvo que sean imprescindibles; pregunta antes de añadir una.
- Registra errores en un archivo de log; la interfaz muestra mensajes claros, nunca pantallas en blanco.

## Juegos y emuladores
- Las carpetas roms/ y media/ son del usuario: nunca las modifiques, borres ni descargues contenido en ellas.
- No descargues ni sugieras descargar ROMs. Si falta un juego para probar, pídemelo.
- RetroArch se lanza con: retroarch -f -L <ruta del núcleo> "<ruta del juego>". Dolphin y PPSSPP con sus propios comandos de config/systems.json.

## Forma de trabajar
- Antes de tocar código, explica en 3 a 5 líneas qué vas a hacer.
- Cambios pequeños y probados; ejecuta la app y verifica antes de dar algo por terminado.
- Al terminar una tarea: resumen de lo hecho, cómo probarlo con el mando y un git commit con mensaje claro.
- Si algo del plan no se puede hacer en este sistema operativo, dilo y propone la alternativa más simple.
```

## Pruebas del producto final

Se hacen en la TV, con el control Xbox y la mini PC recién encendida. Todas deben pasar antes de dar el proyecto por terminado; cualquiera que falle vuelve a la fase que corresponde.

- [ ] Enciendo la mini PC y en menos de 30 segundos veo Neo Arcade, sin escritorio ni ventanas.
- [ ] La pantalla principal es igual al prototipo aprobado, con mis juegos reales y sus carátulas.
- [ ] Recorro los 21 sistemas con LB/RB; los sistemas sin juegos no aparecen.
- [ ] En el sistema con más juegos, mantengo la cruceta y el carrusel se mueve fluido; LT/RT salta de letra.
- [ ] Pulso Y, escribo con el teclado en pantalla y la lista se filtra.
- [ ] Jugar abre un juego de arcade, uno de SNES, uno de PlayStation y uno de GameCube; cada uno arranca a pantalla completa con sonido.
- [ ] Select + Start sale de cada juego y vuelve al menú en el mismo juego, en menos de 2 segundos.
- [ ] Marco tres favoritos, abro el filtro Favoritos y están los tres; quito uno y desaparece.
- [ ] El filtro Recientes muestra los cuatro juegos que abrí, el último primero.
- [ ] Cambio al perfil Peques: sin buscador ni datos técnicos, letras más grandes, y vuelve al reiniciar.
- [ ] Cambio color del tema, efecto CRT y animaciones en Configuración; reinicio y se conservan.
- [ ] Un juego con la ruta del emulador mal escrita muestra un mensaje claro y no cuelga la app.
- [ ] Desconecto el control y lo vuelvo a conectar: sigue funcionando sin reiniciar.
- [ ] Dejo la app abierta 30 minutos moviendo el carrusel: sin tirones ni aumento de memoria.
- [ ] Apago desde el menú y la máquina se apaga limpiamente.

## Riesgos y qué hacer si algo se traba

| Riesgo | Señal | Qué hacer |
| --- | --- | --- |
| El mando deja de responder al volver del emulador | Tras cerrar el juego, la cruceta no mueve nada | La ventana perdió el foco: pedir a Claude Code que la vuelva a enfocar al terminar el proceso (`win.focus()` y `win.setAlwaysOnTop(true)` un instante) |
| Juegos de GameCube o N64 lentos | Tirones y sonido entrecortado | No es del frontend: ajustar resolución interna en Dolphin o Mupen64Plus; si persiste, es límite del hardware de la mini PC |
| Nombres de archivo feos en la lista | "mslug" en lugar de "Metal Slug" | Normal en arcade: los nombres vienen del gamelist.xml de Skraper; escrapear esa carpeta y confirmar que el escáner une por ruta |
| Claude Code rediseña o "mejora" la interfaz por su cuenta | Colores o medidas distintas al prototipo | Recordarle el CLAUDE.md y pedir `git diff`; revertir con `git checkout -- src/` |
| La app consume mucha memoria con miles de juegos | Más de 1 GB tras minutos de uso | Fase 7: renderizar solo las 9 portadas visibles y usar miniaturas de carátula de 400 px |
| El arranque automático rompe el inicio del sistema | Pantalla negra al encender | Probar primero la fase 8 en una máquina virtual o desde una USB; mantener una combinación de teclas para salir a escritorio |
| El alcance crece (temas, Android TV, 4 jugadores) | Las fases se alargan y nada se termina | Todo lo que no está en las 9 fases va a una lista de extras para después de la primera versión |

Si una sesión de Claude Code se complica, lo más efectivo es cerrarla, hacer `git stash` o volver al último commit, y empezar una sesión nueva pegando solo el prompt de la fase actual más una línea con el error exacto.
