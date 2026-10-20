#!/usr/bin/env bash
# Abre Neo Arcade en modo desarrollo: pantalla completa, y Esc la cierra.
# Uso: npm start            (o npm start -- --captura=archivo.png para guardar la pantalla y salir)
set -euo pipefail
exec bash "$(dirname "$0")/electron.sh" . "$@"
