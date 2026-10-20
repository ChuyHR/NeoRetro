#!/usr/bin/env bash
# Abre Electron con lo que necesita WSL. Lo usan dev.sh y las herramientas de verificación.
# Uso: bash scripts/electron.sh <app o script> [argumentos]
set -euo pipefail
cd "$(dirname "$0")/.."

opciones=()
if grep -qi microsoft /proc/version 2>/dev/null; then
  # Solo en WSL: Mesa no elige por su cuenta el controlador que llega a la GPU de Windows, y en /mnt
  # el archivo chrome-sandbox no puede tener el permiso que necesita.
  export GALLIUM_DRIVER=d3d12
  opciones+=(--no-sandbox)
fi

exec ./node_modules/.bin/electron "${opciones[@]}" "$@"
