#!/usr/bin/env bash
# Ajusta en RetroArch lo que Neo Arcade necesita para volver al menú: salir del juego con Select + Start
# en el mando, o con una sola pulsación de Esc en el teclado (de fábrica pide dos). Solo toca esas
# claves de retroarch.cfg; si el archivo aún no existe, lo crea con ellas y RetroArch completa el resto.
# Uso: bash scripts/configurar-retroarch.sh
set -euo pipefail

# Es la configuración de la versión de Flathub, la misma carpeta de carpetaNucleos en emulators.json.
CFG="$HOME/.var/app/org.libretro.RetroArch/config/retroarch/retroarch.cfg"
declare -A AJUSTES=(
  [input_quit_gamepad_combo]=4 # 4 es Start + Select en la lista de combinaciones de RetroArch
  [quit_press_twice]=false
)

# RetroArch guarda su configuración al cerrarse: si está abierto, borraría estos cambios. Se pregunta a
# Flatpak y no a pgrep -f, que también encuentra cualquier comando que mencione la ruta.
if flatpak ps --columns=application | grep -qx org.libretro.RetroArch; then
  echo "RetroArch está abierto; ciérralo y vuelve a correr este script." >&2
  exit 1
fi

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
