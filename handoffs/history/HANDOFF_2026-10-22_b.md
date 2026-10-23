# Handoff del 2026-10-22, noche (mejora visual de los juegos retro)

Antes de este: `history/HANDOFF_2026-10-22.md` (Game Stick en pausa, vuelta a Neo Arcade) y
`history/HANDOFF_2026-10-21.md`.

## Resumen

El usuario pidió analizar, probar, medir e integrar una mejora visual para los juegos retro: escalado,
shaders, aspecto y perfiles por juego. Puso una regla: nada sobre el sistema principal antes de
demostrarlo en un laboratorio aislado.

- **Laboratorio:** `visual-enhancement-lab/`. Corre RetroArch en la TV de la MP80 con una copia de la
  configuración y mide cuadros, GPU, CPU y memoria. Se probaron 10 perfiles con dos juegos:
  - Metal Slug (Neo Geo), la copia del usuario;
  - Nova the Squirrel (NES), un juego casero GPL.
- **Ganador:** «nitido», sharp-bilinear-simple sin escalado entero. Arregla los píxeles desiguales del
  escalado actual (×4.82 en Neo Geo a 1080p) sin achicar la imagen y sin costo medible.
- **Integrado e instalado en la MP80** para los 12 sistemas probados; los demás quedan en «original».
- **Verificado desde Neo Arcade:**
  - un juego de GBA con el perfil;
  - uno de Nintendo 64 sin él;
  - el fallback con un shader inexistente;
  - `retroarch.cfg` devuelto al cerrar;
  - 116 pruebas en verde en la MP80.

Documentos: `docs/visual-enhancement-analysis.md`, `docs/visual-enhancement-testing.md`,
`docs/visual-comparison.md` (con imágenes en `docs/visual-comparison/`) y `docs/visual-profiles.md`.

## Hallazgos que cambiaron el diseño

1. **RetroArch 1.22 no carga el shader desde un `.cfg`.** La clave `video_shader` se ignora («Stock
   GLSL shaders will be used»); el shader va con `--set-shader`. La primera medición entera salió sin
   shaders por eso y se repitió.
2. **RetroArch guarda al cerrar lo de un `--appendconfig`** en su `retroarch.cfg`, si
   `config_save_on_exit` está activo (`probar-fallas.sh`, caso 5). Neo Arcade lee esas claves antes del
   juego y las devuelve después (`leerClaves` y `restaurarClaves` en `retroarch-cfg.js`).
3. **FBNeo guarda la memoria de la máquina al cerrar**, y la demostración de la siguiente corrida
   cambia. El laboratorio borra sus partidas antes de cada corrida.
4. **Los mandos físicos de la MP80 cambiaban los cuadros** entre corridas: el estado de Nova avanzaba
   distinto. El laboratorio los apaga (`input_joypad_driver = "null"`) y maneja RetroArch por la red
   (`control-remoto.py`), sin crear un mando que Neo Arcade también leería.
5. **Con el driver Vulkan, RetroArch ignora los shaders GLSL.** Cada perfil trae `shader` (GLSL) y
   `shaderSlang`, y Neo Arcade elige según `video_driver`.

## Lo que cambió en la MP80

- Instalados con apt: `intel-gpu-tools` (para `intel_gpu_top`) y `wlr-randr` (cambiar el modo de la
  TV en Cage).
- `~/visual-enhancement-lab/`: el laboratorio con su trabajo y sus resultados. No deja nada fuera de esa
  carpeta; se puede borrar entera.
- `/opt/neo-arcade/resources/app`, actualizados:
  - `core/lanzador/visual.js` (nuevo) y `core/lanzador/retroarch-cfg.js`;
  - `core/main.js` y `core/configuracion.js`;
  - `config/visual.json` (nuevo) y `config/emulators.json`.

  Respaldo de los anteriores en `~/respaldo-neo-arcade-20261022-visual/`. Neo Arcade se reinició varias
  veces y quedó activo.
- La TV se pasó a 720p para medir y se regresó a 1920×1080 (comprobado con `wlr-randr`).
- `retroarch.cfg` de Neo Arcade: su huella no cambió en ninguna medición. Las opciones de núcleo
  (`FinalBurn Neo.opt`, `Mesen.opt`) conservaron su fecha, aunque RetroArch anotó que las guardaba; el
  laboratorio usa ahora una copia de esa carpeta.
- `~/NeoRetro/config/` quedó como estaba (`biblioteca.json`, `datos-usuario.json`, `mandos.json`): la
  copia de `visual.json` de la prueba de fallback se quitó.

## Descarga pendiente de decisión

La descarga que el usuario mandó a la MP80 terminó a las 17:43:
`~/descargas-media/M8Pro-20230822-v1.5--M8-20230420-release-V2.rar`, de 33 245 140 460 bytes, igual al
tamaño anunciado. No se abrió ni se descomprimió.

## Pendiente, en orden

1. **Que el usuario vea en la TV** el perfil «nitido» y diga si le gusta, o si prefiere «entero» o
   «crt-ligero» en algún sistema. Cómo cambiarlo está en `docs/visual-profiles.md`.
2. **Volver a armar la imagen USB del instalador**, con esta mejora y con la corrección del tablero del
   2026-10-21.
3. Lo que no se pudo medir:
   - la latencia de entrada (hace falta cámara o sensor);
   - 1440p y 4K (la TV no los ofrece);
   - otras GPU.
4. Qué hacer con el RAR descargado (preguntar).
5. Lo que sigue abierto de los handoffs anteriores:
   - confirmar la moneda y la palanca del tablero y el sonido en la TV;
   - el cable del mando de Xbox;
   - la revisión de las fases 1 a 8;
   - la skill (§19);
   - juegos de PlayStation, GameCube y PSP.

## Observaciones

- La prueba en Neo Arcade usa el mando virtual (`scripts/herramientas/mando-virtual.py`). No se debe
  matar con `pkill -f` y su nombre: el patrón también coincide con el comando de la sesión SSH que lo
  lanzó, y la cierra. Basta con cerrar su entrada.
- El juego seleccionado en Neo Arcade al reiniciar era «40 Winks» (Nintendo 64); con LB se pasó a GBA.
