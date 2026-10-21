#!/usr/bin/env bash
# Prueba de la fase 7 en la pantalla real: fluidez del carrusel con 3.000 juegos con carátula y el mando
# (virtual, pide sudo) moviéndose rápido, a 60 Hz y a la frecuencia que tenga la TV. Usa NEO_ARCADE_MEDIR,
# que escribe cada 10 s los cuadros por segundo y los cuadros lentos. Al terminar deja la TV como estaba.
# Uso, en la MP80: bash scripts/prueba-fluidez-en-tv.sh
set -u
cd "$(dirname "$0")/.."
export DISPLAY=${DISPLAY:-:0} XAUTHORITY=${XAUTHORITY:-$HOME/.Xauthority}
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}
export DBUS_SESSION_BUS_ADDRESS=${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}

BASE=$HOME/juegos-de-prueba-grande
SALIDA=/tmp/prueba-fluidez
rm -rf "$SALIDA" && mkdir -p "$SALIDA"
if [ ! -d "$BASE/roms" ]; then
  timeout 900 ./node_modules/.bin/electron scripts/biblioteca-grande.mjs "$BASE" 3000 2>/dev/null | grep -v "^\["
fi
SALIDA_HDMI=$(xrandr | awk '/ connected/ {print $1; exit}')
FRECUENCIA_ORIGINAL=$(xrandr | awk '/\*/ {for (i = 2; i <= NF; i++) if ($i ~ /\*/) {gsub(/[*+]/, "", $i); print $i; exit}}')

informe() { echo "$*" | tee -a "$SALIDA/resultado.txt"; }
captura() { xwd -root -silent >"$SALIDA/c.xwd" && python3 scripts/herramientas/xwd-a-png.py "$SALIDA/c.xwd" "$SALIDA/$1.png"; rm -f "$SALIDA/c.xwd"; }
xbox() { echo "$*" >&3; sleep 0.2; }
medicion() { grep "\[medir\]" "$SALIDA/neo.log" | sed 's/^\[página [0-9]*\] //; s/ (inicio.js:[0-9]*)//' | tail -n "$1"; }

mkfifo "$SALIDA/tubo"
sudo python3 scripts/herramientas/mando-virtual.py xbox <"$SALIDA/tubo" >"$SALIDA/mando.log" 2>&1 &
exec 3>"$SALIDA/tubo"
trap 'exec 3>&- 2>/dev/null; pkill -x electron; sudo pkill -f "herramientas/mando-[v]irtual"; xrandr --output "$SALIDA_HDMI" --mode 1920x1080 --rate "$FRECUENCIA_ORIGINAL"' EXIT

# FRECUENCIAS="60" mide solo a 60 Hz; SOLO_RAPIDO=1 mide solo el carrusel con la dirección sostenida.
# NEO_ARCADE_CSS, si se exporta, agrega reglas a la página (para medir sin un efecto).
for frecuencia in ${FRECUENCIAS:-60 $FRECUENCIA_ORIGINAL}; do
  xrandr --output "$SALIDA_HDMI" --mode 1920x1080 --rate "$frecuencia"
  sleep 2
  : >"$SALIDA/neo.log"
  NEO_ARCADE_MEDIR=1 NEO_ARCADE_ROMS=$BASE/roms NEO_ARCADE_MEDIOS=$BASE/media NEO_ARCADE_DATOS=$SALIDA/datos-$frecuencia \
    setsid ./node_modules/.bin/electron . >"$SALIDA/neo.log" 2>&1 &
  sleep 0.9; captura "arranque-$frecuencia-hz"
  sleep 9.5 # arranque y una medición en reposo
  informe "== TV a $frecuencia Hz, $(grep -o 'biblioteca.*' "$SALIDA/datos-$frecuencia/registros/neo-arcade.log" | head -1 | cut -c1-80)"
  informe "En reposo: $(medicion 1)"
  xbox bajar derecha; sleep 10.2; xbox subir derecha
  informe "Derecha sostenida 10 s (un juego cada 90 ms): $(medicion 1)"
  captura "carrusel-rapido-$frecuencia-hz"
  if [ "${SOLO_RAPIDO:-}" = 1 ]; then pkill -x electron; sleep 2; continue; fi
  for vez in $(seq 1 12); do xbox pulsar rb; sleep 0.6; done
  informe "Cambiar de sistema cada 0.8 s: $(medicion 1)"
  for vez in $(seq 1 14); do xbox pulsar rt; sleep 0.5; done
  informe "Saltar de letra cada 0.7 s: $(medicion 1)"
  pkill -x electron
  sleep 2
done
