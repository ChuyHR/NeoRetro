#!/usr/bin/env bash
# Prueba de la fase 7: uso simulado durante 30 minutos con 3.000 juegos y el mando virtual (pide sudo):
# recorrer el carrusel rápido y lento, cambiar de sistema, saltar de letra, abrir Detalles,
# Configuración y Buscar, marcar favoritos. Con NEO_ARCADE_MEDIR, Neo Arcade escribe cada minuto la
# memoria de cada proceso; al final se compara el primer minuto con el último.
# Uso, en la MP80: bash scripts/prueba-memoria-en-tv.sh [minutos, 30 por omisión]
set -u
cd "$(dirname "$0")/.."
export DISPLAY=${DISPLAY:-:0} XAUTHORITY=${XAUTHORITY:-$HOME/.Xauthority}
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}
export DBUS_SESSION_BUS_ADDRESS=${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}

MINUTOS=${1:-30}
BASE=$HOME/juegos-de-prueba-grande
SALIDA=/tmp/prueba-memoria
rm -rf "$SALIDA" && mkdir -p "$SALIDA"
[ -d "$BASE/roms" ] || ./node_modules/.bin/electron scripts/biblioteca-grande.mjs "$BASE" 3000 2>/dev/null | grep -v "^\["

xbox() { echo "$*" >&3; sleep 0.25; }
mkfifo "$SALIDA/tubo"
sudo python3 scripts/herramientas/mando-virtual.py xbox <"$SALIDA/tubo" >"$SALIDA/mando.log" 2>&1 &
exec 3>"$SALIDA/tubo"
trap 'exec 3>&- 2>/dev/null; pkill -x electron; sudo pkill -f "herramientas/mando-[v]irtual"' EXIT

NEO_ARCADE_MEDIR=1 NEO_ARCADE_ROMS=$BASE/roms NEO_ARCADE_MEDIOS=$BASE/media NEO_ARCADE_DATOS=$SALIDA/datos \
  setsid ./node_modules/.bin/electron . >"$SALIDA/neo.log" 2>&1 &
sleep 8

fin=$(($(date +%s) + MINUTOS * 60))
vuelta=0
while [ "$(date +%s)" -lt "$fin" ]; do
  vuelta=$((vuelta + 1))
  xbox bajar derecha; sleep 6; xbox subir derecha
  for paso in 1 2 3 4 5; do xbox pulsar izquierda; sleep 0.4; done
  xbox pulsar rb; xbox pulsar rb; xbox pulsar rt; xbox pulsar rt; xbox pulsar lt
  xbox pulsar x # favorito
  xbox pulsar abajo; xbox pulsar abajo; xbox pulsar a; sleep 1; xbox pulsar b # Detalles
  xbox pulsar arriba; xbox pulsar arriba
  xbox pulsar menu; xbox pulsar abajo; xbox pulsar abajo; sleep 0.5; xbox pulsar b # Configuración
  xbox pulsar y; xbox pulsar a; xbox pulsar derecha; xbox pulsar a; sleep 0.5; xbox pulsar b; xbox pulsar b # Buscar
  xbox pulsar view; sleep 0.5; xbox pulsar view; xbox pulsar view
  xbox bajar izquierda; sleep 4; xbox subir izquierda
  sleep 2
done

grep "memoria total" "$SALIDA/neo.log" | sed 's/^\[medir\] //' >"$SALIDA/memoria.txt"
{
  echo "Uso simulado durante $MINUTOS min ($vuelta vueltas de recorrido)."
  echo "Primer minuto: $(head -1 "$SALIDA/memoria.txt")"
  echo "Último minuto: $(tail -1 "$SALIDA/memoria.txt")"
  echo "Fluidez, últimas mediciones:"
  grep "cuadros/s" "$SALIDA/neo.log" | sed 's/^\[página [a-z]*\] \[medir\] //; s/ (inicio.js:[0-9]*)//' | tail -3
  echo
  echo "Memoria minuto a minuto:"
  cat "$SALIDA/memoria.txt"
} | tee "$SALIDA/resultado.txt"
