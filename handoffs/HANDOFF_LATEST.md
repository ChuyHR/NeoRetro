# Handoff del 2026-10-20 (cierre de la fase 0)

El detalle de la primera parte del día (análisis de viabilidad, decisiones, pruebas de la fase 0 e
incidentes con los discos) está en `handoffs/history/HANDOFF_2026-10-20.md`.

## Resumen

La fase 0 pasó su prueba de aceptación en el Debian de WSL de la laptop. La app abre a pantalla
completa con NEO ARCADE sobre el lienzo escalado; Esc la cierra en desarrollo y no en la versión
final; `npm test` pasa. Falta que el usuario la vea con sus ojos. Además quedó armada la imagen de
instalación automática de Debian para la MP80, que espera a que el usuario la grabe y arranque la
MP80 desde ella.

## Decisiones del usuario en esta parte y cómo se interpretaron

- **«El disco externo lo desconecté, trabaja aquí en local mejor; solo avísame si está a punto de
  llenarse mi memoria».** El repositorio se clonó desde GitHub a
  `C:\Users\ADMIN\Documents\UtilsDev\ArcadeRetro` y el desarrollo sigue en el Debian de WSL en C:. Se
  avisa al usuario antes de que C: baje de 10 GB libres; los emuladores (unos 2.5 GB) se dejaron para
  la fase 3 por la misma razón. C: tenía 11.74 GB libres al cerrar.
- **MP80 en arranque dual** («sí, en una partición») y **la memoria USB «MICAELA» se puede borrar**.
- **«Haz todo el proceso tú».** Se le explicó que tres cosas solo las puede hacer él: el permiso de
  administrador para grabar la memoria, preparar Windows en la MP80 y arrancar desde la memoria. El
  resto se automatizó.
- **«La MP80 no tiene contraseñas».** Debian se configura igual: `arcade` sin contraseña, sesión
  automática y sudo sin contraseña. Por la red, SSH entra solo con llave.
- **Wi-Fi**: `Totalplay-66AE_5G`. Windows no deja leer la contraseña sin administrador, así que el
  usuario la dejó en `credenciales/wifi.txt`, dentro del repositorio. Su regla del `.gitignore` tenía
  una errata (`credeciales/`) y no la cubría; se corrigió y se comprobó que ningún commit la contiene.
  Nunca se mostró ni se copió fuera de la imagen.

## Lo que se hizo

- `scripts/preparar-desarrollo.sh` ganó `--sin-emuladores` y dos paquetes que el Debian base no trae
  y que antes llegaban de paso: Python (con él se descarga Node) y OpenGL (sin él Chromium dibuja por
  software).
- `scripts/instalador/` con la instalación automática:
  - `preseed.cfg`: español de México, `neoarcade`, Wi-Fi, usuario `arcade` sin contraseña, partición
    en el espacio libre más grande (nunca el disco completo), Xfce, SSH, os-prober.
  - `final.sh`: sudo sin contraseña, llave SSH, SSH sin contraseñas, sesión automática y Windows en
    el menú de GRUB.
  - `armar-iso.sh`: arma la imagen desde la oficial con xorriso.
  - La confirmación del particionado queda siempre en pantalla, a propósito.
- Imagen armada: `C:\Users\ADMIN\Downloads\debian13\neoarcade-debian-13.7.0.iso` (792 MB), a partir de
  la oficial 13.7.0 verificada con SHA-512 y la firma de la llave de CD de Debian. Conserva el arranque
  UEFI y BIOS. **Contiene la contraseña del Wi-Fi.**
- Llave SSH de la laptop: `C:\Users\ADMIN\.ssh\neoarcade_ed25519` (la pública va en la imagen).
- `core/main.js` escribe al arrancar en qué modo corre («modo desarrollo» o «versión final»).

## Cómo se verificó la fase 0

- `npm start -- --captura=…`: ventana de 1366×768 con NEO ARCADE centrado, sin errores de GPU.
- Esc en desarrollo: una envoltura carga `core/main.js` y manda Esc con `webContents.sendInputEvent`;
  la app se cerró. `xdotool` no sirve en WSLg: la tecla no llega aunque la ventana tenga el foco (se
  comprobó con una ventana de prueba que registra las teclas).
- Versión final: `npm run empaquetar` (10 s, 283 MB) y el ejecutable reportó «versión final», donde
  Esc no hace nada. La carpeta `dist/` se borró después para no ocupar C:.

## Lo que falta, en orden

1. **El usuario revisa la fase 0** con `npm start` (en una terminal de WSL, dentro del repositorio) y
   la aprueba. Con eso sigue la fase 1.
2. **Instalar Debian en la MP80**, cuando el usuario tenga tiempo:
   1. Grabar `neoarcade-debian-13.7.0.iso` en la Kingston con Rufus, en modo DD.
   2. En la MP80: confirmar que BitLocker está apagado, desactivar el inicio rápido y reducir C:
      (sugerencia 200 GB).
   3. Desconectar el cable de red, arrancar desde la memoria y confirmar el particionado.
   Después, entrar por SSH con la llave y preparar la MP80 con `scripts/preparar-desarrollo.sh`.
3. **Después de instalar**: borrar la imagen con la contraseña, `credenciales/wifi.txt` y la imagen
   oficial si ya no hace falta, y pedirle al usuario que formatee la memoria USB.
4. **Probar la imagen en una máquina virtual** antes de que el usuario la use, si hay espacio: QEMU con
   OVMF en el Debian de WSL, hasta la pantalla de confirmación del particionado. No se hizo todavía.

## Riesgos y supuestos

- Sin probar: que el instalador conecte el Wi-Fi de la MP80 (depende del firmware de su tarjeta), que
  `priority=high` junto con `auto=true` no haga preguntas de más, y que la sesión de Xfce conserve el
  Wi-Fi configurado por el instalador. Si el Wi-Fi no queda, el usuario lo conecta una vez desde el
  ícono de red de Xfce.
- La receta `atomic` crea una partición de intercambio del tamaño de la RAM (16 GB) dentro del espacio
  libre.
- El SSD interno de la laptop sigue con los avisos de falla anticipada (evento disk 52) y casi lleno.
