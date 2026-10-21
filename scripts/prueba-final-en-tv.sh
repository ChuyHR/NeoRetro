#!/usr/bin/env bash
# Prueba final en la pantalla real, con RetroArch de verdad y sin juegos de terceros. Arma en
# ~/juegos-de-prueba-final (nunca en roms/ ni en media/) una biblioteca con los casos de la
# especificación del proyecto y la recorre con el teclado, como una persona:
#   - «Disco doble» (PlayStation, 2 discos): debe salir una sola vez, con «2 discos», y sin BIOS avisar
#     antes de abrir el emulador. Solo se arma si en la carpeta de BIOS no hay ninguna de PlayStation.
#   - «Dreamcast doble» (2 discos): al abrirlo, Neo Arcade arma una lista .m3u y se la da a RetroArch.
#     Los discos son de mentira, así que Flycast no los arranca: se comprueba la lista y que RetroArch
#     la reciba y la pueda leer desde su caja de Flathub.
#   - «Neo Geo de prueba»: sin neogeo.zip debe avisar antes de abrir. Solo si no hay neogeo.zip en la
#     carpeta de BIOS (FBNeo también lo busca ahí).
#   - «Pista perdida» (PC Engine): un .cue que nombra un archivo que no está. Lo marca el diagnóstico.
#   - «Prueba de control», dos veces (el programa propio de scripts/juego-de-prueba-snes.mjs y una
#     copia): se juega un minuto, se sale con Esc y Detalles debe decir cuánto se jugó. El diagnóstico
#     debe marcar la copia como posible duplicado.
#   - «Vacío»: un archivo vacío. Lo marca el diagnóstico.
# Captura cada paso en /tmp/prueba-final/ y escribe ahí resultado.txt.
# Uso, en la MP80 con la sesión gráfica abierta (también por SSH): bash scripts/prueba-final-en-tv.sh
set -u
cd "$(dirname "$0")/.."
export DISPLAY=${DISPLAY:-:0} XAUTHORITY=${XAUTHORITY:-$HOME/.Xauthority}
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}
export DBUS_SESSION_BUS_ADDRESS=${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}

BASE=$HOME/juegos-de-prueba-final
SALIDA=/tmp/prueba-final
BIOS=$HOME/.var/app/org.libretro.RetroArch/config/retroarch/system
SEGUNDOS_DE_JUEGO=${SEGUNDOS_DE_JUEGO:-65}
rm -rf "$SALIDA" "$BASE" && mkdir -p "$SALIDA" "$BASE"/roms/{snes,psx,dreamcast,neogeo,pcengine} "$BASE/media"

# Biblioteca de prueba.
node scripts/juego-de-prueba-snes.mjs "$BASE/roms/snes" >/dev/null
cp "$BASE/roms/snes/Prueba de control (Neo Arcade).sfc" "$BASE/roms/snes/Prueba de control (copia).sfc"
: >"$BASE/roms/snes/Vacío.sfc"
SIN_BIOS_PSX=0
if ! ls "$BIOS"/scph550[012].bin >/dev/null 2>&1; then
  SIN_BIOS_PSX=1
  for disco in 1 2; do
    printf 'FILE "Disco doble (Disc %s).bin" BINARY\n  TRACK 01 MODE2/2352\n    INDEX 01 00:00:00\n' "$disco" >"$BASE/roms/psx/Disco doble (Disc $disco).cue"
    : >"$BASE/roms/psx/Disco doble (Disc $disco).bin"
  done
fi
for disco in 1 2; do
  printf '1\n1 0 4 2352 disco%s-pista01.bin 0\n' "$disco" >"$BASE/roms/dreamcast/Dreamcast doble (Disc $disco).gdi"
  head -c $((2352 * 300)) /dev/zero >"$BASE/roms/dreamcast/disco$disco-pista01.bin"
done
SIN_NEOGEO=0
if [ ! -e "$BIOS/neogeo.zip" ] && [ ! -e "$BIOS/fbneo/neogeo.zip" ]; then
  SIN_NEOGEO=1
  printf 'PK\005\006\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000\000' >"$BASE/roms/neogeo/Neo Geo de prueba.zip"
fi
printf 'FILE "pista que no existe.bin" BINARY\n  TRACK 01 MODE1/2352\n    INDEX 01 00:00:00\n' >"$BASE/roms/pcengine/Pista perdida.cue"

ms() { date +%s%3N; }
informe() { echo "$*" | tee -a "$SALIDA/resultado.txt"; }
captura() { xwd -root -silent >"$SALIDA/c.xwd" && python3 scripts/herramientas/xwd-a-png.py "$SALIDA/c.xwd" "$SALIDA/$1.png"; rm -f "$SALIDA/c.xwd"; }
# Una pulsación de persona: RetroArch lee el teclado una vez por cuadro y no ve un pulso más corto.
tecla() { xdotool keydown "$1"; sleep "${2:-0.15}"; xdotool keyup "$1"; }
esperar() { local limite=$(($(ms) + $1 * 1000)); shift; until "$@"; do [ "$(ms)" -gt "$limite" ] && return 1; sleep 0.02; done; }
neo_visible() { xdotool search --onlyvisible --name "^Neo Arcade$" >/dev/null 2>&1; }
ra_abierto() { pgrep -x retroarch >/dev/null; }
ra_cerrado() { ! pgrep -x retroarch >/dev/null; }
cerrar_si_quedo() {
  if ra_abierto; then
    [ -n "${1:-}" ] && informe "FALLA: $1"
    tecla Escape 0.3; esperar 10 ra_cerrado; esperar 10 neo_visible
  fi
}

