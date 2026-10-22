#!/usr/bin/env bash
# Compila los programas del Game Stick para ARMv7 (Cortex-A9 con VFPv3 y NEON), estáticos con musl:
# el sistema de fábrica trae glibc 2.19 y un kernel 3.0.50, más viejo de lo que acepta un glibc
# moderno, y musl no tiene ese límite. Se corre dentro del Debian de WSL, con Zig 0.13 en ~/zig.
#
#   neo-prueba           prueba de pantalla, controles y sonido
#   neo-menu             menú de juegos
#   neo-retro-<sistema>  un emulador por núcleo libretro: src/retro.c con el núcleo enlazado dentro
#                        nes (FCEUmm), snes (Snes9x 2005), gb (Gambatte, también Game Boy Color),
#                        gba (gpSP con recompilador ARM), md (PicoDrive con núcleos en C)
#
# Las fuentes de terceros se bajan a ~/gamestick/fuentes en una versión fija y no van al repositorio.
# Uso: bash scripts/compilar.sh
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
ZIG="${ZIG:-$HOME/zig/zig}"
FUENTES="${FUENTES:-$HOME/gamestick/fuentes}"
SALIDA="$RAIZ/compilado"
OBJETIVO=(-target arm-linux-musleabihf -mcpu=cortex_a9)
mkdir -p "$SALIDA" "$FUENTES"

# El enlazador de musl avisa por su propio arranque (dlstart.c); no es de este proyecto.
filtrar() { grep -vE "dlstart|rcrt1|GETFUNCSYM|__dls2|^ *\||^ *\^|warning generated|deprecated" || true; }

# Baja un repositorio en una versión fija (commit o etiqueta), con sus submódulos.
bajar() { # <carpeta> <url> <versión>
  [ -d "$FUENTES/$1" ] && return
  git clone -q "$2" "$FUENTES/$1"
  git -C "$FUENTES/$1" checkout -q "$3"
  git -C "$FUENTES/$1" submodule -q update --init --recursive
}

# Compila un núcleo libretro como biblioteca estática.
nucleo() { # <carpeta> <makefile> <archivo .a> [más variables de make, por ejemplo platform=…]
  local carpeta=$1 makefile=$2 archivo=$3
  shift 3
  [ -f "$FUENTES/$carpeta/$archivo" ] && return
  make -C "$FUENTES/$carpeta" -f "$makefile" -j"$(nproc)" platform=unix STATIC_LINKING=1 TARGET="$archivo" fpic= \
    CC="$ZIG cc ${OBJETIVO[*]}" CXX="$ZIG c++ ${OBJETIVO[*]}" AR="$ZIG ar" "$@" > "$SALIDA/$carpeta.log" 2>&1 || true
  if [ ! -f "$FUENTES/$carpeta/$archivo" ]; then
    # Algunos Makefile (PicoDrive) ignoran STATIC_LINKING e intentan enlazar una biblioteca dinámica:
    # con los objetos ya compilados se arma la estática aquí.
    local objetos
    objetos=$(grep -m1 -- "-o $archivo" "$SALIDA/$carpeta.log" | tr ' ' '\n' | grep -E '\.o$' || true)
    if [ -z "$objetos" ]; then
      tail -n 20 "$SALIDA/$carpeta.log" >&2
      return 1
    fi
    (cd "$FUENTES/$carpeta" && "$ZIG" ar rcs "$archivo" $objetos)
  fi
}

bajar tinyalsa https://github.com/tinyalsa/tinyalsa.git 1.1.1
bajar libretro-fceumm https://github.com/libretro/libretro-fceumm.git ac0d00a
bajar snes9x2005 https://github.com/libretro/snes9x2005.git a79dfe9
bajar gambatte-libretro https://github.com/libretro/gambatte-libretro.git d9d6cd0
bajar gpsp https://github.com/libretro/gpsp.git 5819380
bajar picodrive https://github.com/libretro/picodrive.git 1890c29

