# Decisión técnica de Neo Arcade

Fase 0 · 2026-10-20 · Propuesta, espera aprobación.

## Recomendación

**Electron 44 (Chromium 152) con JavaScript sin framework ni empaquetador, emuladores instalados
desde Flathub, y Debian 13 con Cage como sistema final.**

El prototipo aprobado corre dentro de Electron sin portar nada, se escala a otra pantalla sin
deformarse y reproduce el vídeo de Skraper con lo que trae integrado. El ciclo de lanzar RetroArch,
esperar a que cierre y volver al mismo juego funcionó al primer intento. Todo eso con una sola
dependencia (`electron`) y con el mismo motor de dibujo en cualquier PC donde se instale.

Las pruebas de este documento se hicieron en la PC de trabajo, dentro del Debian de WSL. La fluidez
medida ahí no cuenta para las metas del plan: se mide en la MP80.

## Lo que se probó

Pruebas en `Docs/pruebas-fase0/` (se repiten con `bash Docs/pruebas-fase0/correr.sh` en Linux);
capturas y mediciones en `Docs/pruebas-fase0/resultados/`. Debian 13 en WSL 2, gráficos Iris Xe a
través de WSLg, pantalla de 1366×768.

| Prueba | Electron 44.5.1 | WebKitGTK 2.54 (el motor de Tauri en Linux) |
| --- | --- | --- |
| Dibuja el prototipo sin cambios | Sí | Sí |
| Diferencia de píxeles contra la otra captura, a 1920×1080 | — | 0 % en barra, acciones, vista previa, pie y reflejos; 6.2 % en el carrusel y 3.1 % en la ficha |
| Escala a la pantalla de 1366×768 sin deformarse | Sí (escala 0.71) | No se probó |
| Vídeo H.264, VP9 y AV1 | Sí, integrado | Sí, con los complementos de GStreamer instalados aparte |
| Fluidez al avanzar el carrusel cada 120 ms durante 3 s | 39.9 a 41.8 fps; peor cuadro de 167 a 234 ms | 37 a 38.3 fps; peor cuadro de 346 a 369 ms |
| Arranque hasta la ventana lista | 2.3 a 9.2 s | No se midió |
| Lanzar RetroArch, esperar a que cierre y volver | Ventana visible 5 ms después del cierre, con foco y el mismo juego seleccionado | No se probó |

Lectura de los resultados:

- **Fidelidad.** Las diferencias entre los dos motores son de suavizado de bordes, de un píxel, en las
  portadas giradas en perspectiva y en el texto de la descripción (ver `diferencias.png`). A simple
  vista no se distinguen. La fidelidad no decide entre Electron y Tauri.
- **Fluidez.** Ningún motor llega a 60 fps aquí, ni siquiera con una GPU más potente que la de la
  MP80. Parte se debe a WSLg, que añade su propio compositor, pero también indica que el prototipo
  es pesado de animar: mueve posición y tamaño de las tarjetas, con sombras y brillos grandes. Eso
  confirma el ajuste 8 de `CLAUDE.md` (animar con `transform`).
- **Arranque.** Varió de 2.3 a 9.2 s entre corridas. El plan pide menos de 10 s en la MP80.

## Comparación

| | Electron | Tauri | Godot 4 | ES-DE o Pegasus |
| --- | --- | --- | --- | --- |
| Fidelidad al prototipo | El HTML y el CSS corren tal cual (probado) | Igual, salvo suavizado (probado) | Rehacer a mano cada degradado, sombra y giro | ES-DE: tema XML sin perspectiva por portada ni cabecera ilustrada. Pegasus: rehacer en QML |
| Esfuerzo de la fase 1 | Bajo: dividir el prototipo en piezas | Bajo en la interfaz, más configuración (Rust) | Alto | Medio, y el resultado es aproximado |
| Vídeo de Skraper (MP4 H.264) | Integrado (probado) | Depende de GStreamer en cada equipo (probado) | Solo Ogg Theora: habría que convertir todos los vídeos | Sí |
| Lanzar emuladores y volver | `child_process` de Node (probado) | `Command` de Rust (no probado) | `OS.create_process` | Integrado |
| Mando, cuando se retome la fase 4 | Node lee los dispositivos de entrada de Linux sin dependencias nuevas | Una biblioteca de Rust | Integrado, con mapeos de SDL | Integrado |
| Lo que hay que saber para mantenerlo | JavaScript y Node | Rust, Cargo, la CLI de Tauri y JavaScript | GDScript y el editor de Godot | Su formato de temas; el comportamiento no se cambia |
| Igual en cualquier PC | Sí: trae su propio motor de dibujo | No: usa el WebKitGTK de cada distribución (2.54 en Debian 13) | Sí | Sí |
| Costo principal | Disco (unos 250 MB) y memoria (cientos de MB); irrelevante con 16 GB | Más herramientas para una sola persona | Reescribir todo y convertir vídeos | No reproduce el diseño aprobado. Pegasus no tiene versión estable desde hace años |

Godot 4, ES-DE y Pegasus no se instalaron. Los descartan razones de diseño y de formato que están
documentadas, no su rendimiento.

## Decisiones que acompañan a la recomendación

