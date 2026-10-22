# Guía de Neo Arcade Lite en el Game Stick

Para el Game Stick Lite 4K con placa **M8 Pro V1.5** (Amlogic AML8726-MX). Con otra versión de placa
el arranque de fábrica es distinto y esta tarjeta no arranca.

## Usarlo

1. Conecta el tablero al USB del Game Stick **antes** de encenderlo.
2. Al encender aparece el logotipo de Neo Arcade y después el menú. La primera vez sale antes una
   pantalla de prueba de controles: mantén cualquier botón 5 segundos para pasar.

| Botón | En el menú | En el juego |
|---|---|---|
| Palanca izquierda y derecha | Elegir juego en el carrusel | Mover |
| Palanca arriba y abajo | Elegir JUGAR o FAVORITO | Mover |
| A | Hacer lo elegido: jugar o marcar favorito | Según el juego |
| X | Agregar o quitar de Favoritos | Según el juego |
| LB y RB | Cambiar de consola | Según el juego |
| LT y RT | Saltar a la letra anterior o siguiente | Según el juego |
| Moneda (Select) | Ver Favoritos y Recientes | Moneda |
| Moneda + Start | Mantenidos 2 s: menú de fábrica | Volver al menú |

Las partidas guardadas dentro de los juegos (Pokémon, Zelda y otros) se escriben en la tarjeta
solas, cada vez que cambian y al salir. No hace falta hacer nada.

Si no hay ningún control conectado, a los 30 segundos se abre el menú de fábrica. Ese menú solo acepta
los controles inalámbricos que traía el aparato.

## Agregar juegos

1. Apaga el Game Stick y pon la microSD en la laptop.
2. Copia los juegos a la carpeta de su consola en `roms`. Sirve el nombre del Game Stick o el de la
   MP80:

| Consola | Carpeta | Formatos |
|---|---|---|
| NES | `fc` o `nes` | `.nes` |
| Super Nintendo | `sfc` o `snes` | `.sfc`, `.smc` |
| Mega Drive (Genesis) | `md` o `megadrive` | `.md`, `.gen`, `.bin` |
| Game Boy | `gb` | `.gb` |
| Game Boy Color | `gbc` | `.gbc` |
| Game Boy Advance | `gba` | `.gba` |

3. Si quieres imagen y descripción, copia también el `gamelist.xml` de esa consola y su carpeta
   `images`, tal como están en la MP80 (`~/NeoRetro/roms/<consola>/`). Basta con las imágenes de los
   juegos que copiaste; el `gamelist.xml` puede ir completo.

El menú lee todo al encender: no hace falta preparar nada en la laptop. Sin imagen, el juego aparece
con una portada que lleva su nombre. La primera vez que se ve cada imagen tarda un poco más, porque el
Game Stick la ajusta y la guarda en `neo/cache`.

Los juegos van sin comprimir: los `.zip` se descomprimen antes.

## Dónde queda cada cosa en la tarjeta

| Carpeta | Qué guarda |
|---|---|
| `neo/` | El sistema propio: menú, emuladores y arranque |
| `neo/partidas/` | Las partidas guardadas, por consola |
| `neo/cache/` | Las imágenes ya ajustadas al menú. Si se borra, se vuelve a llenar sola |
| `neo/medios/` | Carátulas y fichas de la versión anterior del menú; se siguen leyendo |
| `neo/sistema/gba_bios.bin` | La BIOS de GBA |
| `neo/datos-usuario.txt` | Favoritos y recientes |
| `neo/registro-*.txt`, `neo/diagnostico.txt` | Lo que pasó en cada encendido, para revisar fallas |
| `res/` | El sistema de fábrica, con el lanzador de Neo Arcade Lite en `DATA03`. No se toca |
| `roms/` | Los juegos, con sus `gamelist.xml` e imágenes |

## Armar una tarjeta desde cero

Hace falta el Debian de WSL preparado (ver `docs/sistema-propio.md`) y la carpeta `fabrica/` con los
archivos de fábrica, que no están en el repositorio. Su origen está en `docs/fase0.md`, y
`fabrica/HUELLAS.txt` los comprueba.

```bash
bash scripts/compilar.sh
bash scripts/armar-imagen.sh --tamano-mb 8192 --roms <carpeta con fc/, sfc/… y sus gamelist> \
     --bios <carpeta con gba_bios.bin>
```

El resultado, `compilado/gamestick.img`, se escribe en la microSD con balenaEtcher o Win32DiskImager.
Escribirlo borra la tarjeta.

Sobre el tamaño:

- Con `--tamano-mb` igual al tamaño de la tarjeta se aprovecha toda.
- Para pasar de 32 GB, la imagen ocupa ese espacio en el disco mientras se escribe.
- La laptop debe conservar al menos 10 GB libres en C:.
