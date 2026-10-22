# Recursos del Game Stick y cómo dibujar el menú

Placa `M8_PRO 2023-08-22 V1.5` con el sistema de fábrica V1.5. Revisado el 2026-10-22 con:

- la configuración que el kernel trae dentro (`IKCONFIG`), sacada de `res/DATA01`;
- los archivos de `res/DATA03`;
- el diagnóstico que corrió en el aparato (`neo/diagnostico.txt`).

## Lo verificado

| Recurso | Qué hay | Fuente |
|---|---|---|
| Procesador | Amlogic AML8726-MX (Meson6), ARM Cortex-A9 con VFPv3 y NEON. El kernel está compilado sin SMP, así que Linux usa **un solo núcleo**. No tiene control de frecuencia: la velocidad la fija el arranque | Marcas del chip y configuración del kernel |
| Memoria | Linux ve 216 MB (`MemTotal` 220 920 kB) y al arrancar hay 193 MB libres. El resto lo reserva el video. Hay 512 MB de intercambio en la tarjeta (`DATA06`), que es lento | Diagnóstico en el aparato |
| Tarjeta gráfica | Mali, familia Utgard: OpenGL ES 1.1 y 2.0 con EGL directo sobre la pantalla (sin X11 ni Wayland). Frecuencia máxima de 333 MHz. `mali.ko` r7p0 (2022) está compilado para este mismo kernel, y `libMali.so` es r7p0. El emulador de PSP de fábrica la usa | `DATA03` y versión del módulo igual a la del kernel |
| 2D por hardware | GE2D de Amlogic: copia, escala y mezcla con transparencia | Configuración del kernel |
| Pantalla | Solo HDMI. Capa OSD1 de 1280×720 a 16 bits (RGB565) con 1440 líneas virtuales, o sea dos páginas para cambiar de cuadro sin parpadeo. Capa OSD2 de 720×480 a 32 bits | Aparato y configuración |
| Video | Decodificador por hardware solo de MJPEG y RealVideo. No hay H.264 | Configuración del kernel |
| Sonido | Códec RT5631 (tarjeta 0) y HDMI | Aparato |
| USB | Un puerto. Controles HID por evdev; sin `joydev`, `uinput` ni `hidraw`. No lee memorias USB | Configuración y aparato |
| Red | Ninguna: el kernel no trae red | Configuración del kernel |
| Archivos | FAT32, ext2 y ext3, tmpfs. NTFS solo de lectura. Sin ext4 ni exFAT | Configuración del kernel |
| Kernel | Linux 3.0.50 PREEMPT, 100 Hz. `insmod` y `mdev` de busybox | `DATA01` y sistema inicial |
| Bibliotecas de fábrica | glibc 2.19 (armhf), FreeType 2, libpng, libjpeg 8, zlib, libxml2, ALSA, libusb-1.0, libudev y MiniGUI 3.0. Fuentes TrueType: Arial Unicode MS y dos más | `DATA03` |

## Lo inferido, sin verificar

- Por datos públicos de la familia, el chip tiene dos núcleos de hasta 1.5 GHz y una Mali-400 MP2. La
  velocidad real no se ha medido: la lectura de `cpuinfo` que hay fue de la simulación, no del aparato.
- `libMali.so` se compiló para Mali-450. Como el emulador de PSP de fábrica la usa, lo más probable es
  que funcione en esta placa, pero falta probarlo.

## Lo que no se puede

- Correr Neo Arcade tal cual. Electron necesita más memoria de la que hay, un servidor gráfico y una
  glibc moderna.
- Videos de vista previa en H.264.
- Bajar carátulas o fichas desde el aparato, porque no tiene red.
- Usar el segundo núcleo sin cambiar el kernel.

## Opciones para dibujar el menú

El usuario descartó el 2026-10-22 el menú hecho con capturas de Neo Arcade: cada juego nuevo pedía
pasar la tarjeta por la laptop.

| Opción | A favor | En contra |
|---|---|---|
| Capturas de Neo Arcade (lo de hoy) | Idéntico a Neo Arcade | Cada juego nuevo pide la laptop. Descartada |
| Dibujo por software en C (`pantalla.c`) | Ya funciona y no depende de nada | Con un núcleo, las animaciones, los brillos y la perspectiva son lentos |
| LVGL (biblioteca de interfaces para equipos pequeños) | Componentes, animaciones y redibujo solo de lo que cambia | Dibuja por software; no hace perspectiva |
| OpenGL ES 2.0 con la Mali | 60 cuadros por segundo; perspectiva, brillos y transparencia sin cargar al procesador | Depende de `libMali.so` de fábrica: el programa se enlaza con su glibc 2.19, no estático. Falta probarla |
| SDL2, Qt o el menú de RetroArch | Ya resueltos | Compilarlos para esta glibc y este kernel es pesado, y el menú de RetroArch no se parece a Neo Arcade |

## Recomendación

Un programa propio en C con OpenGL ES 2.0, y el dibujo por software actual como respaldo si la Mali
no arranca.

- **Todo se arma en el aparato.** El menú lee `roms/`, las imágenes PNG o JPG y el `gamelist.xml`
  (formato de EmulationStation, el que usa Neo Arcade) cuando existen. Reduce cada imagen una sola
  vez y la guarda en `neo/cache/`.
- **Agregar un juego es copiar la ROM**, y su imagen si se tiene. Sin imagen, el menú genera una
  portada con el título sobre el color del sistema, como Neo Arcade.
- **Fuentes de Neo Arcade** (Bungee, Pixelify Sans y Share Tech Mono, con licencia OFL) en TrueType,
  rasterizadas en el aparato con FreeType o stb_truetype.
- **Fondo y adornos fijos** como imágenes que vienen con el sistema. No dependen de los juegos.
- **Sin video de vista previa:** en su lugar, la captura del juego.

**Primer paso, en una sola pasada de la tarjeta:** un programa de prueba que cargue `mali.ko`, abra
EGL en la pantalla, dibuje tarjetas con perspectiva y texto, y mida los cuadros por segundo. También
decodifica una carátula JPG y una PNG y mide el tiempo. Con eso se decide entre OpenGL ES y el dibujo
por software.

El prompt para pedir el diseño a GPT con estas restricciones está en
[prompt-diseno-gpt.md](prompt-diseno-gpt.md).

## Lo que se hizo (2026-10-22)

El diseño que propuso GPT es plano: rectángulos redondeados, halos, imágenes y texto. Se construyó con
dibujo por software en C, sin la Mali, porque así no depende de `libMali.so` ni de su glibc. En QEMU
un cuadro tarda de 26 a 37 ms. Si en el aparato el carrusel no se mueve con fluidez, el siguiente paso
es OpenGL ES 2.0. Detalle en [sistema-propio.md](sistema-propio.md).
