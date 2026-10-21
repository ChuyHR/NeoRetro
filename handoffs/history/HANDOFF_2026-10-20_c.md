# Handoff del 2026-10-20 (fase 1)

Antes de este, el mismo día: `history/HANDOFF_2026-10-20.md` (análisis de viabilidad, ajustes al plan,
fase 0 e incidentes con los discos) y `history/HANDOFF_2026-10-20_b.md` (instalación de Debian en la
MP80 y su arranque).

## Resumen

La fase 1 está terminada y verificada; **espera la revisión del usuario**. La pantalla del prototipo
está reproducida por piezas y coincide píxel por píxel con él, salvo en los dos cambios aprobados que
se notan con los datos de ejemplo. Se recorre entera con el teclado.

## Decisiones del usuario y cómo se interpretaron

- «Sí, ya comienza con la fase 1» se tomó como aprobación de la fase 0. No llegó a ver la ventana de
  NEO ARCADE con sus ojos; pidió avanzar.

## Lo que se hizo

- **Tipografías locales** en `app/fuentes/`: subconjunto latino en woff2 de Google Fonts, con sus
  licencias OFL (89 KB en total). Pixelify Sans es variable, un solo archivo para 500, 600 y 700.
- **Piezas** en `app/piezas/` (cabecera, barra de sistemas, carrusel, ficha, acciones, vista previa,
  pie, detalles, configuración, lanzamiento y decoración), con el marcado y los estilos en línea del
  prototipo copiados tal cual.
- **Lógica pura**: `estado.js` (acciones → estado), `modelo.js` (estado → lo que dibuja cada pieza) y
  `entrada-teclado.js` (teclas → acciones). Datos de ejemplo en `datos-ejemplo.js`, ya con los ids de
  carpeta del plan.
- **Cambios aprobados aplicados**: descripción y ficha de detalles a 24 px (la descripción se corta
  en tres líneas para no invadir el pie), pie con las teclas del teclado, foco único, barra de 12
  sistemas que se desplaza si hay más, y carrusel animado con `transform` (FLIP).
- **Herramientas de verificación**: `npm run comparar` (app contra prototipo a 1920×1080, por zonas) y
  `npm run recorrido` (captura cada pantalla recorrida con el teclado). `scripts/electron.sh` reúne los
  ajustes de WSL que antes vivían en `dev.sh`.
- 21 pruebas con `node --test`.

## Cómo se verificó

- `npm run comparar`: 0.0 % de píxeles distintos en cabecera, reloj, barra, carrusel, reflejos, menú,
  vista previa, INSERT COIN y lema del pie. 9.2 % en la ficha (texto a 24 px) y 9.6 % en el pie
  (teclas), que son los cambios aprobados. Capturas y mapa en `docs/pruebas-fase1/`.
- `npm run recorrido`: nueve pantallas en `docs/pruebas-fase1/recorrido/`, revisadas a ojo (carrusel
  movido, sistema ARCADE, detalles con foco en cada botón, configuración con CRT apagado, lanzamiento
  y vuelta sin CRT).
- `npm test`: 21 pruebas en verde.

## Decisiones de diseño tomadas sin preguntar (para que el usuario las revise)

- **Foco en las ventanas.** El prototipo no lo definía. Se usó el brillo azul del menú de acciones
  (`0 0 22px #1E90FFAA`). En Detalles, el botón con foco toma además el aspecto principal (borde azul,
  fondo `#0B2350`); en Configuración, el borde azul sigue marcando la opción elegida y el brillo, el
  foco.
- **Teclas**: flechas, Enter, Retroceso para volver y Re Pág y Av Pág para cambiar de sistema. Esc no
  se usa porque en desarrollo cierra la app.
- **Pie**: la cruceta se conserva para NAVEGAR; las teclas van en recuadros redondeados del mismo
  estilo que los círculos A y B del prototipo.

## Lo que falta, en orden

1. **Revisión del usuario de la fase 1.** Puede verla en su laptop con `npm start` desde WSL. Antes de
   abrirla en la TV de la MP80, pedirle permiso: se pone a pantalla completa.
2. **Medir el carrusel en la MP80**, que es la prueba real de fluidez (su GPU es de 16 EU). Hace falta
   llevar el proyecto allá (clonar o copiar sin `node_modules` ni `credenciales/`) y correr
   `scripts/preparar-desarrollo.sh --sin-emuladores`.
3. Pendientes de la MP80: comprobar que Windows arranca desde GRUB y que después vuelve a aparecer el
   menú; formatear la memoria USB (guarda la contraseña del Wi-Fi); opcional, apagar en la laptop el
   uso compartido de la conexión.
4. Fase 2: biblioteca real (`config/systems.json`, escáner, sistemas sin juegos fuera de la barra y
   los 10 íconos que faltan).

## Observaciones

- Los títulos de hasta 18 letras se cortan a media palabra en las portadas laterales angostas; es así
  en el prototipo (ver diferencia 5 en `CLAUDE.md`).
- Al dar la vuelta (del último juego al primero) todas las portadas saltan de golpe, igual que en el
  prototipo.
- Si se pulsan flechas muy rápido, cada animación nueva cancela la anterior y el paso puede verse
  brusco. Es tema de la fase 7.
