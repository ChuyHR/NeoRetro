#!/usr/bin/env bash
# Continuar donde te quedaste y el menú del juego, con las claves que escribe Neo Arcade
# (clavesDeConfiguracion en core/lanzador/retroarch-cfg.js), sin usar la TV:
#
#   WLR_BACKENDS=headless WLR_LIBINPUT_NO_DEVICES=1 cage -- bash probar-continuar-y-menu.sh
#
# 1. Juega 30 s y sale: debe quedar el estado automático. Al volver a abrir, lo carga (captura).
# 2. Select mantenido abre el Menú rápido; se entra a Guardados rápidos y se elige Cerrar contenido, con
#    quit_on_close_content en 0 (como viene RetroArch) y en 2 (lo de Neo Arcade).
# En el menú de RetroArch, Aceptar es el botón de abajo del RetroPad (b) y Volver el de la derecha (a).
# Todo va dentro de trabajo/: el RetroArch de Flatpak tiene su propio /tmp y no ve lo que se deje ahí.
set -u
if pgrep -x retroarch >/dev/null; then echo "Hay un RetroArch abierto: ciérralo antes de probar." >&2; exit 3; fi
L=~/visual-enhancement-lab; T=$L/trabajo; P=$L/codigo; S=$T/prueba-continuar-y-menu
C=~/.var/app/org.libretro.RetroArch/config/retroarch/cores; JUEGO=~/NeoRetro/roms/neogeo/mslug.zip
rm -rf "$S"; mkdir -p "$S"
remoto() { python3 "$P/control-remoto.py" "$@" >/dev/null; }
claves() { printf 'savestate_auto_save = "true"\nsavestate_auto_load = "true"\ninput_menu_toggle_gamepad_combo = "8"\nquit_on_close_content = "%s"\nvideo_font_enable = "true"\n' "$1" > "$S/claves-$1.cfg"; }
ra() { local cfg=$1; shift; timeout 120 flatpak run org.libretro.RetroArch --config "$T/base.cfg" --appendconfig "$cfg" -f -L "$C/fbneo_libretro.so" "$JUEGO" "$@" </dev/null >/dev/null 2>&1; }
limpiar() { find "$T/saves" "$T/states" -mindepth 1 -delete; }
estado() { find "$T/states" -name '*.auto' -printf '%P (%s bytes)' ; true; }
{
  claves 2; limpiar
  ra "$S/claves-2.cfg" --max-frames=1800
  echo "1. Al salir: estado automático $(estado)"
  ra "$S/claves-2.cfg" --max-frames=30 --max-frames-ss --max-frames-ss-path="$S/1-al-volver.png" --verbose --log-file="$S/1-al-volver.log"
  echo "   Al volver: $(grep -c 'Carga automática de guardado rápido.*succeeded\|Auto load state.*succeeded' "$S/1-al-volver.log") carga automática correcta (captura en 1-al-volver.png)"
  for valor in 0 2; do
    claves "$valor"; limpiar
    ra "$S/claves-$valor.cfg" &
    sleep 10
    remoto "pulsar select 2600" "esperar 1500"
    grim "$S/2-$valor-menu.png"
    remoto "pulsar abajo" "esperar 300" "pulsar abajo" "esperar 300" "pulsar abajo" "esperar 300" "pulsar b" "esperar 1200"
    grim "$S/2-$valor-guardados.png"
    remoto "pulsar a" "esperar 600" "pulsar arriba" "esperar 400" "pulsar b" "esperar 4000"
    if pgrep -x retroarch >/dev/null; then vivo="RetroArch sigue abierto"; else vivo="RetroArch se cerró"; fi
    grim "$S/2-$valor-despues.png" 2>/dev/null
    echo "2. quit_on_close_content = $valor: tras Cerrar contenido, $vivo; estado automático $(estado)"
    remoto "comando QUIT"
    wait
  done
  limpiar
} 2>&1 | tee "$S/resultado.txt"
