#!/usr/bin/env bash
# Prueba de la versión final (empaquetada, en modo de producción) con la biblioteca real del usuario, en
# la TV y con el mando virtual de Xbox, como la usaría una persona: carátulas, cambiar de sistema, mover
# el carrusel rápido, saltar de letra, favoritos, buscar, abrir un juego y salir con Select + Start,
# Esc que ya no cierra la app, Configuración y Detalles. No toca Apagar ni Reiniciar: en la versión final
# apagarían el equipo. Lo que se recuerda va a una carpeta aparte; roms/ solo se lee. Pide sudo (uinput).
# Uso, en la MP80: bash scripts/prueba-version-final-en-tv.sh
set -u
cd "$(dirname "$0")/.."
export DISPLAY=${DISPLAY:-:0} XAUTHORITY=${XAUTHORITY:-$HOME/.Xauthority}
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}
export DBUS_SESSION_BUS_ADDRESS=${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}

SALIDA=/tmp/prueba-version-final
rm -rf "$SALIDA" && mkdir -p "$SALIDA"
bash scripts/empaquetar.sh >"$SALIDA/empaquetar.log" 2>&1 || { echo "No se pudo empaquetar"; exit 1; }
informe() { echo "$*" | tee -a "$SALIDA/resultado.txt"; }
captura() { xwd -root -silent >"$SALIDA/c.xwd" && python3 scripts/herramientas/xwd-a-png.py "$SALIDA/c.xwd" "$SALIDA/$1.png"; rm -f "$SALIDA/c.xwd"; }
ms() { date +%s%3N; }
esperar() { local limite=$(($(ms) + $1 * 1000)); shift; until "$@"; do [ "$(ms)" -gt "$limite" ] && return 1; sleep 0.05; done; }
neo_visible() { xdotool search --onlyvisible --name "^Neo Arcade$" >/dev/null 2>&1; }
ra_abierto() { pgrep -x retroarch >/dev/null; }
ra_cerrado() { ! pgrep -x retroarch >/dev/null; }
xbox() { echo "$*" >&3; sleep 0.35; }
registro() { grep -P "\t$1\t" "$SALIDA/datos/registros/neo-arcade.log" | tail -1 | cut -f3- | sed "s#$HOME#~#g"; }

mkfifo "$SALIDA/tubo"
sudo python3 scripts/herramientas/mando-virtual.py xbox <"$SALIDA/tubo" >"$SALIDA/mando.log" 2>&1 &
exec 3>"$SALIDA/tubo"
trap 'exec 3>&- 2>/dev/null; pkill -x neo-arcade; sudo pkill -f "herramientas/mando-[v]irtual"' EXIT
sleep 2

t0=$(ms)
NEO_ARCADE_ROMS=$HOME/NeoRetro/roms NEO_ARCADE_DATOS=$SALIDA/datos setsid dist/neo-arcade/neo-arcade >"$SALIDA/neo.log" 2>&1 &
esperar 60 neo_visible || { informe "FALLA: la versión final no abrió"; exit 1; }
informe "Versión final visible $(( $(ms) - t0 )) ms después de arrancar"
sleep 5
captura 01-inicio
informe "Biblioteca: $(registro biblioteca)"

informe "== Sistemas, carrusel y letras"
xbox pulsar rb; xbox pulsar rb; sleep 1; captura 02-rb-dos-sistemas
xbox bajar derecha; sleep 3; xbox subir derecha; sleep 1; captura 03-derecha-sostenida
xbox pulsar rt; sleep 0.8; captura 04-letra-siguiente

informe "== Favoritos"
xbox pulsar x; sleep 0.5
xbox pulsar view; sleep 1; captura 05-filtro-favoritos
informe "Favoritos guardados: $(sleep 1.5; python3 -c "import json; print(json.load(open('$SALIDA/datos/datos-usuario.json'))['favoritos'])" 2>/dev/null)"
xbox pulsar view; xbox pulsar view; sleep 0.5 # Recientes (vacío) y vuelta a todos

informe "== Buscar"
xbox pulsar y; sleep 0.6
xdotool type --delay 120 "sonic"; sleep 0.8
captura 06-buscar-sonic
xdotool key Return; sleep 1.2
captura 07-resultados-sonic

informe "== Abrir un juego y volver con Select + Start"
xbox pulsar a
if esperar 20 ra_abierto; then
  sleep 10; captura 08-juego
  t1=$(ms)
  xbox bajar view; xbox bajar menu; sleep 0.3; xbox subir menu; xbox subir view
  esperar 15 ra_cerrado || informe "FALLA: Select + Start no cerró el juego"
  esperar 15 neo_visible || informe "FALLA: la versión final no volvió"
  informe "Select + Start → de vuelta en $(( $(ms) - t1 )) ms"
  sleep 1.5; captura 09-de-vuelta
  informe "Lanzamiento: $(registro lanzamiento)"
else
  informe "FALLA: el juego no abrió"; captura 08-sin-juego
fi

informe "== Esc en la versión final"
xdotool key Escape; sleep 1.5
if neo_visible; then informe "OK: Esc no cierra la versión final"; else informe "FALLA: Esc cerró la versión final"; fi

informe "== Configuración y Detalles"
xbox pulsar menu; sleep 1; captura 10-configuracion
xbox pulsar b; sleep 0.6
xbox pulsar abajo; xbox pulsar abajo; xbox pulsar a; sleep 1; captura 11-detalles
xbox pulsar b; sleep 0.5
informe "Errores en el registro: $(grep -c -P '\terror\t' "$SALIDA/datos/registros/neo-arcade.log")"
