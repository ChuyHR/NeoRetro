#!/usr/bin/env bash
# Prueba de la fase 6 en la pantalla real, con un mando de Xbox virtual (pide sudo) y RetroArch de
# verdad, sin tocar el teclado:
#   1. Marca tres favoritos con X, abre el filtro con View y quita uno.
#   2. Abre cuatro juegos (copias del programa de prueba de SNES) y sale de cada uno con Select + Start:
#      Recientes debe mostrarlos con el último primero.
#   3. En Configuración elige «Salir del juego: MANTENER START» y el color naranja; abre un juego y sale
#      manteniendo Start.
#   4. Cierra Neo Arcade y lo vuelve a abrir: todo debe seguir donde estaba.
# Arma su biblioteca en ~/juegos-de-prueba-datos (nunca en roms/). Capturas y resultado.txt en
# /tmp/prueba-datos/. Uso, en la MP80: bash scripts/prueba-datos-en-tv.sh
set -u
cd "$(dirname "$0")/.."
export DISPLAY=${DISPLAY:-:0} XAUTHORITY=${XAUTHORITY:-$HOME/.Xauthority}
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}
export DBUS_SESSION_BUS_ADDRESS=${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}

BASE=$HOME/juegos-de-prueba-datos
SALIDA=/tmp/prueba-datos
rm -rf "$SALIDA" "$BASE" && mkdir -p "$SALIDA" "$BASE/roms/snes" "$BASE/roms/nes"
node scripts/juego-de-prueba-snes.mjs "$SALIDA" >/dev/null
for letra in A B C D; do cp "$SALIDA/Prueba de control (Neo Arcade).sfc" "$BASE/roms/snes/Prueba $letra.sfc"; done
for titulo in Aero Bomber; do : >"$BASE/roms/nes/$titulo.nes"; done
bash scripts/configurar-retroarch.sh >/dev/null
CFG=$HOME/.var/app/org.libretro.RetroArch/config/retroarch/retroarch.cfg

ms() { date +%s%3N; }
informe() { echo "$*" | tee -a "$SALIDA/resultado.txt"; }
captura() { xwd -root -silent >"$SALIDA/c.xwd" && python3 scripts/herramientas/xwd-a-png.py "$SALIDA/c.xwd" "$SALIDA/$1.png"; rm -f "$SALIDA/c.xwd"; }
esperar() { local limite=$(($(ms) + $1 * 1000)); shift; until "$@"; do [ "$(ms)" -gt "$limite" ] && return 1; sleep 0.02; done; }
neo_visible() { xdotool search --onlyvisible --name "^Neo Arcade$" >/dev/null 2>&1; }
ra_abierto() { pgrep -x retroarch >/dev/null; }
ra_cerrado() { ! pgrep -x retroarch >/dev/null; }
xbox() { echo "$*" >&3; sleep 0.3; }

abrir_neo() {
  NEO_ARCADE_DEPURAR=1 NEO_ARCADE_ROMS=$BASE/roms NEO_ARCADE_DATOS=$BASE/datos setsid ./node_modules/.bin/electron . >>"$SALIDA/neo.log" 2>&1 &
  esperar 30 neo_visible || { informe "FALLA: Neo Arcade no abrió"; exit 1; }
  sleep 3
}
# Abre el juego elegido con A y sale con la combinación que se le pase («select-start» o «start»).
jugar_y_salir() {
  xbox pulsar a
  esperar 15 ra_abierto || { informe "FALLA: RetroArch no arrancó"; return 1; }
  sleep 4
  local t0
  t0=$(ms)
  if [ "$1" = start ]; then
    xbox bajar menu; sleep 2.6; xbox subir menu
  else
    xbox bajar view; xbox bajar menu; sleep 0.3; xbox subir menu; xbox subir view
  fi
  esperar 10 ra_cerrado || { informe "FALLA: RetroArch no cerró con $1"; xbox pulsar guia; return 1; }
  esperar 10 neo_visible
  informe "  salir con $1: de vuelta en $(($(ms) - t0)) ms"
  sleep 1
}

mkfifo "$SALIDA/tubo"
sudo python3 scripts/herramientas/mando-virtual.py xbox <"$SALIDA/tubo" >"$SALIDA/mando.log" 2>&1 &
exec 3>"$SALIDA/tubo"
# El patrón con corchetes no se encuentra a sí mismo en la línea de comandos de pkill. Al terminar,
# RetroArch vuelve a salir con Select + Start: la prueba lo deja en «mantener Start».
trap 'exec 3>&- 2>/dev/null; pkill -x electron; sudo pkill -f "herramientas/mando-[v]irtual"; bash scripts/configurar-retroarch.sh >/dev/null' EXIT
abrir_neo
sleep 1

informe "== Favoritos"
xbox pulsar x; xbox pulsar derecha; xbox pulsar x; xbox pulsar derecha; xbox pulsar x # Aero, Bomber, Prueba A
xbox pulsar view; sleep 0.5; captura 01-favoritos-tres
xbox pulsar x; sleep 0.5; captura 02-favoritos-quitado-uno
informe "Favoritos guardados: $(sleep 1.5; python3 -c "import json,sys; print(json.load(open('$BASE/datos/datos-usuario.json'))['favoritos'])")"

informe "== Recientes"
xbox pulsar view; sleep 0.3 # de Favoritos a «todos»: aún no hay recientes
xbox pulsar rb; xbox pulsar rb; sleep 0.3 # SNES (todos → NES → SNES)
for letra in A B C D; do
  jugar_y_salir select-start
  xbox pulsar derecha
done
xbox pulsar view; xbox pulsar view; sleep 0.6; captura 03-recientes
informe "Recientes guardados: $(sleep 1.5; python3 -c "import json; d=json.load(open('$BASE/datos/datos-usuario.json')); print([r['id'] for r in d['recientes']])")"

informe "== Configuración"
xbox pulsar menu; sleep 0.4
for fila in 1 2 3 4 5; do xbox pulsar abajo; done
xbox pulsar derecha; xbox pulsar a # Salir del juego: MANTENER START
xbox pulsar arriba; xbox pulsar derecha; xbox pulsar derecha; xbox pulsar derecha; xbox pulsar a # tema naranja
sleep 0.4; captura 04-configuracion
xbox pulsar b; sleep 0.5
jugar_y_salir start
informe "retroarch.cfg: $(grep '^input_quit_gamepad_combo' "$CFG")"
captura 05-de-vuelta-con-mantener-start
antes=$(sleep 1.5; python3 -c "import json; d=json.load(open('$BASE/datos/datos-usuario.json')); print(d['ultimoSistema'], d['ultimoPorSistema'].get(d['ultimoSistema']), d['ajustes']['tema'], d['ajustes']['salir'])")

informe "== Cerrar y volver a abrir"
pkill -x electron
esperar 10 bash -c '! pgrep -x electron >/dev/null'
abrir_neo
captura 06-al-volver-a-abrir
informe "Antes de cerrar: $antes"
informe "Al volver a abrir: $(python3 -c "import json; d=json.load(open('$BASE/datos/datos-usuario.json')); print(d['ultimoSistema'], d['ultimoPorSistema'].get(d['ultimoSistema']), d['ajustes']['tema'], d['ajustes']['salir'])")"

informe ""
informe "datos-usuario.json:"
sed "s#$HOME#~#g" "$BASE/datos/datos-usuario.json" | tee -a "$SALIDA/resultado.txt"
