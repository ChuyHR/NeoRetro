#!/usr/bin/env bash
# Qué hace RetroArch cuando un perfil visual falla, para diseñar el fallback de Neo Arcade:
#   1. el shader del perfil no existe (se pasa con --set-shader, como lo hará Neo Arcade);
#   2. el shader existe pero no compila;
#   3. el archivo del perfil (--appendconfig) no existe;
#   4. el perfil trae una clave que RetroArch no conoce;
#   5. con config_save_on_exit activo, ¿RetroArch guarda en su configuración lo del perfil?
# De cada caso anota la salida, cuánto duró, si dibujó el juego (captura) y lo que dijo el registro.
# Uso: bash probar-fallas.sh   (después de preparar.sh)
set -u
COD="$(cd "$(dirname "$0")" && pwd)"
LAB="$(dirname "$COD")"
T="$LAB/trabajo"
F="$LAB/resultados/fallas"
CORES="$HOME/.var/app/org.libretro.RetroArch/config/retroarch/cores"
JUEGO="$HOME/NeoRetro/roms/neogeo/mslug.zip"
# La sesión de la TV (Cage de Neo Arcade), salvo que ya se esté en otra (una sesión sin pantalla).
export XDG_RUNTIME_DIR="/run/user/$(id -u)" WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"
# Las pruebas se ven en la TV y le quitan el foco a lo que haya: con un juego abierto (el usuario
# jugando), RetroArch lo pausaría. El 2026-10-22 pasó con una partida de Metal Slug 3.
if pgrep -x retroarch >/dev/null; then
  echo "Hay un juego abierto en la TV; no se corre para no interrumpirlo." >&2
  exit 3
fi
rm -rf "$F" && mkdir -p "$F"

caso() { # <nombre> <config base> <agregar> [más argumentos]
  local nombre=$1 base=$2 agregar=$3
  shift 3
  local t
  t=$(date +%s%3N)
  timeout 120 flatpak run org.libretro.RetroArch --config "$base" --appendconfig "$agregar" -f \
    -L "$CORES/fbneo_libretro.so" "$JUEGO" --max-frames=900 --max-frames-ss --max-frames-ss-path="$F/$nombre.png" \
    --verbose --log-file="$F/$nombre.log" "$@" </dev/null >/dev/null 2>&1
  local salida=$?
  echo "== $nombre: salida $salida en $(($(date +%s%3N) - t)) ms, captura: $([ -f "$F/$nombre.png" ] && echo sí || echo no)"
  grep -iE "shader|appendconfig|config file|could not|failed|error" "$F/$nombre.log" | grep -viE "FBNeo\] Using ROM" | head -6 | sed 's/^/   /'
}

# 1. Shader que no existe.
printf 'video_scale_integer = "true"\nvideo_shader_enable = "true"\nvideo_shader = "/app/share/libretro/shaders/shaders_glsl/crt/no-existe.glslp"\n' > "$F/sin-shader.cfg"
caso 1-shader-inexistente "$T/base.cfg" "$F/sin-shader.cfg" --set-shader=/app/share/libretro/shaders/shaders_glsl/crt/no-existe.glslp

# 2. Shader que no compila: un preset de una pasada con un error de sintaxis.
mkdir -p "$F/shader-roto"
printf 'shaders = 1\nshader0 = roto.glsl\n' > "$F/shader-roto/roto.glslp"
printf '#if defined(VERTEX)\nesto no es glsl\n#endif\n' > "$F/shader-roto/roto.glsl"
printf 'video_scale_integer = "true"\nvideo_shader_enable = "true"\nvideo_shader = "%s"\n' "$F/shader-roto/roto.glslp" > "$F/shader-roto.cfg"
caso 2-shader-roto "$T/base.cfg" "$F/shader-roto.cfg" "--set-shader=$F/shader-roto/roto.glslp"

# 3. El archivo del perfil no existe.
caso 3-perfil-inexistente "$T/base.cfg" "$F/no-existe.cfg"

# 4. Una clave que RetroArch no conoce.
printf 'video_scale_integer = "true"\nneo_arcade_clave_inventada = "1"\n' > "$F/clave-rara.cfg"
caso 4-clave-desconocida "$T/base.cfg" "$F/clave-rara.cfg"

# 5. ¿Se queda guardado lo del perfil? Una copia de la base con config_save_on_exit activo, cerrada con
#    la orden QUIT (como cierra el usuario), y después se busca la clave del perfil en esa copia.
sed 's/^config_save_on_exit = .*/config_save_on_exit = "true"/' "$T/base.cfg" > "$F/guardar.cfg"
grep -q '^config_save_on_exit = "true"' "$F/guardar.cfg" || echo 'config_save_on_exit = "true"' >> "$F/guardar.cfg"
printf 'video_scale_integer = "true"\nvideo_shader = "/app/share/libretro/shaders/shaders_glsl/crt/zfast-crt.glslp"\n' > "$F/perfil-guardar.cfg"
cp "$F/guardar.cfg" "$F/guardar-antes.cfg"
grep -E '^(video_scale_integer|video_shader) = ' "$F/guardar-antes.cfg" | sed 's/^/   antes: /'
timeout 120 flatpak run org.libretro.RetroArch --config "$F/guardar.cfg" --appendconfig "$F/perfil-guardar.cfg" -f \
  -L "$CORES/fbneo_libretro.so" "$JUEGO" </dev/null >/dev/null 2>&1 &
sleep 8
python3 "$COD/control-remoto.py" "comando QUIT" >/dev/null
wait
echo "== 5-guardado-al-cerrar: el archivo $(cmp -s "$F/guardar-antes.cfg" "$F/guardar.cfg" && echo 'no cambió' || echo 'se reescribió')"
grep -E '^(video_scale_integer|video_shader) = ' "$F/guardar.cfg" | sed 's/^/   después: /'
