#!/usr/bin/env bash
# Corre cada juego de juegos.txt con cada perfil de perfiles/ en la TV de la MP80 y guarda:
#   capturas/<juego>-<perfil>.png   el mismo cuadro con cada perfil (la captura sale después del shader)
#   hud/<juego>-<perfil>-sin-limite el tiempo de cada cuadro sin vsync ni audio: el máximo del equipo
#   hud/<juego>-<perfil>-tiempo-real el tiempo de cada cuadro como lo verá el usuario (vsync y audio)
#   gpu/<juego>-<perfil>.json       intel_gpu_top durante el tiempo real: ocupación, frecuencia y vatios
#   proc/<juego>-<perfil>.txt       CPU y memoria del proceso de RetroArch durante el tiempo real
#   registros/<juego>-<perfil>.log  el registro de RetroArch, para ver errores de shader
# Los tiempos de cuadro salen del HUD de Mesa (GALLIUM_HUD_DUMP_DIR), sin dibujarlo en la pantalla.
# Necesita sudo para intel_gpu_top. Uso: [JUEGOS="mslug nova"] bash medir.sh [perfil…]   (por omisión, todos)
set -u
COD="$(cd "$(dirname "$0")" && pwd)"
LAB="$(dirname "$COD")"
T="$LAB/trabajo"
R="$LAB/resultados/$(date +%Y%m%d-%H%M)"
CORES="$HOME/.var/app/org.libretro.RetroArch/config/retroarch/cores"
export XDG_RUNTIME_DIR="/run/user/$(id -u)" WAYLAND_DISPLAY=wayland-0
CUADROS_SIN_LIMITE=3000
CUADROS_TIEMPO_REAL=1800
mkdir -p "$R"/{capturas,hud,gpu,proc,registros}
ln -sfn "$R" "$LAB/resultados/ultimo"

PERFILES=("$@")
[ ${#PERFILES[@]} -eq 0 ] && mapfile -t PERFILES < <(ls "$COD/perfiles" | sed 's/\.cfg$//')

# Abre RetroArch con la base del laboratorio y los .cfg que se le agregan (separados por |).
ra() { # <agregar> <núcleo> <juego> <estado|-> <variables de entorno de flatpak, separadas por espacio> [argumentos…]
  local agregar=$1 nucleo=$2 juego=$3 estado=$4 entorno=$5
  shift 5
  local extra=()
  if [ "$estado" != "-" ]; then
    # RetroArch carga al abrir el estado del espacio 0 (--entryslot); debe llamarse como el juego.
    cp "$T/estados/$estado.state" "$T/states/$(basename "${juego%.*}").state"
    extra+=(--entryslot=0)
  fi
  # Cada corrida desde cero: FBNeo guarda la memoria de la máquina al cerrar, y con ella la siguiente
  # arrancaría distinta (la demostración cambia).
  find "$T/saves" -mindepth 1 -delete
  # RetroArch 1.22 no carga el shader desde el .cfg: va en la línea «# shader:» del perfil. Sin shader,
  # «--set-shader=» vacío apaga además los presets automáticos.
  local primero=${agregar%%|*}
  extra+=("--set-shader=$(sed -n 's/^# shader: //p' "$primero")")
  local env_args=()
  for v in $entorno; do env_args+=("--env=$v"); done
  timeout 300 flatpak run "${env_args[@]}" org.libretro.RetroArch --config "$T/base.cfg" --appendconfig "$agregar" \
    -f -L "$CORES/${nucleo}_libretro.so" "$juego" "${extra[@]}" "$@" </dev/null >/dev/null 2>&1
}

hud() { echo "GALLIUM_HUD=fps,frametime,cpu GALLIUM_HUD_VISIBLE=false GALLIUM_HUD_DUMP_DIR=$1 GALLIUM_HUD_PERIOD=0"; }

# CPU y memoria del proceso de RetroArch entre el segundo 5 y el 25 del tiempo real.
muestrear_proceso() { # <archivo>
  local pid=""
  for _ in $(seq 100); do pid=$(pgrep -x retroarch | head -1); [ -n "$pid" ] && break; sleep 0.1; done
  [ -z "$pid" ] && { echo "sin proceso" >"$1"; return; }
  sleep 5
  local a t0 b t1
  a=$(awk '{print $14 + $15}' "/proc/$pid/stat" 2>/dev/null); t0=$(date +%s%N)
  sleep 20
  b=$(awk '{print $14 + $15}' "/proc/$pid/stat" 2>/dev/null); t1=$(date +%s%N)
  { echo "pid $pid"; echo "ticks $a $b"; echo "ns $t0 $t1"; echo "clk $(getconf CLK_TCK)"
    grep -E "VmHWM|VmRSS" "/proc/$pid/status"; } >"$1" 2>/dev/null
}

while IFS='|' read -r id nucleo juego cuadro estado; do
  [ -z "$id" ] || [[ "$id" == \#* ]] && continue
  [ -n "${JUEGOS:-}" ] && [[ " $JUEGOS " != *" $id "* ]] && continue
  juego="${juego/#\~/$HOME}"
  juego="${juego//__LAB__/$LAB}"
  for perfil in "${PERFILES[@]}"; do
    p="$COD/perfiles/$perfil.cfg"
    n="$id-$perfil"
    echo "== $n"
    t=$(date +%s%3N)
    ra "$p|$COD/sin-limite.cfg" "$nucleo" "$juego" "$estado" "" --max-frames="$cuadro" --max-frames-ss \
      --max-frames-ss-path="$R/capturas/$n.png"
    echo "   captura del cuadro $cuadro: salida $? en $(($(date +%s%3N) - t)) ms"

    mkdir -p "$R/hud/$n-sin-limite"
    t=$(date +%s%3N)
    ra "$p|$COD/sin-limite.cfg" "$nucleo" "$juego" "$estado" "$(hud "$R/hud/$n-sin-limite")" --max-frames=$CUADROS_SIN_LIMITE
    echo "   sin límite, $CUADROS_SIN_LIMITE cuadros: salida $? en $(($(date +%s%3N) - t)) ms"

    mkdir -p "$R/hud/$n-tiempo-real"
    sudo intel_gpu_top -J -s 500 -o "$R/gpu/$n.json" </dev/null >/dev/null 2>&1 &
    muestrear_proceso "$R/proc/$n.txt" &
    muestreo=$!
    t=$(date +%s%3N)
    ra "$p" "$nucleo" "$juego" "$estado" "$(hud "$R/hud/$n-tiempo-real")" --max-frames=$CUADROS_TIEMPO_REAL \
      --verbose --log-file="$R/registros/$n.log"
    echo "   tiempo real, $CUADROS_TIEMPO_REAL cuadros: salida $? en $(($(date +%s%3N) - t)) ms"
    sudo pkill -INT -x intel_gpu_top
    wait "$muestreo" 2>/dev/null
    sleep 1
  done
done < "$COD/juegos.txt"

if sha256sum -c --quiet "$T/huella-retroarch-cfg.txt"; then
  echo "El retroarch.cfg de Neo Arcade sigue igual."
else
  echo "AVISO: el retroarch.cfg de Neo Arcade cambió durante la prueba."
fi
echo "Resultados en $R"
