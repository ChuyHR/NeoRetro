#!/usr/bin/env bash
# Deja el estado «nova» (trabajo/estados/nova.state) dentro del primer nivel de Nova the Squirrel, que
# no tiene demostración. Recorre el título, el menú, la selección de nivel y la pantalla del nivel 1-1
# con el RetroPad remoto (control-remoto.py), camina un poco a la derecha y guarda el estado.
# Cada perfil arranca de ese estado y corre el mismo número de cuadros sin botones: el cuadro es el mismo.
# Uso: bash crear-estado.sh
set -euo pipefail
COD="$(cd "$(dirname "$0")" && pwd)"
LAB="$(dirname "$COD")"
T="$LAB/trabajo"
CORES="$HOME/.var/app/org.libretro.RetroArch/config/retroarch/cores"
export XDG_RUNTIME_DIR="/run/user/$(id -u)" WAYLAND_DISPLAY=wayland-0

rm -f "$T/states/nova.state"
timeout 120 flatpak run org.libretro.RetroArch --config "$T/base.cfg" --appendconfig "$COD/perfiles/A-original.cfg" \
  -f -L "$CORES/mesen_libretro.so" "$LAB/juegos/nova.nes" </dev/null >/dev/null 2>&1 &
ra=$!
python3 "$COD/control-remoto.py" \
  "esperar 5000" "pulsar start 200" "esperar 2500" \
  "pulsar start 200" "esperar 2500" \
  "pulsar a 200" "esperar 3000" \
  "pulsar abajo 200" "esperar 700" "pulsar a 200" "esperar 4500" \
  "pulsar derecha 1800" "esperar 1200" \
  "comando SAVE_STATE" "esperar 1500" "comando QUIT"
wait "$ra" || true
cp "$T/states/nova.state" "$T/estados/nova.state"
echo "Estado guardado: $T/estados/nova.state ($(stat -c %s "$T/estados/nova.state") bytes)"
