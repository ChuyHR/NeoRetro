#!/usr/bin/env bash
# Neo Arcade con la biblioteca real del usuario (roms/ con sus gamelist.xml), en la TV y con el teclado:
# la pantalla principal con las carátulas, cambiar de sistema, abrir un juego desde el menú, volver con
# Esc y abrir Detalles. Lo que se recuerda va a una carpeta aparte; roms/ y media/ solo se leen.
# Uso, en la MP80: bash scripts/prueba-biblioteca-real-en-tv.sh [pulsaciones de Av Pág hasta el sistema]
set -u
cd "$(dirname "$0")/.."
export DISPLAY=${DISPLAY:-:0} XAUTHORITY=${XAUTHORITY:-$HOME/.Xauthority}
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}
export DBUS_SESSION_BUS_ADDRESS=${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}

SALIDA=/tmp/prueba-biblioteca-real
SISTEMAS=${1:-1}
rm -rf "$SALIDA" && mkdir -p "$SALIDA"
informe() { echo "$*" | tee -a "$SALIDA/resultado.txt"; }
captura() { xwd -root -silent >"$SALIDA/c.xwd" && python3 scripts/herramientas/xwd-a-png.py "$SALIDA/c.xwd" "$SALIDA/$1.png"; rm -f "$SALIDA/c.xwd"; }
tecla() { xdotool keydown "$1"; sleep "${2:-0.15}"; xdotool keyup "$1"; }
ms() { date +%s%3N; }
esperar() { local limite=$(($(ms) + $1 * 1000)); shift; until "$@"; do [ "$(ms)" -gt "$limite" ] && return 1; sleep 0.05; done; }
neo_visible() { xdotool search --onlyvisible --name "^Neo Arcade$" >/dev/null 2>&1; }
ra_abierto() { pgrep -x retroarch >/dev/null; }
ra_cerrado() { ! pgrep -x retroarch >/dev/null; }

t0=$(ms)
NEO_ARCADE_DATOS=$SALIDA/datos setsid ./node_modules/.bin/electron . >"$SALIDA/neo.log" 2>&1 &
esperar 60 neo_visible || { informe "FALLA: Neo Arcade no abrió"; exit 1; }
trap 'pkill -x electron' EXIT
informe "Neo Arcade visible $(( $(ms) - t0 )) ms después de arrancar"
sleep 5
captura 1-todos
informe "$(grep -P '\tbiblioteca\t' "$SALIDA/datos/registros/neo-arcade.log" | cut -f3-)"
for _ in $(seq "$SISTEMAS"); do tecla Next; sleep 0.6; done
sleep 2
captura 2-sistema
tecla Return
esperar 20 ra_abierto || { informe "FALLA: el juego no abrió"; captura 3-sin-juego; exit 1; }
sleep 10
captura 3-juego
t1=$(ms)
tecla Escape 0.3
esperar 15 ra_cerrado || informe "FALLA: RetroArch no cerró con Esc"
esperar 15 neo_visible || informe "FALLA: Neo Arcade no volvió"
informe "Esc → Neo Arcade visible en $(( $(ms) - t1 )) ms"
sleep 1.5
captura 4-de-vuelta
tecla Down; sleep 0.3; tecla Down; sleep 0.3; tecla Return; sleep 1.5
captura 5-detalles
tecla BackSpace; sleep 0.5
informe "$(grep -P '\tlanzamiento\t' "$SALIDA/datos/registros/neo-arcade.log" | cut -f3- | sed "s#$HOME#~#g")"
