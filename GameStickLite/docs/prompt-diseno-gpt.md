# Prompt para pedir a GPT el diseño del menú

Pensado para ChatGPT con generación de imágenes. Las reglas técnicas salen de
[hardware.md](hardware.md): todo lo que pide se puede dibujar con OpenGL ES 2.0 en el aparato.

```text
Diseña la pantalla principal de NEO ARCADE LITE, un menú de videojuegos retro para TV. Corre en una
consola HDMI muy limitada (un procesador ARM de un núcleo, 200 MB de memoria y una tarjeta gráfica
básica con OpenGL ES 2.0), así que el diseño debe poder reconstruirse con formas simples.

CONTEXTO
- Lienzo de 1280 × 720 px, horizontal. Se ve en una TV a 3 metros: nada de texto menor a 18 px.
- Se maneja solo con un tablero arcade: palanca de 4 direcciones y botones A, X, LB, RB, LT, RT,
  SELECT (moneda) y START. Sin ratón, sin pantalla táctil y sin teclado.
- Textos en español, salvo los nombres de marca y de consola.

IDENTIDAD VISUAL (obligatoria)
- Estilo arcade retro con toque synthwave.
- Colores: fondo #050914, texto #F5F7FF, rosa #FF168C, cian #00BFFF, azul de acento #1E90FF y texto
  secundario #8997B8. Puedes agregar como máximo dos colores más; dime cuáles.
- Solo tres fuentes: Bungee (títulos y logotipo), Pixelify Sans (etiquetas y botones) y Share Tech
  Mono (descripciones).
- Logotipo: «NEO ARCADE» con «PLAY AGAIN» debajo, entre dos líneas dobles, y un ícono de palanca
  arcade hecho con rectángulos.

CONTENIDO DE LA PANTALLA
1. Cabecera con el logotipo.
2. Barra de sistemas con ícono y nombre: ALL GAMES, NES, SNES, GAME BOY, GBC, GBA, SEGA GENESIS,
   FAVORITOS y RECIENTES. Uno va marcado como activo.
3. Carrusel de juegos: el elegido grande al centro y hasta 3 más pequeños a cada lado. Cada tarjeta
   lleva la carátula y abajo una franja con el nombre de la consola.
4. Ficha del juego elegido: título, «desarrollador · año · género» y una descripción de 3 renglones.
5. Acciones del juego: JUGAR y FAVORITO (con estrella encendida o apagada). Una de las dos tiene el
   foco.
6. Pie con la leyenda de botones: NAVEGAR, A JUGAR, X FAVORITO, LB RB SISTEMA, SELECT START SALIR.

REGLAS TÉCNICAS (para que se pueda reconstruir tal cual)
1. Solo formas planas: rectángulos, rectángulos redondeados, líneas y círculos. Colores sólidos o
   degradados lineales de dos colores.
2. Brillos y sombras solo como halo suave de un color alrededor de un rectángulo redondeado. Nada de
   desenfoque del fondo, efecto vidrio, texturas de ruido ni fondos fotográficos.
3. Las únicas imágenes son las carátulas de los juegos (verticales, cerca de 3:4) y sus capturas
   (4:3). Si agregas una ilustración decorativa (un sol, una ciudad), que sea de formas planas
   vectoriales y la misma para todos los juegos.
4. Como máximo 7 carátulas a la vista. Las de los lados pueden ir giradas en perspectiva o planas.
5. Sin video, sin partículas y sin animaciones salvo tres: el carrusel que se desliza, el resaltado
   de la selección y un pulso suave en el elemento con foco.
6. Como máximo 5 tamaños de texto en toda la pantalla.
7. Íconos de un solo color, en pixel art o de línea simple, de 48 px como máximo.
8. Debe verse bien también cuando una lista tiene 1 o 2 juegos (por ejemplo RECIENTES con 2: solo esos
   2, centrados, sin repetirlos) y cuando un juego no tiene carátula (portada generada con el título
   sobre el color de su consola).

ENTREGABLES
1. Una imagen de 1280 × 720 de la pantalla en ALL GAMES, con un juego elegido y JUGAR con el foco.
2. Otra imagen de la misma pantalla en RECIENTES con solo 2 juegos y FAVORITO con el foco.
3. Una tabla de especificación que coincida con las imágenes. Para cada elemento: x, y, ancho y
   alto en px sobre el lienzo de 1280 × 720, colores en hexadecimal, fuente y tamaño, radio de las
   esquinas y, si lleva brillo, su color y tamaño. Incluye el estado normal y el de foco de cada
   elemento que lo tenga.
```
