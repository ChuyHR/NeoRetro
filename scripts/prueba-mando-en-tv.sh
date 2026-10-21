#!/usr/bin/env bash
# Prueba de la fase 4 en la pantalla real, con mandos virtuales (scripts/herramientas/mando-virtual.py,
# que pide sudo) y RetroArch de verdad. Toda la prueba se hace sin tocar el teclado:
#   1. Mando de Xbox: navegar, repetir al sostener, saltar de letra, favorito, cambiar de sistema,
#      Configuración, «Probar control», abrir el programa de prueba de SNES, pulsar A dentro del juego
#      y salir con Select + Start.
#   2. Palanca de arcade (no sigue la norma de Linux): «Configurar control» se abre solo, se recorren
#      los pasos, y luego la palanca sirve en Neo Arcade y dentro de RetroArch con su perfil.
# Arma su biblioteca en ~/juegos-de-prueba-mando (nunca en roms/). Capturas y resultado.txt en
# /tmp/prueba-mando/. Uso, en la MP80: bash scripts/prueba-mando-en-tv.sh
set -u
cd "$(dirname "$0")/.."
export DISPLAY=${DISPLAY:-:0} XAUTHORITY=${XAUTHORITY:-$HOME/.Xauthority}
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}
export DBUS_SESSION_BUS_ADDRESS=${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}

BASE=$HOME/juegos-de-prueba-mando
SALIDA=/tmp/prueba-mando
PERFILES=$HOME/.var/app/org.libretro.RetroArch/config/retroarch/autoconfig/udev
rm -rf "$SALIDA" "$BASE" && mkdir -p "$SALIDA" "$BASE/roms/snes" "$BASE/roms/nes"
node scripts/juego-de-prueba-snes.mjs "$BASE/roms/snes" >/dev/null
# Una letra por juego y bastantes para que la repetición no dé la vuelta: sostener 1.25 s son 11 pasos.
for titulo in Aero Bomber Castillo Dragon Eclipse Fuego Galaxia Halcon Isla Jungla Koala Lince Mamut Nube \
  Ocaso Pirata Quasar Rayo Sable Trueno Union Vortex Waka Xenon Yeti Zafiro; do : >"$BASE/roms/nes/$titulo.nes"; done
bash scripts/configurar-retroarch.sh >/dev/null
rm -f "$PERFILES"/neo-arcade-*.cfg

ms() { date +%s%3N; }
informe() { echo "$*" | tee -a "$SALIDA/resultado.txt"; }
captura() { xwd -root -silent >"$SALIDA/c.xwd" && python3 scripts/herramientas/xwd-a-png.py "$SALIDA/c.xwd" "$SALIDA/$1.png"; rm -f "$SALIDA/c.xwd"; }
esperar() { local limite=$(($(ms) + $1 * 1000)); shift; until "$@"; do [ "$(ms)" -gt "$limite" ] && return 1; sleep 0.02; done; }
neo_visible() { xdotool search --onlyvisible --name "^Neo Arcade$" >/dev/null 2>&1; }
ra_abierto() { pgrep -x retroarch >/dev/null; }
ra_cerrado() { ! pgrep -x retroarch >/dev/null; }

# Cada mando virtual lee sus órdenes de una tubería; el descriptor 3 es el de Xbox y el 4, la palanca.
conectar() {
  mkfifo "$SALIDA/tubo-$1"
  sudo python3 scripts/herramientas/mando-virtual.py "$1" <"$SALIDA/tubo-$1" >"$SALIDA/mando-$1.log" 2>&1 &
  eval "exec $2>\"$SALIDA/tubo-$1\""
  sleep 2.5 # el lector revisa los dispositivos cada segundo
}
xbox() { echo "$*" >&3; sleep 0.25; }
palanca() { echo "$*" >&4; sleep 0.25; }

NEO_ARCADE_DEPURAR=1 NEO_ARCADE_ROMS=$BASE/roms NEO_ARCADE_DATOS=$BASE/datos setsid ./node_modules/.bin/electron . >"$SALIDA/neo.log" 2>&1 &
esperar 30 neo_visible || { informe "Neo Arcade no abrió"; exit 1; }
# El patrón con corchetes no se encuentra a sí mismo en la línea de comandos de pkill.
trap 'exec 3>&- 4>&- 2>/dev/null; pkill -x electron; sudo pkill -f "herramientas/mando-[v]irtual"' EXIT
sleep 3
captura 01-inicio-con-teclado

