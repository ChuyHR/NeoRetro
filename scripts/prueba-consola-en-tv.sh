#!/usr/bin/env bash
# Prueba de la consola instalada en un equipo real (sesión de Cage, sin escritorio), por SSH: cuánto
# tardó en arrancar, que Neo Arcade esté a la vista, y un juego abierto y cerrado con el mando virtual de
# Xbox. Las capturas salen de la TV con grim (Wayland). Pide sudo (el mando virtual usa uinput).
# Uso, en el equipo con la consola instalada: bash scripts/prueba-consola-en-tv.sh [pulsaciones de RB]
set -u
cd "$(dirname "$0")/.."
export XDG_RUNTIME_DIR=/run/user/$(id -u) WAYLAND_DISPLAY=wayland-0
SALIDA=/tmp/prueba-consola
RB=${1:-3}
REGISTRO=$HOME/NeoRetro/logs/neo-arcade.log
rm -rf "$SALIDA" && mkdir -p "$SALIDA"
informe() { echo "$*" | tee -a "$SALIDA/resultado.txt"; }
captura() { grim -s 0.5 "$SALIDA/$1.png" 2>/dev/null || informe "(no se pudo capturar $1)"; }
ms() { date +%s%3N; }
esperar() { local limite=$(($(ms) + $1 * 1000)); shift; until "$@"; do [ "$(ms)" -gt "$limite" ] && return 1; sleep 0.1; done; }
ra_abierto() { pgrep -x retroarch >/dev/null; }
ra_cerrado() { ! pgrep -x retroarch >/dev/null; }
xbox() { echo "$*" >&3; sleep 0.4; }

informe "== Arranque"
informe "systemd-analyze: $(systemd-analyze 2>&1 | head -1)"
informe "neo-arcade.service: $(systemctl is-active neo-arcade.service), activo desde $(systemctl show -p ActiveEnterTimestampMonotonic --value neo-arcade.service | awk '{printf "%.1f s", $1/1000000}') después de arrancar el núcleo"
arranque=$(date -d "$(uptime -s)" +%s)
primera=$(grep -P '\tbiblioteca\t' "$REGISTRO" | tail -1 | cut -f1)
[ -n "$primera" ] && informe "Biblioteca lista $(( $(date -d "$primera" +%s) - arranque )) s después de arrancar el núcleo: $(grep -P '\tbiblioteca\t' "$REGISTRO" | tail -1 | cut -f3-)"
informe "Sonido: $(wpctl status 2>/dev/null | sed -n '/Sinks:/,/Sources:/p' | grep -E '\*' | head -1 | sed 's/^[ │├└─*]*//' || echo 'sin datos')"
captura 1-al-encender

informe "== Un juego con el mando"
mkfifo "$SALIDA/tubo"
sudo python3 scripts/herramientas/mando-virtual.py xbox <"$SALIDA/tubo" >"$SALIDA/mando.log" 2>&1 &
exec 3>"$SALIDA/tubo"
trap 'exec 3>&- 2>/dev/null; sudo pkill -f "herramientas/mando-[v]irtual"' EXIT
sleep 3
for _ in $(seq "$RB"); do xbox pulsar rb; done
sleep 1.5; captura 2-sistema
xbox pulsar a
if esperar 25 ra_abierto; then
  sleep 10; captura 3-juego
  t=$(ms)
  xbox bajar view; xbox bajar menu; sleep 0.3; xbox subir menu; xbox subir view
  esperar 15 ra_cerrado && informe "Select + Start: el juego se cerró en $(( $(ms) - t )) ms" || informe "FALLA: Select + Start no cerró el juego"
  sleep 2; captura 4-de-vuelta
else
  informe "FALLA: el juego no abrió"; captura 3-sin-juego
fi
informe "Registro:"
tail -4 "$REGISTRO" | cut -c1-220 | sed "s#$HOME#~#g" | tee -a "$SALIDA/resultado.txt"
