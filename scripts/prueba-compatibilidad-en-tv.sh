#!/usr/bin/env bash
# Barrido de compatibilidad en la TV: abre cada juego de las carpetas indicadas con el comando de Neo
# Arcade y, a los $SEGUNDOS segundos, anota si el emulador lo rechazó (se cerró solo), si lo muestra
# o si sigue con la pantalla en negro (puede ser una pantalla de arranque lenta: hay que mirarlo). Lo
# cierra y pasa al siguiente. Solo lee los juegos. Resultado en /tmp/compatibilidad/<sistema>.tsv.
# Uso, en la MP80: bash scripts/prueba-compatibilidad-en-tv.sh arcade neogeo
set -u
cd "$(dirname "$0")/.."
export DISPLAY=${DISPLAY:-:0} XAUTHORITY=${XAUTHORITY:-$HOME/.Xauthority}
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}
export DBUS_SESSION_BUS_ADDRESS=${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}

SALIDA=/tmp/compatibilidad
SEGUNDOS=${SEGUNDOS:-6}
mkdir -p "$SALIDA"
# Porcentaje de la pantalla que no es negra, de una captura de xwd (24 o 32 bits).
claridad() {
  xwd -root -silent | python3 -c '
import struct, sys
d = sys.stdin.buffer.read(); c = struct.unpack(">25I", d[:100])
cab, ancho, alto, bpp, linea, ncol = c[0], c[4], c[5], c[11], c[12], c[19]
paso = bpp // 8; ini = cab + ncol * 12; claros = total = 0
for y in range(0, alto, 8):
    f = d[ini + y * linea: ini + y * linea + ancho * paso]
    for x in range(0, ancho * paso, 8 * paso):
        total += 1; claros += max(f[x:x + 3]) > 30
print(round(100 * claros / max(total, 1), 1))'
}

for sistema in "$@"; do
  tsv="$SALIDA/$sistema.tsv"
  : >"$tsv"
  while IFS= read -r archivo; do
    id="$sistema/$archivo"
    comando=$(node scripts/herramientas/comando-de-juego.mjs "$id")
    if echo "$comando" | grep -q '"error"'; then
      printf '%s\tno se abre\t%s\n' "$archivo" "$(echo "$comando" | cut -c1-120)" >>"$tsv"; continue
    fi
    mapfile -t partes < <(echo "$comando" | python3 -c 'import json,sys; c=json.load(sys.stdin); print(c["programa"]); [print(a) for a in c["argumentos"]]')
    setsid "${partes[@]}" >"$SALIDA/ultimo.log" 2>&1 &
    lanzador=$!
    for _ in $(seq $((SEGUNDOS * 5))); do kill -0 "$lanzador" 2>/dev/null || break; sleep 0.2; done
    if ! kill -0 "$lanzador" 2>/dev/null; then
      wait "$lanzador"; codigo=$?
      printf '%s\trechazado\tsalida %s: %s\n' "$archivo" "$codigo" "$(grep -i -m1 -E 'error|fail|missing|not found' "$SALIDA/ultimo.log" | cut -c1-140)" >>"$tsv"
      continue
    fi
    luz=$(claridad)
    estado=$(python3 -c "print('se ve' if $luz >= 2 else 'pantalla negra')")
    printf '%s\t%s\t%s %% de la pantalla con imagen\n' "$archivo" "$estado" "$luz" >>"$tsv"
    kill -INT "$(pgrep -n -x retroarch)" 2>/dev/null
    for _ in $(seq 50); do kill -0 "$lanzador" 2>/dev/null || break; sleep 0.2; done
    kill -0 "$lanzador" 2>/dev/null && { pkill -KILL -x retroarch; sleep 1; }
  done < <(cd "roms/$sistema" && ls | grep -i -E '\.(zip|7z)$' | grep -v -x -i 'neogeo.zip')
done
echo listo >"$SALIDA/fin"
