# Handoff del 2026-10-20

## Resumen

Sesión de preparación, sin código. Se creó el `CLAUDE.md`, se guardó el plan del usuario, se hizo un
análisis de viabilidad y el usuario tomó las decisiones que cambian el plan. Quedaron registradas
como «Ajustes al plan» en `CLAUDE.md`. La carpeta sigue sin repositorio git.

## Decisiones del usuario y cómo se interpretaron

- **Desarrollo en local.** Dijo «se podría ejecutar en un emulador aquí en local; cuando ya esté casi
  al 100% se hacen pruebas reales», apoyándose en que debe funcionar en cualquier equipo que cumpla
  los requisitos. Se eligió Debian en WSL 2 porque WSL ya está activo en esta PC, WSLg da ventanas con
  aceleración gráfica y comparte la memoria con Docker en un equipo de 8 GB. Una máquina virtual
  completa queda solo para probar el instalador de la fase 8.
- **Windows en la MP80.** Antes había respondido «sí en teoría, porque necesitamos que se comporte
  como un sistema dedicado», y se leyó como que Debian reemplaza a Windows. Con el desarrollo en local,
  la MP80 conserva Windows hasta las pruebas reales; la fase 8 la reinstala. Esa instalación borra el
  disco: confirmarlo con el usuario antes.
- **Teclado primero.** «De momento podríamos hacer que funcione con teclado.» Confirmó dejar la fase 4
  en pausa; las pruebas se hacen con teclado y sin ratón.
- **Equipos y controles universales.** Lo pidió como requisito: cualquier PC que cumpla los mínimos y
  cualquier control, USB o Bluetooth. El diseño de controles quedó en el ajuste 4 para cuando se
  retome la fase 4.
- **Pantalla.** A la pregunta por la resolución de la TV respondió que sea adaptable, también a
  pantallas no tan grandes, porque si no los juegos clásicos se verían muy pixeleados. Se registró la
  interfaz adaptable (ajuste 6). Lo pixeleado de los juegos depende del filtro de escalado del
  emulador y no de la resolución de la TV; se le propuso un ajuste para eso (abajo, sin respuesta).
- **Frontend.** Aprobó los cuatro cambios: carátulas sin recorte, vista previa para 4:3, texto mínimo
  de 24 px, y foco único con barra desplazable.

## Lo que se hizo

- `CLAUDE.md` en la raíz, con estado verificado, ajustes al plan, cómo está hecho el prototipo,
  diferencias abiertas y reglas.
- El plan se guardó sin cambios en `Docs/plan-desarrollo.md`.
- Se comprobó que el prototipo se ve sirviendo `Docs/` con `py -m http.server 8765`.

## Propuestas sin respuesta

- **Imagen de los juegos** en Ajustes: píxel nítido, suavizado o efecto CRT, que Neo Arcade escribe en
  la configuración de RetroArch. Respondería a la preocupación por lo pixeleado. Iría en la fase 6.
- **Una revisión temprana en la MP80** desde una USB de Debian, sin tocar Windows, al cerrar la fase 1.
  La GPU de la MP80 es el recurso más justo y la interfaz depende de ella; si el carrusel no da 60 fps,
  conviene saberlo antes de construir seis fases encima. El usuario prefirió probar en real al final,
  así que es solo una recomendación.
- **Perfil Peques en la fase 6.** Se dejó así salvo que el usuario diga otra cosa.
- **Combinaciones de teclado**: Esc para salir de los emuladores y Ctrl + Alt + Mayús + M sostenida
  3 s para la terminal de mantenimiento.

## Lo que falta, en orden

1. `git init` y `.gitignore` (`roms/`, `media/`, `node_modules/`, `dist/`). Esta máquina no tiene
   identidad global de git; los otros repos personales usan la identidad local ChuyHR.
2. Fase 0, adaptada a los ajustes: instalar Debian en WSL 2 (con aprobación del usuario), revisar
   el entorno, comparar al menos tres tecnologías y escribir `decision-tecnica.md`. Se detiene ahí.
   Hay que decidir dónde vive el repositorio. Dentro del sistema de archivos de WSL es rápido y tiene
   la semántica de Linux, pero Claude Code corriendo ahí no carga el `CLAUDE.md` global ni la memoria
   de Windows salvo que se enlacen. En `C:` se conservan, pero `node_modules` sobre `/mnt/c` es lento.
3. La lista «Antes de empezar» del plan cambia: RetroArch, Dolphin y PPSSPP se instalan en el Debian
   de WSL durante la fase 0, y cada comando queda anotado para el instalador de la fase 8. Las ROMs de
   prueba y los medios de Skraper siguen siendo tarea del usuario; Skraper puede correr en Windows.

## Datos verificados en esta sesión

- PC de trabajo: i7-1165G7, Iris Xe, 7.7 GB de RAM visibles, WSL 2 con solo `docker-desktop`
  (detenida al momento de revisar), hipervisor activo.
- MP80: N95 con UHD de 16 EU, 16 GB LPDDR5, SSD M.2 SATA de 512 GB, Bluetooth 4.2 (Intel y CNX
  Software). En esta clase de procesador, GameCube corre muchos juegos a resolución original, los
  pesados se traban y subir la resolución no es viable.
- En Cage la ventana nueva queda encima con toda la entrada y al cerrarse vuelve la anterior (wiki de
  Cage). El RetroArch de Debian trae desactivada la descarga de núcleos (wiki de Debian).

## Supuestos que conviene revisar

- Con 8 GB en la PC de trabajo, WSL comparte memoria con los contenedores de Xenty. Si se queda
  corta, se detienen esos contenedores mientras se trabaja aquí o se ajusta el límite de WSL.
- Los requisitos mínimos del ajuste 2 son una propuesta; la fase 0 los confirma.