1. **Interfaz en JavaScript sin framework ni empaquetador.** La pantalla es una sola, con unas cuantas
   ventanas encima, y el estado es chico. Cada pieza (cabecera, barra, carrusel, ficha, acciones, vista
   previa, detalles, configuración, lanzamiento) es un módulo que dibuja su parte y la actualiza. Lo
   que está en `app/` es lo que corre, sin paso de compilación. El motor de `support.js` y React del
   prototipo no se portan.
2. **Pruebas con el ejecutor integrado de Node** (`node --test`) para el escáner, el almacenamiento y
   la construcción de comandos del lanzador. Sin dependencias.
3. **Node 22.12 o posterior en desarrollo.** Electron 44 lo pide para instalarse; con el Node 20.19 de
   Debian avisa que no es compatible (aviso `EBADENGINE`), aunque se instaló. En la MP80 no se instala
   Node: la app empaquetada trae su propio motor.
4. **Empaquetado con un script propio**, sin herramientas extra: se copia el motor de Electron
   (`node_modules/electron/dist`) y la app en `resources/app`, que Electron carga en lugar de su app
   de ejemplo.
5. **Emuladores desde Flathub**: RetroArch (`org.libretro.RetroArch`), Dolphin
   (`org.DolphinEmu.dolphin-emu`) y PPSSPP (`org.ppsspp.PPSSPP`).
   - **Por qué.** PPSSPP no está en los repositorios de Debian 13, y el RetroArch de Debian (1.20.0)
     solo trae 7 núcleos, de los cuales mGBA es el único que usa el plan. Desde Flathub cada PC tiene
     las mismas versiones, sin depender de su distribución.
   - **Costo.** Descargas de 416 MB (RetroArch), 22 MB (Dolphin) y 36 MB (PPSSPP), más sus bases
     comunes (KDE 6.11 y Freedesktop 26.08). Hay que dar permiso de lectura a la carpeta de ROMs.
   - **Falta verificar en la fase 3.** El tamaño de RetroArch (785 MB instalado) sugiere que trae los
     núcleos, pero no está comprobado. Tampoco se probó el lanzamiento con `flatpak run` esperando a
     que cierre.
   - El RetroArch de Debian que se instaló para la prueba se quita al aprobar esto.
6. **Sistema final: Debian 13 con Cage 0.2.0** como sesión de quiosco. Cage muestra encima la ventana
   nueva y, al cerrarla, vuelve a la anterior (wiki de Cage), que es lo que necesita el lanzador.
   Electron bajo Cage no se probó, porque WSLg no es Cage; se prueba en la fase 8 o en la revisión
   temprana en la MP80.
7. **Flujo de desarrollo.** Claude Code sigue en Windows y el repositorio vive en
   `D:\UtilsDev\ArcadeRetro`. Todo lo de Linux corre en el Debian de WSL con
   `wsl -d Debian --exec bash -c '…'`, como se hizo en estas pruebas. Dos ajustes valen solo para
   WSL: `GALLIUM_DRIVER=d3d12`, porque sin él todo se dibuja por software, y `--no-sandbox`, porque
   en `/mnt/d` el archivo `chrome-sandbox` no puede tener el permiso que necesita. En la MP80 no se
   usa ninguno de los dos.

## Estructura de carpetas propuesta

```
ArcadeRetro/
  CLAUDE.md
  package.json            una dependencia: electron, con versión fija
  docs/
    referencia/           el prototipo (NeoArcade.dc.html, support.js, vendor/, README) y capturas
    plan-desarrollo.md
    decision-tecnica.md
    pruebas-fase0/
  app/                    la interfaz: lo que dibuja la ventana
    piezas/               un módulo por pieza de la pantalla
    fuentes/              las cinco tipografías, guardadas localmente
  core/                   el proceso principal de Electron, en Node
    entrada/              teclado hoy; mando cuando se retome la fase 4
    lanzador/
    escaner/
    almacenamiento/
  config/                 systems.json, emulators.json, gamepad-map.json
  scripts/                empaquetar.sh; install.sh en la fase 8
  roms/<sistema>/         fuera de git
  media/<sistema>/        fuera de git
  handoffs/
```

`Docs/` pasa a `docs/` con el prototipo en `docs/referencia/`. En Windows el cambio de mayúsculas se
hace en dos pasos con `git mv`, porque el disco no las distingue.

## Riesgos y lo que falta probar

- **Rendimiento real en la MP80.** Su GPU de 16 EU es el recurso más justo y no se ha medido. Una
  revisión temprana al cerrar la fase 1, desde una USB de Debian y sin tocar Windows, lo diría antes
  de construir encima (propuesta pendiente de respuesta).
- **Mayúsculas en los nombres de archivo.** `/mnt/d` no las distingue y la MP80 sí, así que un error
  de nombre no se vería hasta probar en real. Mitigación: nombres de archivo en minúsculas y sin
  acentos en el código.
- **Electron bajo Cage y RetroArch desde Flatpak.** Sin probar; quedan en las fases 3 y 8.
- **Requisitos mínimos.** Siguen siendo los propuestos en `CLAUDE.md`; se confirman en la MP80.

## Fuentes

- Godot, «Playing videos»: https://docs.godotengine.org/en/4.5/tutorials/animation/playing_videos.html
- Wiki de Cage: https://github.com/cage-kiosk/cage/wiki
- Wiki de Debian, RetroArch: https://wiki.debian.org/RetroArch
- Versiones de Debian 13 y de Flathub: consultadas el 2026-10-20 con `apt-cache policy` y
  `flatpak remote-info`.
