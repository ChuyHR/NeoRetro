# Handoff del 2026-10-20 (fases 4, 5 y 6)

Antes de este, el mismo día: `history/HANDOFF_2026-10-20.md` (viabilidad, ajustes al plan, fase 0),
`_b` (Debian en la MP80), `_c` (fase 1) y `_d` (fases 2 y 3).

## Resumen

Las fases 4, 5 y 6 están construidas y verificadas en la laptop y en la TV de la MP80. **Las fases 1 a
6 esperan la revisión del usuario.** La fase 7 no se empezó. El usuario pidió: «encárgate del punto 1
(los juegos de prueba) sin depender de mí y continúa con las fases 4, 5 y 6».

## Decisiones del usuario y cómo se interpretaron

- «Encárgate del punto 1 completamente sin depender de mí»: conseguir juegos para la prueba real.
  Se intentó buscar juegos de distribución libre (homebrew, las ROM liberadas por sus dueños en
  mamedev.org) y compilar OpenBIOS para PlayStation; el filtro de seguridad de Claude Code bloqueó las
  tres cosas («Third-Party Attack» y «Untrusted Code Integration»). No se rodeó el bloqueo: tampoco
  con el navegador que el usuario ofreció después («si es necesario puedes usar mi navegador»), porque
  sería saltárselo. Se resolvió con un programa propio de SNES escrito aquí
  (`scripts/juego-de-prueba-snes.mjs`). Arcade y PlayStation siguen sin probarse con un juego real.
- Firefox apareció abierto en la TV de la MP80 durante la sesión (probablemente lo abrió el usuario
  para lo anterior). No se usó ni se cerró; Neo Arcade ahora toma el foco al abrir.
- «Continúa con las fases 4, 5 y 6»: la fase 4 estaba en pausa por el ajuste 3; se tomó como la orden
  de hacerla. Sin control físico, se probó con mandos virtuales (uinput) en la MP80.

## Lo que se hizo

- **Fase 3, cierre**: prueba real en la TV con RetroArch (Esc vuelve en 375 ms). Aviso de BIOS faltante
  antes de abrir el emulador (`bios` en `systems.json`) y de juego que no abre (emulador que sale con
  error en los primeros 8 s). Neo Arcade toma el foco al abrir.
- **Fase 4**: `core/entrada/` (lector en Python, traductor, repetición, mandos, perfiles de RetroArch),
  `config/gamepad-map.json`, «Probar control», «Configurar control», leyenda del mando en el pie,
  Inicio y Fin para saltar de letra. `configurar-retroarch.sh` copia los 439 perfiles de mando de
  RetroArch a una carpeta editable.
- **Fase 5**: `core/medios/` (gamelist.xml, carpetas comunes, protocolo `medio://` con rangos),
  carátulas en carrusel, ficha y Detalles, captura y vídeo en la vista previa, respaldo cuando algo no
  carga, precarga de vecinos. `scripts/medios-de-prueba.mjs` dibuja medios propios.
- **Fase 6**: `core/almacenamiento/`, filtros Favoritos, Recientes y búsqueda al final de la barra,
  «Buscar» con teclado en pantalla, Configuración por filas (CRT, neón, animaciones, volumen, tema,
  combinación para salir, mando, Restablecer), restauración de la sesión al abrir, última partida en
  Detalles. El azul de acento pasó a `var(--acento)`.
- Pruebas en la TV: `scripts/prueba-en-tv.sh`, `prueba-mando-en-tv.sh`, `prueba-datos-en-tv.sh`, con
  `scripts/herramientas/mando-virtual.py` y `xwd-a-png.py`.

## Cómo se verificó

- `npm test`: 77 pruebas en verde.
- `npm run comparar`: la demostración sigue idéntica al prototipo (0.0 % salvo las dos zonas con
  cambios aprobados) después de cada fase.
- `npm run simulacion` (laptop): fases 2, 3, 5 y 6 con capturas en `docs/pruebas-fase*/`.
- TV de la MP80: fase 3 en `docs/pruebas-fase3/tv-mp80/`, fase 4 en `docs/pruebas-fase4/`, fase 5 con
  el programa de SNES y sus medios, fase 6 en `docs/pruebas-fase6/tv-mp80/` (tres favoritos y uno
  quitado; cuatro juegos en Recientes con el último primero; salir manteniendo Start; al cerrar y
  volver a abrir todo sigue donde estaba).

## Errores propios de esta sesión

- La primera prueba de «archivo dañado» usaba `/tmp`, que no existe para los emuladores de Flathub; el
  código 1 venía de eso. Ahora usa un archivo vacío en la carpeta personal.
- Un `pkill -f` con un patrón que aparecía en el propio comando cerró la sesión de SSH. Se usa el
  número de proceso o el patrón con corchetes (`mando-[v]irtual`).
- La prueba de repetición del mando dio una falsa alarma: 12 pasos en una lista de 11 juegos daban la
  vuelta y caían en el mismo juego. Se amplió la biblioteca de prueba a 26 juegos.
- El registro del protocolo `medio://` quedó después de una espera en `main.js`; Electron lo exige antes
  de que la app esté lista. Ahora va arriba de todo.
- View desde un sistema llevaba a «todos» en lugar del primer filtro. Corregido, con su prueba.

## Lo que espera al usuario

1. **Revisión** de las fases 1 a 6 y de las pantallas nuevas (diferencias 6 y 7 de `CLAUDE.md`).
2. **Decidir**: la propuesta de títulos (diferencia 5), los filtros al final de la barra, si el
   recuadro de vista previa se agranda para el vídeo (ajuste 7) y si la fase 8 fija 60 Hz.
3. **Un juego de arcade y uno de PlayStation suyos** (y la BIOS de PlayStation) para la última prueba
   real; o, si prefiere, permiso explícito en la configuración de Claude Code para que yo baje
   homebrew de distribución libre.
4. Pendientes viejos de la MP80: probar Windows desde GRUB; formatear la memoria USB (guarda la
   contraseña del Wi-Fi); opcional, apagar el uso compartido de conexión en la laptop.

## Lo que sigue (fase 7, sin empezar)

- Rendimiento: carrusel a 60 fps con 3.000 juegos y movimiento rápido (`docs/pruebas-fase1/fps-mp80.txt`
  tiene el diagnóstico: el costo está en volver a dibujar portadas que cambian de tamaño).
- Sonidos de navegación con el volumen de Configuración (ya se guarda), reloj real en la cabecera,
  animación de arranque y memoria tras 30 minutos.
- Pendientes de la fase 4: emparejar Bluetooth desde Ajustes, xpadneo y xone, y mapeo en Dolphin y
  PPSSPP.

## Observaciones

- C: de la laptop tiene 12 GB libres (aviso al usuario por debajo de 10 GB).
- La MP80 quedó con RetroArch en `input_quit_gamepad_combo = "4"` (Select + Start), un solo Esc y
  sus perfiles de mando en la carpeta editable. Se borró el perfil de la palanca virtual de prueba
  (los perfiles de RetroArch son globales y no debe quedar para una palanca real del mismo modelo;
  `prueba-mando-en-tv.sh` también lo borra al empezar). Las carpetas `~/juegos-de-prueba*` son datos de
  prueba y se pueden borrar sin problema.
- El reloj de la cabecera ya es real (se actualiza al pintar); la fase 7 pide que avance solo.
