#!/usr/bin/env bash
# Prueba de las carpetas de la consola instalada (~/NeoRetro, decidido con el usuario el 2026-10-20) sin
# instalar la consola. Arma un NeoRetro de prueba en ~/prueba-consola/NeoRetro, configurado como lo deja
# instalar-neo-arcade.sh pero con rutas a esa carpeta, abre Neo Arcade con NEO_ARCADE_CONFIG apuntando a
# su config/ y comprueba en la TV que:
#   - los juegos salen de roms/;
#   - lo que se recuerda va a config/ y el registro a logs/, no a la carpeta de datos de Electron;
#   - RetroArch guarda el estado (F2) en states/.
# Al terminar deja como estaban las claves de retroarch.cfg que toca y ~/.config/neo-arcade.
# Uso, en la MP80: bash scripts/prueba-carpetas-en-tv.sh
set -u
cd "$(dirname "$0")/.."
export DISPLAY=${DISPLAY:-:0} XAUTHORITY=${XAUTHORITY:-$HOME/.Xauthority}
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}
export DBUS_SESSION_BUS_ADDRESS=${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}

NEORETRO=$HOME/prueba-consola/NeoRetro
SALIDA=/tmp/prueba-carpetas
CFG=$HOME/.var/app/org.libretro.RetroArch/config/retroarch/retroarch.cfg
DATOS_APP=$HOME/.config/neo-arcade
CLAVES="savefile_directory savestate_directory savefiles_in_content_dir savestates_in_content_dir"
rm -rf "$SALIDA" "$HOME/prueba-consola" && mkdir -p "$SALIDA"
mkdir -p "$NEORETRO"/{roms/snes,media,saves,states,metadata,logs,backups,config}
node scripts/juego-de-prueba-snes.mjs "$NEORETRO/roms/snes" >/dev/null
cat >"$NEORETRO/config/biblioteca.json" <<JSON
{
  "roms": "$NEORETRO/roms",
  "medios": "$NEORETRO/media",
  "datos": "$NEORETRO/config",
  "registros": "$NEORETRO/logs"
}
JSON

# Lo que se va a tocar fuera de la carpeta de prueba, para dejarlo igual.
grep -E "^($(echo $CLAVES | tr ' ' '|')) = " "$CFG" >"$SALIDA/retroarch-antes.txt"
rm -rf "$DATOS_APP.respaldo-prueba"
[ -d "$DATOS_APP" ] && cp -a "$DATOS_APP" "$DATOS_APP.respaldo-prueba"
restaurar() {
  pkill -x electron
  while IFS= read -r linea; do
    clave=${linea%% =*}
    sed -i "s|^$clave = .*|$linea|" "$CFG"
  done <"$SALIDA/retroarch-antes.txt"
  rm -rf "$DATOS_APP"
  [ -d "$DATOS_APP.respaldo-prueba" ] && mv "$DATOS_APP.respaldo-prueba" "$DATOS_APP"
}
trap restaurar EXIT
bash scripts/configurar-retroarch.sh --partidas "$NEORETRO/saves" --estados "$NEORETRO/states" >/dev/null

informe() { echo "$*" | tee -a "$SALIDA/resultado.txt"; }
captura() { xwd -root -silent >"$SALIDA/c.xwd" && python3 scripts/herramientas/xwd-a-png.py "$SALIDA/c.xwd" "$SALIDA/$1.png"; rm -f "$SALIDA/c.xwd"; }
tecla() { xdotool keydown "$1"; sleep "${2:-0.2}"; xdotool keyup "$1"; }
ms() { date +%s%3N; }
esperar() { local limite=$(($(ms) + $1 * 1000)); shift; until "$@"; do [ "$(ms)" -gt "$limite" ] && return 1; sleep 0.05; done; }
neo_visible() { xdotool search --onlyvisible --name "^Neo Arcade$" >/dev/null 2>&1; }
ra_abierto() { pgrep -x retroarch >/dev/null; }
ra_cerrado() { ! pgrep -x retroarch >/dev/null; }
casa() { sed "s#$HOME#~#g"; }
existe() { [ -e "$1" ] && echo sí || echo no; }

NEO_ARCADE_CONFIG=$NEORETRO/config setsid ./node_modules/.bin/electron . >"$SALIDA/neo.log" 2>&1 &
esperar 30 neo_visible || { informe "FALLA: Neo Arcade no abrió"; exit 1; }
sleep 3
captura 1-biblioteca-desde-neoretro
tecla Return
esperar 15 ra_abierto || { informe "FALLA: RetroArch no arrancó"; exit 1; }
sleep 5
tecla F2 0.3 # guardar estado
sleep 2
captura 2-estado-guardado
tecla Escape 0.3
esperar 10 ra_cerrado; esperar 10 neo_visible
sleep 3 # lo que se recuerda se escribe juntando los cambios

informe "Carpeta de prueba: $(echo "$NEORETRO" | casa)"
informe "Juegos leídos de roms/: $(grep -o 'snes=[0-9]*' "$NEORETRO/logs/neo-arcade.log" | head -1)"
informe "config/datos-usuario.json: $(existe "$NEORETRO/config/datos-usuario.json")"
informe "logs/neo-arcade.log: $(existe "$NEORETRO/logs/neo-arcade.log")"
informe "Estados en states/: $(find "$NEORETRO/states" -type f | sed "s#$NEORETRO/##" | tr '\n' ' ')"
informe "En la carpeta de datos de Electron: $(ls "$DATOS_APP" 2>/dev/null | tr '\n' ' ')"
informe "  (ahí solo deben quedar la caché biblioteca.json y, si hubo discos, listas/)"
ok=true
[ -e "$NEORETRO/config/datos-usuario.json" ] || ok=false
[ -e "$NEORETRO/logs/neo-arcade.log" ] || ok=false
[ -n "$(find "$NEORETRO/states" -type f)" ] || ok=false
[ -e "$DATOS_APP/datos-usuario.json" ] && ok=false
[ -e "$DATOS_APP/registros" ] && ok=false
if $ok; then informe "OK: cada cosa quedó en su carpeta de NeoRetro"; else informe "FALLA: algo quedó fuera de su carpeta"; fi
informe ""
informe "datos-usuario.json (recientes y partidas):"
python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(json.dumps({"recientes": d["recientes"], "partidas": d["partidas"]}, ensure_ascii=False, indent=2))' "$NEORETRO/config/datos-usuario.json" | casa | tee -a "$SALIDA/resultado.txt"
informe ""
informe "Registro:"
casa <"$NEORETRO/logs/neo-arcade.log" | tee -a "$SALIDA/resultado.txt"
