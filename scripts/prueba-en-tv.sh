#!/usr/bin/env bash
# Prueba de la fase 3 en la pantalla real, con RetroArch de verdad y sin juegos de terceros. Arma en
# ~/juegos-de-prueba (nunca en roms/) tres casos y los recorre con el teclado, como una persona:
#   - «Archivo dañado»: RetroArch no lo abre y se cierra; Neo Arcade debe decirlo.
#   - «Disco sin BIOS»: PlayStation sin BIOS; Neo Arcade debe avisar antes de abrir el emulador.
#     Solo se arma si en la carpeta de BIOS no hay ninguna, para no tocar las del usuario.
#   - «Prueba de control»: el programa propio de scripts/juego-de-prueba-snes.mjs; se abre, se pulsa un
#     botón, se sale con Esc y se mide la vuelta (meta del plan: menos de 2 s).
# Captura cada paso en /tmp/prueba-tv/ y escribe ahí resultado.txt.
# Uso, en la MP80 con la sesión gráfica abierta (también por SSH): bash scripts/prueba-en-tv.sh
set -u
cd "$(dirname "$0")/.."
export DISPLAY=${DISPLAY:-:0} XAUTHORITY=${XAUTHORITY:-$HOME/.Xauthority}
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}
export DBUS_SESSION_BUS_ADDRESS=${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}

BASE=$HOME/juegos-de-prueba
SALIDA=/tmp/prueba-tv
BIOS=$HOME/.var/app/org.libretro.RetroArch/config/retroarch/system
rm -rf "$SALIDA" "$BASE" && mkdir -p "$SALIDA" "$BASE/roms/snes"
node scripts/juego-de-prueba-snes.mjs "$BASE/roms/snes" >/dev/null
# Vacío y no con basura: Snes9x abre cualquier contenido y deja la pantalla en negro, pero un archivo
# vacío lo rechaza y RetroArch se cierra con código 1. Va en la carpeta personal porque /tmp no existe
# para los emuladores de Flathub (es privado dentro de su caja).
: >"$BASE/roms/snes/Archivo dañado (prueba).sfc"
if ! ls "$BIOS"/scph550[012].bin >/dev/null 2>&1; then
  mkdir -p "$BASE/roms/psx/Disco sin BIOS"
  printf 'FILE "disco.bin" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00\n' >"$BASE/roms/psx/Disco sin BIOS/Disco sin BIOS (prueba).cue"
  : >"$BASE/roms/psx/Disco sin BIOS/disco.bin"
fi

ms() { date +%s%3N; }
informe() { echo "$*" | tee -a "$SALIDA/resultado.txt"; }
captura() { xwd -root -silent >"$SALIDA/c.xwd" && python3 scripts/herramientas/xwd-a-png.py "$SALIDA/c.xwd" "$SALIDA/$1.png"; rm -f "$SALIDA/c.xwd"; }
# Una pulsación de persona: RetroArch lee el teclado una vez por cuadro y no ve un pulso más corto.
tecla() { xdotool keydown "$1"; sleep "${2:-0.15}"; xdotool keyup "$1"; }
# Espera hasta que la condición se cumpla, como mucho $1 segundos.
esperar() { local limite=$(($(ms) + $1 * 1000)); shift; until "$@"; do [ "$(ms)" -gt "$limite" ] && return 1; sleep 0.02; done; }
neo_visible() { xdotool search --onlyvisible --name "^Neo Arcade$" >/dev/null 2>&1; }
ra_abierto() { pgrep -x retroarch >/dev/null; }
ra_cerrado() { ! pgrep -x retroarch >/dev/null; }
foco() { xdotool getactivewindow getwindowname 2>/dev/null; }

NEO_ARCADE_ROMS=$BASE/roms NEO_ARCADE_DATOS=$BASE/datos setsid ./node_modules/.bin/electron . >"$SALIDA/neo.log" 2>&1 &
esperar 30 neo_visible || { informe "Neo Arcade no abrió"; exit 1; }
trap 'pkill -x electron' EXIT
sleep 3
captura 1-inicio
informe "Al abrir, foco en: $(foco)"

# Los juegos van por orden alfabético: Archivo dañado, Disco sin BIOS (si se armó), Prueba de control.
# Si un caso de error abre RetroArch y no se cierra solo, se cierra aquí para que el resto no se desfase.
cerrar_si_quedo() {
  if ra_abierto; then
    informe "FALLA: $1"
    tecla Escape 0.3; esperar 10 ra_cerrado; esperar 10 neo_visible
  fi
}
tecla Return
esperar 4 ra_abierto && esperar 8 ra_cerrado
cerrar_si_quedo "con el archivo dañado RetroArch no se cerró solo"
esperar 5 neo_visible; sleep 1; captura 2-archivo-danado; tecla Return; sleep 0.6
if [ -d "$BASE/roms/psx" ]; then
  tecla Right; sleep 0.5; tecla Return; sleep 2; captura 3-disco-sin-bios
  cerrar_si_quedo "con el disco sin BIOS se abrió RetroArch"
  tecla Return; sleep 0.6
fi
tecla Right; sleep 0.5
t0=$(ms); tecla Return
sleep 0.5; captura 4-abriendo
esperar 15 ra_abierto || { informe "RetroArch no arrancó"; exit 1; }
t1=$(ms); sleep 5; captura 5-retroarch
informe "RetroArch arrancó $((t1 - t0)) ms después de Enter; foco en: $(foco)"
xdotool keydown x; sleep 0.6; captura 6-boton-pulsado; xdotool keyup x
t2=$(ms); tecla Escape 0.3
esperar 10 ra_cerrado || informe "FALLA: RetroArch no cerró con Esc"
t3=$(ms)
esperar 10 neo_visible || informe "FALLA: Neo Arcade no volvió"
t4=$(ms)
informe "Esc → RetroArch cerrado en $((t3 - t2)) ms; Neo Arcade visible en $((t4 - t2)) ms"
sleep 1; captura 7-de-vuelta
informe "Al volver, foco en: $(foco)"
tecla Left; sleep 0.6; captura 8-flecha-tras-volver
informe ""
informe "Registro de Neo Arcade:"
sed "s#$HOME#~#g" "$BASE/datos/registros/neo-arcade.log" | tee -a "$SALIDA/resultado.txt"
