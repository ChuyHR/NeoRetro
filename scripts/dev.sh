#!/usr/bin/env bash
# Abre Neo Arcade en modo desarrollo: pantalla completa, y Esc la cierra.
# Uso: npm start            (o npm start -- --captura=archivo.png para guardar la pantalla y salir)
set -euo pipefail
cd "$(dirname "$0")/.."

opciones=()
if grep -qi microsoft /proc/version 2>/dev/null; then
  # Solo en WSL: Mesa no elige por su cuenta el controlador que llega a la GPU de Windows, y en /mnt
  # el archivo chrome-sandbox no puede tener el permiso que necesita.
  export GALLIUM_DRIVER=d3d12
  opciones+=(--no-sandbox)
fi

exec ./node_modules/.bin/electron "${opciones[@]}" . "$@"
