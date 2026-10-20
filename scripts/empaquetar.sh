#!/usr/bin/env bash
# Genera la versión final en dist/neo-arcade/: el motor de Electron con la app dentro, sin
# herramientas de empaquetado. Uso: npm run empaquetar
set -euo pipefail
raiz="$(cd "$(dirname "$0")/.." && pwd)"
motor="$raiz/node_modules/electron/dist"
destino="$raiz/dist/neo-arcade"

if [ ! -x "$motor/electron" ]; then
  echo "No está el motor de Electron. Corre npm install y vuelve a intentarlo." >&2
  exit 1
fi

rm -rf "$destino"
mkdir -p "$destino"
cp -a "$motor/." "$destino/"
# Con otro nombre de ejecutable, Electron se da por empaquetado (app.isPackaged): sin Esc para cerrar
# y sin herramientas de desarrollo.
mv "$destino/electron" "$destino/neo-arcade"
rm -f "$destino/resources/default_app.asar"

# Electron carga resources/app en lugar de su app de ejemplo.
mkdir -p "$destino/resources/app"
cp -a "$raiz/package.json" "$raiz/app" "$raiz/core" "$raiz/config" "$destino/resources/app/"

echo "Versión final en dist/neo-arcade/. Ejecutable: dist/neo-arcade/neo-arcade"
