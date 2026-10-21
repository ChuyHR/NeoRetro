#!/usr/bin/env bash
# Ajusta en RetroArch lo que Neo Arcade necesita:
#   - salir del juego con Select + Start en el mando, o con una sola pulsación de Esc en el teclado (de
#     fábrica pide dos);
#   - buscar los perfiles de mando en una carpeta donde Neo Arcade pueda escribir. La versión de Flathub
#     los trae en una carpeta de solo lectura; se copian una vez a la de su configuración, y ahí Neo
#     Arcade agrega los de los mandos que se configuran en Ajustes;
#   - con --partidas y --estados, guardar las partidas y los estados en esas carpetas y no junto a los
#     juegos (la consola instalada usa ~/NeoRetro/saves y ~/NeoRetro/states).
# Solo toca esas claves de retroarch.cfg; si el archivo aún no existe, lo crea con ellas y RetroArch
# completa el resto. Se puede correr otra vez sin romper nada.
# Uso: bash scripts/configurar-retroarch.sh [--partidas CARPETA] [--estados CARPETA]
set -euo pipefail

# Es la configuración de la versión de Flathub, la misma carpeta de carpetaNucleos en emulators.json.
CONFIG="$HOME/.var/app/org.libretro.RetroArch/config/retroarch"
CFG="$CONFIG/retroarch.cfg"
declare -A AJUSTES=(
  [input_quit_gamepad_combo]=4 # 4 es Start + Select en la lista de combinaciones de RetroArch
  [quit_press_twice]=false
  [joypad_autoconfig_dir]="~/.var/app/org.libretro.RetroArch/config/retroarch/autoconfig"
)
while [ $# -gt 0 ]; do
  case "$1" in
    --partidas) AJUSTES[savefile_directory]="$2"; AJUSTES[savefiles_in_content_dir]=false; shift ;;
    --estados) AJUSTES[savestate_directory]="$2"; AJUSTES[savestates_in_content_dir]=false; shift ;;
    *) echo "Opción desconocida: $1" >&2; exit 2 ;;
  esac
  shift
done

# RetroArch guarda su configuración al cerrarse: si está abierto, borraría estos cambios. Se pregunta a
# Flatpak y no a pgrep -f, que también encuentra cualquier comando que mencione la ruta.
if flatpak ps --columns=application | grep -qx org.libretro.RetroArch; then
  echo "RetroArch está abierto; ciérralo y vuelve a correr este script." >&2
  exit 1
fi

# Perfiles de mando que trae RetroArch: instalación de todo el sistema o solo del usuario.
for app in /var/lib/flatpak/app/org.libretro.RetroArch "$HOME/.local/share/flatpak/app/org.libretro.RetroArch"; do
  origen="$app/current/active/files/share/libretro/autoconfig/udev"
  if [ -d "$origen" ]; then
    mkdir -p "$CONFIG/autoconfig/udev"
    cp -n "$origen"/*.cfg "$CONFIG/autoconfig/udev/" # -n: no pisa los que ya estén
    echo "Perfiles de mando en $CONFIG/autoconfig/udev: $(ls "$CONFIG/autoconfig/udev" | wc -l)"
    break
  fi
done

mkdir -p "$(dirname "$CFG")"
touch "$CFG"
echo "Ajustes en $CFG"
for clave in "${!AJUSTES[@]}"; do
  linea="$clave = \"${AJUSTES[$clave]}\""
  if grep -q "^$clave = " "$CFG"; then
    sed -i "s|^$clave = .*|$linea|" "$CFG"
  else
    echo "$linea" >>"$CFG"
  fi
  echo "  $linea"
done