nucleo libretro-fceumm Makefile.libretro fceumm_libretro.a
nucleo snes9x2005 Makefile snes9x2005_libretro.a
nucleo gambatte-libretro Makefile.libretro gambatte_libretro.a
# gpSP: la plataforma armv activa su recompilador para ARM (con -mcpu=cortex-a9 Zig no la acepta;
# el procesador ya va en OBJETIVO).
nucleo gpsp Makefile gpsp_libretro.a platform=armv-hardfloat
# PicoDrive con sus núcleos de CPU en C: los de ensamblador ARM (Cyclone, DrZ80) piden generar código
# con herramientas propias; queda para cuando haga falta más velocidad.
nucleo picodrive Makefile.libretro picodrive_libretro.a NO_ARM_ASM=1
# PicoDrive lee PNG (las láminas de la Sega Pico) con rpng de libretro-common, que su Makefile deja
# fuera al pedir una biblioteca estática. Se agrega de su propia copia, con su zlib.
if [ ! -f "$FUENTES/picodrive/png-libretro.a" ]; then
  tmp="$(mktemp -d)"
  P="$FUENTES/picodrive/platform/libretro/libretro-common"
  for c in formats/png/rpng.c streams/trans_stream.c streams/trans_stream_pipe.c streams/trans_stream_zlib.c; do
    "$ZIG" cc "${OBJETIVO[@]}" -O2 -D__LIBRETRO__ -DHAVE_ZLIB -I"$P/include" -I"$FUENTES/picodrive/zlib" \
      -c "$P/$c" -o "$tmp/$(basename "$c" .c).o"
  done
  "$ZIG" ar rcs "$FUENTES/picodrive/png-libretro.a" "$tmp"/*.o
  rm -rf "$tmp"
fi

COMUN=("${OBJETIVO[@]}" -static -fno-pie -no-pie -O2 -s -Wall -Wextra -Wno-sign-compare -Wno-unused-parameter
       -Wno-missing-field-initializers -I"$RAIZ/src")

"$ZIG" cc "${COMUN[@]}" -o "$SALIDA/neo-prueba" "$RAIZ/src/prueba.c" "$RAIZ/src/pantalla.c" 2>&1 | filtrar
"$ZIG" cc "${COMUN[@]}" -o "$SALIDA/neo-menu" "$RAIZ/src/menu.c" "$RAIZ/src/pantalla.c" "$RAIZ/src/mandos.c" 2>&1 | filtrar

# Con STATIC_LINKING=1 los núcleos dejan fuera estas piezas de libretro-common (suponen que el
# frontend las trae, como RetroArch); se compilan aparte, de la copia de FCEUmm.
LRC="$FUENTES/libretro-fceumm/src/drivers/libretro/libretro-common"
COMMON_C=(compat/compat_posix_string.c compat/compat_snprintf.c compat/compat_strcasestr.c compat/compat_strl.c
          compat/fopen_utf8.c encodings/encoding_utf.c file/file_path.c file/file_path_io.c streams/file_stream.c
          streams/file_stream_transforms.c string/stdstring.c time/rtime.c vfs/vfs_implementation.c)
if [ ! -f "$FUENTES/libretro-common.a" ]; then
  tmp="$(mktemp -d)"
  for c in "${COMMON_C[@]}"; do
    "$ZIG" cc "${OBJETIVO[@]}" -O2 -D__LIBRETRO__ -I"$LRC/include" -c "$LRC/$c" -o "$tmp/$(basename "$c" .c).o"
  done
  "$ZIG" ar rcs "$FUENTES/libretro-common.a" "$tmp"/*.o
  rm -rf "$tmp"
fi

# Las piezas de libretro-common que el núcleo ya trae ganan: el archivo común va al final y el
# enlazador solo toma de él lo que falte.
retro() { # <sistema> <cc|c++> <bibliotecas del núcleo…>
  local sistema=$1 compilador=$2
  shift 2
  # Un núcleo que define un nombre global igual a una función de la biblioteca de C que usa nuestro
  # código (pasó con «sync» en FCEUmm) hace que el enlazador estático conecte la llamada al núcleo: el
  # programa truena. Se revisa antes de enlazar.
  local tmp nuestros choques
  tmp="$(mktemp -d)"
  for c in retro.c pantalla.c mandos.c; do
    "$ZIG" cc "${OBJETIVO[@]}" -O2 -I"$RAIZ/src" -I"$FUENTES/tinyalsa/include" -I"$LRC/include" -c "$RAIZ/src/$c" -o "$tmp/$c.o"
  done
  nuestros=$(arm-linux-gnueabi-nm -u "$tmp"/*.o | awk '{print $NF}' | grep -v '^retro_' | sort -u)
  # Entre los argumentos también van opciones del enlazador (-Wl,…): solo se revisan los archivos.
  choques=$(for b in "$@"; do if [ -f "$b" ]; then arm-linux-gnueabi-nm -g --defined-only "$b" 2>/dev/null | awk '{print $NF}'; fi; done |
            sort -u | comm -12 - <(echo "$nuestros"))
  rm -rf "$tmp"
  if [ -n "$choques" ]; then
    echo "El núcleo de neo-retro-$sistema define nombres que nuestro código usa de la biblioteca de C: $choques" >&2
    return 1
  fi
  "$ZIG" "$compilador" "${COMUN[@]}" -I"$FUENTES/tinyalsa/include" -I"$LRC/include" \
    -o "$SALIDA/neo-retro-$sistema" -x c "$RAIZ/src/retro.c" "$RAIZ/src/pantalla.c" "$RAIZ/src/mandos.c" \
    "$FUENTES/tinyalsa/src/pcm.c" -x none "$@" "$FUENTES/libretro-common.a" -lm 2>&1 | filtrar
}

retro nes cc "$FUENTES/libretro-fceumm/fceumm_libretro.a"
retro snes cc "$FUENTES/snes9x2005/snes9x2005_libretro.a"
retro gb c++ "$FUENTES/gambatte-libretro/gambatte_libretro.a"
retro gba c++ "$FUENTES/gpsp/gpsp_libretro.a"
# rpng va antes del núcleo y otra vez después: se llaman entre sí en ambos sentidos.
retro md cc -Wl,--start-group "$FUENTES/picodrive/picodrive_libretro.a" "$FUENTES/picodrive/png-libretro.a" -Wl,--end-group

for p in "$SALIDA"/neo-*; do
  [ -x "$p" ] && echo "Listo: $p ($(stat -c %s "$p") bytes)"
done