informe "== Mando de Xbox"
conectar xbox 3
xbox pulsar derecha; sleep 0.5; captura 02-una-derecha # Bomber
xbox bajar derecha; sleep 1.0; xbox subir derecha; sleep 0.5; captura 03-derecha-sostenida # 11 pasos más: Mamut
xbox pulsar lt; sleep 0.5; captura 04-letra-anterior # Lince
xbox pulsar x; sleep 0.5; captura 05-favorito
xbox pulsar abajo; xbox pulsar abajo; xbox pulsar a; sleep 0.6; captura 05b-detalles
xbox pulsar b; xbox pulsar arriba; xbox pulsar arriba; sleep 0.5
xbox pulsar rb; sleep 0.5; captura 06-sistema-siguiente
xbox pulsar menu; sleep 0.6; captura 07-configuracion
for fila in 1 2 3 4 5 6; do xbox pulsar abajo; done # la fila de Control, en PROBAR
xbox pulsar a; sleep 0.5
xbox bajar a; xbox bajar rt; sleep 0.5; captura 08-probar-control-a-y-rt; xbox subir a; xbox subir rt
xbox bajar b; sleep 2.5; xbox subir b; sleep 0.5; captura 09-tras-mantener-b
xbox pulsar rb; sleep 0.5; captura 10-sistema-snes
xbox pulsar a
esperar 15 ra_abierto || { informe "FALLA: RetroArch no arrancó con A"; exit 1; }
sleep 5
xbox bajar a; sleep 0.6; captura 11-retroarch-con-a; xbox subir a
t0=$(ms); xbox bajar view; xbox bajar menu; sleep 0.3; xbox subir menu; xbox subir view
esperar 10 ra_cerrado || informe "FALLA: Select + Start no cerró RetroArch"
esperar 10 neo_visible || informe "FALLA: Neo Arcade no volvió"
informe "Select + Start → Neo Arcade visible en $(($(ms) - t0)) ms"
sleep 1; captura 12-de-vuelta-con-mando
exec 3>&-
sleep 1.5

informe "== Palanca de arcade"
conectar palanca 4
palanca pulsar boton1; sleep 0.6; captura 13-configurar-se-abre
for paso in arriba abajo izquierda derecha boton3 boton2 boton4 boton1 boton5 boton6; do palanca pulsar "$paso"; done
sleep 0.5; captura 14-paso-letra-anterior
sleep 6.5; sleep 6.5 # LT y RT no existen en esta palanca: se saltan solos
palanca pulsar boton9; palanca pulsar boton10; sleep 0.5; captura 15-listo
sleep 3; captura 16-de-vuelta-tras-configurar
informe "Mapeo guardado: $(tr -d '\n ' <"$BASE/datos/mandos.json" | cut -c1-400)"
palanca pulsar boton3
esperar 15 ra_abierto || { informe "FALLA: RetroArch no arrancó con la palanca"; exit 1; }
sleep 5
informe "Perfil de RetroArch escrito: $(ls "$PERFILES"/neo-arcade-*.cfg 2>/dev/null | xargs -n1 basename)"
palanca bajar boton3; sleep 0.6; captura 17-retroarch-con-la-palanca; palanca subir boton3
t0=$(ms); palanca bajar boton9; palanca bajar boton10; sleep 0.3; palanca subir boton10; palanca subir boton9
esperar 10 ra_cerrado || informe "FALLA: Select + Start de la palanca no cerró RetroArch"
esperar 10 neo_visible || informe "FALLA: Neo Arcade no volvió"
informe "Select + Start de la palanca → Neo Arcade visible en $(($(ms) - t0)) ms"
sleep 1; captura 18-de-vuelta-con-la-palanca

informe ""
informe "Registro de Neo Arcade:"
sed "s#$HOME#~#g" "$BASE/datos/registros/neo-arcade.log" | tee -a "$SALIDA/resultado.txt"
