#!/usr/bin/env bash
# Abre en la TV, uno tras otro, juegos reales de la biblioteca del usuario con el mismo comando que usa
# Neo Arcade (scripts/herramientas/comando-de-juego.mjs). De cada uno anota si el emulador abrió, si
# seguía abierto a los $SEGUNDOS segundos (si sale con error antes, no pudo con el juego), una captura
# de la TV y cómo salió con Esc. No toca roms/: solo lee los juegos.
# Uso, en la MP80: bash scripts/prueba-juegos-reales-en-tv.sh <sistema/archivo> [...]
set -u
cd "$(dirname "$0")/.."
export DISPLAY=${DISPLAY:-:0} XAUTHORITY=${XAUTHORITY:-$HOME/.Xauthority}
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}
export DBUS_SESSION_BUS_ADDRESS=${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}

SALIDA=/tmp/prueba-juegos
SEGUNDOS=${SEGUNDOS:-15}
rm -rf "$SALIDA" && mkdir -p "$SALIDA"
informe() { echo "$*" | tee -a "$SALIDA/resultado.txt"; }
captura() { xwd -root -silent >"$SALIDA/c.xwd" && python3 scripts/herramientas/xwd-a-png.py "$SALIDA/c.xwd" "$SALIDA/$1.png"; rm -f "$SALIDA/c.xwd"; }
ms() { date +%s%3N; }
# El proceso del emulador dentro de su caja de Flathub, según el emulador.
proceso() { pgrep -n -x retroarch || pgrep -n -f "^/app/bin/dolphin-emu" || pgrep -n -x PPSSPPSDL; }

n=0
for id in "$@"; do
  n=$((n + 1))
  comando=$(node scripts/herramientas/comando-de-juego.mjs "$id")
  if echo "$comando" | grep -q '"error"'; then
    informe "$id: NO SE ABRE: $(echo "$comando" | python3 -c 'import json,sys; print(json.load(sys.stdin)["error"])')"
    continue
  fi
  mapfile -t partes < <(echo "$comando" | python3 -c 'import json,sys; c=json.load(sys.stdin); print(c["programa"]); [print(a) for a in c["argumentos"]]')
  t0=$(ms)
  setsid "${partes[@]}" >"$SALIDA/$n.log" 2>&1 &
  lanzador=$!
  pid=""
  for _ in $(seq 100); do pid=$(proceso) && break; kill -0 "$lanzador" 2>/dev/null || break; sleep 0.2; done
  if [ -z "$pid" ]; then
    wait "$lanzador"; codigo=$?
    informe "$id: FALLA: el emulador no llegó a abrir (salida $codigo en $(( $(ms) - t0 )) ms). $(tail -c 300 "$SALIDA/$n.log" | tr '\n' ' ')"
    continue
  fi
  abrio=$(( $(ms) - t0 ))
  sleep "$SEGUNDOS"
  nombre=$(printf '%02d-%s' "$n" "$(basename "$id" | tr -c 'A-Za-z0-9._-' '_' | cut -c1-40)")
  if ! kill -0 "$lanzador" 2>/dev/null; then
    wait "$lanzador"; codigo=$?
    informe "$id: FALLA: el emulador se cerró solo antes de ${SEGUNDOS} s (salida $codigo). $(tail -c 300 "$SALIDA/$n.log" | tr '\n' ' ')"
    continue
  fi
  captura "$nombre"
  # Una pulsación de persona: RetroArch lee el teclado una vez por cuadro y no ve un pulso más corto.
  ventana=$(xdotool search --onlyvisible --pid "$pid" 2>/dev/null | head -1)
  [ -n "$ventana" ] && xdotool windowactivate "$ventana" 2>/dev/null
  xdotool keydown Escape; sleep 0.3; xdotool keyup Escape
  for _ in $(seq 50); do kill -0 "$lanzador" 2>/dev/null || break; sleep 0.2; done
  if kill -0 "$lanzador" 2>/dev/null; then
    kill -INT "$(proceso)" 2>/dev/null; sleep 2
    salida="no cerró con Esc (se cerró con SIGINT)"
  else
    wait "$lanzador"; salida="cerró con Esc (salida $?)"
  fi
  informe "$id: OK: abrió en $abrio ms, seguía abierto a los $SEGUNDOS s, $salida; captura $nombre.png"
  sleep 1
done
