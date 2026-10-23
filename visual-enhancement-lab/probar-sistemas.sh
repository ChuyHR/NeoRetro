#!/usr/bin/env bash
# Prueba rápida de un perfil con un juego de cada sistema de la biblioteca de la MP80: que RetroArch abra,
# que el shader cargue (sin «falling back to stock» en el registro) y que el juego se dibuje.
# Uso: bash probar-sistemas.sh <perfil>   (por ejemplo F-pantalla-sharp-bilinear)
set -u
COD="$(cd "$(dirname "$0")" && pwd)"
LAB="$(dirname "$COD")"
T="$LAB/trabajo"
P="$COD/perfiles/$1.cfg"
R="$LAB/resultados/sistemas-$1"
CORES="$HOME/.var/app/org.libretro.RetroArch/config/retroarch/cores"
ROMS="$HOME/NeoRetro/roms"
# La sesión de la TV (Cage de Neo Arcade), salvo que ya se esté en otra (una sesión sin pantalla).
export XDG_RUNTIME_DIR="/run/user/$(id -u)" WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"
# Las pruebas se ven en la TV y le quitan el foco a lo que haya: con un juego abierto (el usuario
# jugando), RetroArch lo pausaría. El 2026-10-22 pasó con una partida de Metal Slug 3.
if pgrep -x retroarch >/dev/null; then
  echo "Hay un juego abierto en la TV; no se corre para no interrumpirlo." >&2
  exit 3
fi
mkdir -p "$R"
shader=$(sed -n 's/^# shader: //p' "$P")

# sistema|núcleo (los de config/systems.json)
for par in arcade:fbneo neogeo:fbneo nes:mesen snes:snes9x gb:mgba gbc:mgba gba:mgba mastersystem:genesis_plus_gx \
           megadrive:genesis_plus_gx gamegear:genesis_plus_gx pcengine:mednafen_pce; do
  sistema=${par%%:*}
  nucleo=${par##*:}
  juego=$(find "$ROMS/$sistema" -maxdepth 1 -type f \( -iname '*.zip' -o -iname '*.nes' -o -iname '*.sfc' -o -iname '*.gba' \) \
          ! -iname 'neogeo.zip' | sort | head -1)
  [ -z "$juego" ] && { echo "$sistema: sin juegos"; continue; }
  find "$T/saves" -mindepth 1 -delete
  t=$(date +%s%3N)
  timeout 120 flatpak run org.libretro.RetroArch --config "$T/base.cfg" --appendconfig "$P|$COD/sin-limite.cfg" -f \
    -L "$CORES/${nucleo}_libretro.so" "$juego" --set-shader="$shader" --max-frames=900 --max-frames-ss \
    --max-frames-ss-path="$R/$sistema.png" --verbose --log-file="$R/$sistema.log" </dev/null >/dev/null 2>&1
  salida=$?
  medida=$([ -f "$R/$sistema.png" ] && python3 -c "import struct,sys; d=open(sys.argv[1],'rb').read(24); print('%dx%d' % struct.unpack('>II', d[16:24]))" "$R/$sistema.png" || echo "sin captura")
  base=$(grep -m1 -oE "Geometry: [0-9]+x[0-9]+" "$R/$sistema.log" | cut -d' ' -f2)
  falla=$(grep -c -E "falling back to stock|Failed to (compile|link|create)" "$R/$sistema.log")
  echo "$sistema ($nucleo, $(basename "$juego")): salida $salida en $(($(date +%s%3N) - t)) ms, juego $base, imagen $medida, fallas de shader $falla"
done
