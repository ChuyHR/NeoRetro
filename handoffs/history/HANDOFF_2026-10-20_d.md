# Handoff del 2026-10-20 (fases 2 y 3)

Antes de este, el mismo día: `history/HANDOFF_2026-10-20.md` (viabilidad, ajustes al plan, fase 0),
`history/HANDOFF_2026-10-20_b.md` (Debian en la MP80) y `history/HANDOFF_2026-10-20_c.md` (fase 1).

## Resumen

Las fases 2 y 3 están construidas y verificadas con una biblioteca de archivos vacíos y un emulador
falso, en la laptop y en la MP80. **Falta la prueba de aceptación con juegos reales**: el usuario tiene
que copiar un juego de arcade, uno de SNES y uno de PlayStation en `~/NeoRetro/roms/<sistema>/` de la
MP80. No se descargó ni se sugirió descargar ningún juego. Por instrucción del usuario («continúa
hasta la fase 3») el trabajo se detiene aquí.

## Decisiones del usuario

- «Continúa hasta la fase 3»: hacer las fases 2 y 3 y detenerse.
- Permiso permanente para llevar el proyecto a la MP80, instalar ahí lo necesario y abrir la app o
  los emuladores en su TV sin preguntar. Reiniciarla o apagarla sí se avisa antes.
- «Configura la MP80 para que no se suspenda»: hecho con `scripts/instalador/sin-suspension.sh`.
  Además de la suspensión, quita el apagado de pantalla y el bloqueo de sesión; si el usuario quiere
  que la pantalla sí se apague, se quita esa parte.
- El usuario vio cortada en su laptop la ventana de la simulación. Era la herramienta de prueba, que
  emula 1920×1080; la app normal se adapta (`docs/pruebas-fase2/pantalla-1366x768.png`). La
  herramienta ahora muestra la página reducida a la ventana.

## Lo que se hizo

- **Configuración**: `config/systems.json` (21 sistemas con las carpetas del plan, extensiones,
  emulador, núcleo y plantilla de comando), `config/emulators.json` (Flathub) y
  `config/biblioteca.json`. `core/configuracion.js` los lee; `NEO_ARCADE_CONFIG`, `NEO_ARCADE_ROMS` y
  `NEO_ARCADE_DATOS` apartan las pruebas de lo real.
- **Fase 2**: `core/escaner/escaner.js` (recorrido de tres niveles, limpieza de nombres que conserva
  el disco, caché por fecha de carpeta) y `core/biblioteca.js` (datos para la interfaz, sin sistemas
  vacíos, bloqueo de rutas fuera de su carpeta). La interfaz pide la biblioteca por
  `core/preload.cjs`. Diez íconos nuevos en `app/iconos.js`. Aviso nuevo de biblioteca vacía.
- **Fase 3**: `core/lanzador/lanzador.js` (comando sin shell, comprobación de juego, programa, app de
  Flathub y núcleo, mensajes para el usuario), ciclo en `core/main.js` (1.2 s de «Abriendo…»,
  ocultar, esperar, volver con foco) y `core/registro.js`. La pantalla de lanzamiento tiene una
  variante de error con «VOLVER AL INICIO».
- **Herramientas**: `npm run simulacion` (app real con biblioteca y emulador falsos),
  `npm run medir-fps`, `scripts/instalar-nucleos.sh` (CRC del servidor de libretro, que es del núcleo
  descomprimido) y `scripts/configurar-retroarch.sh`. `preparar-desarrollo.sh` llama a los dos
  scripts después de instalar los emuladores.
- 39 pruebas: escáner (incluida la de 500 archivos), biblioteca, lanzador (con un emulador que sale
  con código 3), configuración real y estado.

## Cómo se verificó

- `npm test`: 39 en verde, en la laptop y en la MP80.
- `npm run simulacion` en la laptop y en la TV de la MP80 (Xfce): ventana oculta 1.2 s después de
  Enter; de vuelta 6 a 8 ms después de cerrarse el emulador y con foco a los 10 a 28 ms; flechas
  funcionando al volver; el port corre como programa propio; avisos de núcleo, emulador y juego
  faltante en pantalla y en el registro. Resultado en `docs/pruebas-fase3/resultado.txt`.
- En la MP80, con la configuración real y un archivo vacío como juego, los 21 sistemas pasan la
  comprobación previa (Flathub instalado, 11 núcleos presentes).
- `npm run comparar`: sin cambios respecto a la fase 1.
- Fluidez en la MP80 (`docs/pruebas-fase1/fps-mp80.txt`): a 75 Hz, unos 66 cuadros por segundo con
  cuadros perdidos; a 60 Hz, 59 cuadros por segundo con 7 u 8 perdidos en 8.6 s.

## Errores propios de esta sesión

- Ajusté por mi cuenta la letra de las portadas para no partir palabras y el ancho del título de
  lanzamiento, aunque la diferencia 5 de `CLAUDE.md` dice que eso lo decide el usuario. Lo revertí y
  quedó como propuesta con captura (`docs/pruebas-fase2/propuesta-titulos-sin-cortar.png`).
- Un `timeout` sobre `flatpak run` dejó RetroArch abierto en la TV de la MP80 durante las primeras
  mediciones de fluidez. Se cerró con `kill -INT` y se repitieron las mediciones.

## Lo que espera al usuario

1. **Tres juegos suyos** (arcade, SNES y PlayStation) en `~/NeoRetro/roms/arcade/`, `snes/` y `psx/`
   de la MP80, para la prueba de aceptación real. PlayStation necesita además la BIOS
   (`scph5501.bin` u otra) en `~/.var/app/org.libretro.RetroArch/config/retroarch/system/`; también es
   del usuario y no se descarga.
2. **Revisión** de las fases 1, 2 y 3, de los 10 íconos nuevos, del aviso de biblioteca vacía y de la
   pantalla de error (diferencia 6 de `CLAUDE.md`).
3. **Decidir** la propuesta de títulos (diferencia 5) y si la fase 8 fija la salida a 60 Hz.
4. Pendientes viejos de la MP80: probar Windows desde GRUB y que el menú vuelva a aparecer; formatear
   la memoria USB (guarda la contraseña del Wi-Fi); opcional, apagar el uso compartido de conexión en
   la laptop.

## Lo que sigue cuando haya juegos

- Abrir cada uno desde Neo Arcade en la TV, salir con Esc (una pulsación) o Select + Start y medir la
  vuelta (meta: menos de 2 s). Revisar el registro `~/.config/neo-arcade/registros/neo-arcade.log`
  (carpeta de datos de Electron; confirmar el nombre real allá).
- Mostrar al usuario cuántos juegos encontró por sistema (lo pide el prompt de la fase 2).
- Dolphin y PPSSPP no tienen todavía una tecla de salida configurada; con teclado, PPSSPP sale desde
  su menú (Esc) y Dolphin cerrando su ventana. Se resuelve con el ajuste 5 (misma tecla en los tres).

## Observaciones

- C: de la laptop tiene 12 GB libres; el aviso al usuario es por debajo de 10 GB.
- El carrusel no da la vuelta visualmente: en el primer juego no hay portadas a la izquierda, aunque
  la navegación sí da la vuelta. Así es el prototipo.
- Con la biblioteca vacía siguen a la vista la barra sin botones y el menú de acciones; Enter no hace
  nada.