informe "== Diagnóstico de la biblioteca de prueba (npm run diagnostico -- --juegos)"
NEO_ARCADE_ROMS=$BASE/roms NEO_ARCADE_MEDIOS=$BASE/media NEO_ARCADE_DATOS=$BASE/datos-diagnostico \
  node scripts/diagnostico.mjs --juegos 2>&1 | sed "s#$HOME#~#g" | tee -a "$SALIDA/resultado.txt"
informe ""

NEO_ARCADE_ROMS=$BASE/roms NEO_ARCADE_MEDIOS=$BASE/media NEO_ARCADE_DATOS=$BASE/datos setsid ./node_modules/.bin/electron . >"$SALIDA/neo.log" 2>&1 &
esperar 30 neo_visible || { informe "Neo Arcade no abrió"; exit 1; }
trap 'pkill -x electron' EXIT
sleep 3
captura 1-inicio
# Orden alfabético en «todos»: Disco doble (si se armó), Dreamcast doble, Neo Geo de prueba (si se armó),
# Pista perdida, Prueba de control (copia), Prueba de control, Vacío.

informe "== Juegos de varios discos y BIOS"
if [ "$SIN_BIOS_PSX" = 1 ]; then
  tecla Return; sleep 2; captura 2-disco-doble-sin-bios
  if ra_abierto; then cerrar_si_quedo "con el disco doble sin BIOS se abrió RetroArch"; else informe "OK: Disco doble sin BIOS avisó antes de abrir RetroArch"; fi
  tecla Return; sleep 0.6
  tecla Right; sleep 0.5
fi
captura 3-dreamcast-doble
tecla Return
if esperar 15 ra_abierto; then
  argumentos=$(pgrep -a -x retroarch | head -1)
  lista=$(echo "$argumentos" | grep -o '/[^ ]*listas/[0-9a-f]*\.m3u')
  informe "RetroArch recibió: $(echo "$argumentos" | sed "s#$HOME#~#g" | cut -d' ' -f2-)"
  if [ -n "$lista" ]; then
    informe "OK: RetroArch abrió una lista .m3u; su contenido:"
    sed "s#$HOME#~#g; s#^#    #" "$lista" | tee -a "$SALIDA/resultado.txt"
    if flatpak run --command=cat org.libretro.RetroArch "$lista" >/dev/null 2>&1; then
      informe "OK: RetroArch puede leer la lista desde su caja de Flathub"
    else
      informe "FALLA: RetroArch no puede leer la lista desde su caja de Flathub"
    fi
  else
    informe "FALLA: RetroArch no recibió una lista .m3u"
  fi
  sleep 5; captura 4-dreamcast-en-retroarch
  cerrar_si_quedo ""
  esperar 10 neo_visible
else
  informe "RetroArch no llegó a verse abierto (se cerró antes de 15 s o no arrancó)"
fi
sleep 1.5; captura 5-dreamcast-de-vuelta
# Si Flycast no pudo con los discos de mentira y RetroArch salió con error en menos de 8 s, Neo Arcade
# muestra el aviso de que no se pudo abrir (lanzador.js, falloAlAbrir): se cierra con Enter.
ultima=$(grep -P '\tlanzamiento\t' "$BASE/datos/registros/neo-arcade.log" | tail -1)
codigo=$(echo "$ultima" | awk -F'\t' '{print $4}' | cut -d' ' -f2)
duracion=$(echo "$ultima" | awk -F'\t' '{print $5}' | cut -d' ' -f1)
if [ -n "$duracion" ] && [ "$codigo" != 0 ] && [ "$duracion" -lt 8000 ]; then
  informe "Flycast no arrancó los discos de mentira (salida $codigo en $duracion ms): Neo Arcade avisó"
  tecla Return; sleep 0.6
fi
tecla Right; sleep 0.5

if [ "$SIN_NEOGEO" = 1 ]; then
  tecla Return; sleep 2; captura 6-neo-geo-sin-neogeo-zip
  if ra_abierto; then cerrar_si_quedo "sin neogeo.zip se abrió RetroArch"; else informe "OK: sin neogeo.zip avisó antes de abrir RetroArch"; fi
  tecla Return; sleep 0.6
  tecla Right; sleep 0.5
fi
tecla Right; sleep 0.5 # Pista perdida → Prueba de control (copia)

informe "== Tiempo jugado"
captura 7-prueba-de-control
tecla Return
esperar 15 ra_abierto || { informe "FALLA: RetroArch no arrancó con la prueba de control"; exit 1; }
informe "Jugando $SEGUNDOS_DE_JUEGO s"
sleep "$SEGUNDOS_DE_JUEGO"
tecla Escape 0.3
esperar 10 ra_cerrado || informe "FALLA: RetroArch no cerró con Esc"
esperar 10 neo_visible || informe "FALLA: Neo Arcade no volvió"
sleep 1.5
tecla Down; sleep 0.3; tecla Down; sleep 0.3; tecla Return; sleep 1
captura 8-detalles-con-tiempo-jugado
tecla BackSpace; sleep 0.5; tecla Up; sleep 0.3; tecla Up; sleep 0.3
sleep 2 # lo que se recuerda se escribe juntando los cambios
informe "Partidas en datos-usuario.json:"
python3 -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1]))["partidas"], ensure_ascii=False, indent=2))' "$BASE/datos/datos-usuario.json" | tee -a "$SALIDA/resultado.txt"

informe ""
informe "Registro de Neo Arcade:"
sed "s#$HOME#~#g" "$BASE/datos/registros/neo-arcade.log" | tee -a "$SALIDA/resultado.txt"
