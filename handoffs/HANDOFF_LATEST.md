# Handoff del 2026-10-20 (fases 7 y 8, pruebas finales con la skill)

Antes de este, el mismo día: `history/HANDOFF_2026-10-20.md` (viabilidad, ajustes al plan, fase 0),
`_b` (Debian en la MP80), `_c` (fase 1), `_d` (fases 2 y 3) y `_e` (fases 4, 5 y 6).

## Resumen

La fase 7 está construida y verificada en la TV de la MP80. La fase 8 está escrita (instalador de la
consola, imagen USB, apagar, reiniciar y terminal de mantenimiento) **sin probar**: falta la prueba en
una máquina virtual y, después, en la MP80, que implica reiniciarla con permiso del usuario. **Las
fases 1 a 7 esperan la revisión del usuario.**

El usuario pidió probar su skill (`UtilsDev/skills/neo-arcade/skill.md`) con pruebas finales reales. Se
usó como lista de revisión. Lo que pedía y faltaba se implementó si cabía en el plan, y lo demás quedó
para decidir. El informe completo está en `docs/pruebas-finales/README.md`.

## Pedidos del usuario en esta sesión

- «Continúa hasta terminar»: fases 7 y 8.
- «De qué se trata mi proyecto, resúmelo para saber cómo buscar y descargar ROMs», «en md para copiar y
  pegar»: se le dio un resumen con carpetas, formatos, BIOS, Skraper y solo fuentes legales.
- «Quiero que pruebes mi skill para este proyecto para que ejecutes pruebas finales reales».

## Lo que se hizo

- **Fase 7**: sonidos de navegación (WebAudio, con el volumen de Configuración), animación de arranque
  de 2 s una vez por sesión, reloj que avanza solo y fluidez del carrusel con 3.000 juegos. El costo
  estaba en reiniciar la animación de 10 portadas cada 90 ms; un paso que llega antes de que termine el
  anterior ahora se dibuja sin transición (`app/piezas/carrusel.js`). Evidencia en `docs/pruebas-fase7/`.
- **Fase 8, sin probar**: `scripts/instalador/` (instalar-neo-arcade.sh, consola.sh,
  armar-iso-consola.sh, volver-al-escritorio.sh, sin-suspension.sh `--solo-sistema`). Apagar y
  reiniciar en Configuración con doble pulsación (en desarrollo solo se anotan). Ctrl+Alt+Shift+M
  sostenido 3 s abre una terminal (`foot`).
- **Diagnóstico del equipo**: `npm run diagnostico` (emuladores, versiones, rutas reales de
  `retroarch.cfg`, núcleos, BIOS con huella, carpetas, alcance de Flatpak, mandos). Con `-- --juegos`
  revisa cada juego (`core/revision-juegos.js`).
- **Lo que pedía la skill y se agregó**: juegos de varios discos (`core/discos.js`: una tarjeta con «N
  discos»; se abre su `.m3u` o una que arma la app en `listas/` de la carpeta de datos), veces y tiempo
  jugado en Detalles, aviso de `neogeo.zip` antes de abrir (también se busca en la carpeta de BIOS y ya
  no se lista como juego), emuladores en el registro al arrancar y número de proceso de cada
  lanzamiento.
- Pruebas en la TV nuevas: `scripts/prueba-final-en-tv.sh` y `scripts/prueba-reconexion-en-tv.sh`.

## Cómo se verificó

- `npm test`: 97 pruebas en verde en WSL y en la MP80. En Windows fallan 4 que dependen de Linux; las
  pruebas se corren en WSL.
- TV de la MP80, todas en `docs/pruebas-finales/tv-mp80/` y `docs/pruebas-fase7/`:
  - multidisco, BIOS, `neogeo.zip`, tiempo jugado y revisión de juegos;
  - regresión de las fases 3, 4 y 6;
  - reconexión del mando;
  - fluidez (59.4 cuadros/s a 60 Hz y 74.3 a 75 Hz, cruceta sostenida con 3.000 juegos);
  - 30 minutos de uso (643 a 647 MB).
- El multidisco de Dreamcast se probó con discos de mentira. Se comprobó la lista `.m3u`, que RetroArch
  la recibe y que la puede leer desde su caja de Flathub. Que el núcleo cambie de disco a media partida
  necesita un juego real.

## Errores propios de esta sesión

- Hice un cambio de diseño sin aprobación: tamaño de los títulos y ancho de la pantalla de lanzamiento.
  Lo revertí y quedó como propuesta (diferencia 5 del CLAUDE.md).
- Di por hecho que un archivo de pruebas coincidía con el último commit; se había perdido una línea en
  blanco. Corregido.
- Corrí `npx eslint` sin revisar que el proyecto no usa ESLint. No cambió nada del repositorio; quedó
  en la caché de npm de WSL.

## Lo que espera al usuario

1. **Aviso de disco**: C: de la laptop tiene **9.5 GB libres**, por debajo del límite de 10 GB que
   pidió. En Temp hay 3.3 GB del instalador de Visual Studio (carpetas de hoy a las 14:05) y 0.6 GB de
   actualizaciones de Docker. No se borró nada.
2. **Revisión** de las fases 1 a 7. Pantallas con cambios para mirar: Configuración (fila Equipo con
   Apagar y Reiniciar), la animación de arranque, la línea «Jugado» de Detalles y «N discos» en la ficha.
3. **Decidir** lo de la skill que no está en el plan (`docs/pruebas-finales/README.md`, «Lo que queda
   por decidir») y corregir la skill como archivo (misma página, «La skill como archivo»).
4. **Sus archivos** para la última prueba real: un juego de arcade, uno de PlayStation (con su BIOS),
   uno de GameCube y uno de PSP.
5. **Permiso para reiniciar la MP80** cuando la fase 8 pase en la máquina virtual. Hay vuelta atrás con
   `scripts/instalador/volver-al-escritorio.sh`.
6. Pendientes viejos: el perfil Peques (sin confirmar), los títulos largos (diferencia 5), probar Windows
   desde GRUB y formatear la memoria USB que guarda la contraseña del Wi-Fi.

## Lo que sigue

- Fase 8 en una máquina virtual dentro de la MP80 (QEMU con KVM y OVMF): bajar la imagen oficial de
  Debian 13 en la MP80 y comprobar su SHA256SUMS, armar la imagen con `armar-iso-consola.sh`, instalar,
  medir el arranque (meta del plan: menos de 30 s) y comprobar que no aparece texto. Después, la guía
  de instalación (`docs/guia-instalacion.md`).
- Pendientes de la fase 4: emparejar Bluetooth desde Configuración, xpadneo y xone en el instalador, y
  el mapeo de mandos en Dolphin y PPSSPP.

## Observaciones

- La MP80 quedó sin Electron abierto, con RetroArch en Select + Start (combinación 4) y sin perfiles de
  mando de prueba. Las carpetas `~/juegos-de-prueba*` son datos de prueba y se pueden borrar.
- La MP80 tiene 166 GB libres en Debian.
