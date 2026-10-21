#!/usr/bin/env bash
# Prueba del producto final «desconecto el control y lo vuelvo a conectar: sigue funcionando sin
# reiniciar». Con Neo Arcade abierto, conecta el mando virtual de Xbox, lo mueve, lo desconecta, conecta
# otro y lo vuelve a mover. Con NEO_ARCADE_DEPURAR, Neo Arcade escribe cada acción que le llega del mando;
# se cuenta cuántas llegaron después de reconectar. Pide sudo (el mando virtual usa uinput).
# Uso, en la MP80: bash scripts/prueba-reconexion-en-tv.sh
set -u
cd "$(dirname "$0")/.."
export DISPLAY=${DISPLAY:-:0} XAUTHORITY=${XAUTHORITY:-$HOME/.Xauthority}
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}
export DBUS_SESSION_BUS_ADDRESS=${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}

BASE=$HOME/juegos-de-prueba-reconexion
SALIDA=/tmp/prueba-reconexion
rm -rf "$SALIDA" "$BASE" && mkdir -p "$SALIDA" "$BASE/roms/snes"
for nombre in A B C D E; do : >"$BASE/roms/snes/Prueba $nombre.sfc"; done

informe() { echo "$*" | tee -a "$SALIDA/resultado.txt"; }
captura() { xwd -root -silent >"$SALIDA/c.xwd" && python3 scripts/herramientas/xwd-a-png.py "$SALIDA/c.xwd" "$SALIDA/$1.png"; rm -f "$SALIDA/c.xwd"; }
acciones() { grep -c '^\[mando\] derecha' "$SALIDA/neo.log"; }

NEO_ARCADE_DEPURAR=1 NEO_ARCADE_ROMS=$BASE/roms NEO_ARCADE_MEDIOS=$BASE/media NEO_ARCADE_DATOS=$BASE/datos \
  setsid ./node_modules/.bin/electron . >"$SALIDA/neo.log" 2>&1 &
trap 'pkill -x electron; sudo pkill -f "herramientas/mando-[v]irtual"' EXIT
sleep 8

# Un mando conectado: tres pasos a la derecha y se desconecta al cerrarse su entrada.
printf 'esperar 2500\npulsar derecha\nesperar 400\npulsar derecha\nesperar 400\npulsar derecha\nesperar 800\n' \
  | sudo python3 scripts/herramientas/mando-virtual.py xbox >"$SALIDA/mando-1.log" 2>&1
antes=$(acciones)
informe "Primer mando: $antes pasos a la derecha"
sleep 2
captura 1-tras-desconectar
# Otro mando, sin tocar Neo Arcade: otros tres pasos.
printf 'esperar 2500\npulsar derecha\nesperar 400\npulsar derecha\nesperar 400\npulsar derecha\nesperar 800\n' \
  | sudo python3 scripts/herramientas/mando-virtual.py xbox >"$SALIDA/mando-2.log" 2>&1
despues=$(($(acciones) - antes))
captura 2-tras-reconectar
informe "Mando reconectado: $despues pasos a la derecha"
if [ "$antes" -eq 3 ] && [ "$despues" -eq 3 ]; then informe "OK: el mando sigue funcionando tras desconectarlo y volver a conectarlo"; else informe "FALLA: se esperaban 3 y 3"; fi
informe ""
informe "Registro de Neo Arcade:"
grep -P '\tmando\t' "$BASE/datos/registros/neo-arcade.log" | sed "s#$HOME#~#g" | tee -a "$SALIDA/resultado.txt"
