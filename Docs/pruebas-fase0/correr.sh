#!/usr/bin/env bash
# Pruebas de la fase 0, en Linux (el Debian de WSL o la MP80).
# Uso: bash Docs/pruebas-fase0/correr.sh
# Deja capturas y mediciones en Docs/pruebas-fase0/resultados/.
set -u

AQUI="$(cd "$(dirname "$0")" && pwd)"
DOCS="$(dirname "$AQUI")"
SALIDA="$AQUI/resultados"
mkdir -p "$SALIDA"
rm -f "$SALIDA"/resultado-*.txt

# Solo en WSL: Mesa no elige por su cuenta el controlador que llega a la GPU de Windows
# y sin esto todo se dibuja por software.
if grep -qi microsoft /proc/version; then
  export GALLIUM_DRIVER=d3d12
fi

python3 -m http.server 8765 --directory "$DOCS" >/dev/null 2>&1 &
SERVIDOR=$!
trap 'kill $SERVIDOR 2>/dev/null' EXIT
sleep 1
URL="http://localhost:8765/NeoArcade.dc.html"

echo "== WebKitGTK"
timeout 90 python3 "$AQUI/webkitgtk/prueba.py" "$URL" "$SALIDA"

echo "== Electron"
cd "$AQUI/electron" || exit 1
if [ ! -d node_modules ]; then
  inicio=$(date +%s)
  npm install --no-audit --no-fund
  echo "npm install: $(( $(date +%s) - inicio )) s" | tee -a "$SALIDA/resultado-electron.txt"
fi
# --no-sandbox porque en /mnt (disco de Windows) chrome-sandbox no puede ser SUID; en la MP80 no hace falta.
T_INICIO=$(date +%s%3N) SALIDA="$SALIDA" PROTO_URL="$URL" timeout 120 ./node_modules/.bin/electron --no-sandbox .

echo "== Comparación Electron / WebKitGTK"
python3 "$AQUI/comparar.py" "$SALIDA"
