#!/usr/bin/env bash
# Deja el equipo encendido y con la pantalla prendida mientras tenga corriente, como una consola: sin
# suspensión ni hibernación (ni por inactividad ni por tecla), sin apagar la pantalla por inactividad
# y sin bloqueo de sesión. Lo del sistema vale también para la sesión de quiosco de la fase 8; lo de
# Xfce solo aplica mientras la MP80 use ese escritorio. Se puede correr otra vez sin romper nada.
# Uso, como el usuario de la sesión (pide sudo para lo del sistema):
#   bash scripts/instalador/sin-suspension.sh
# Con --solo-sistema hace solo la parte del sistema (así lo llama instalar-neo-arcade.sh, como root).
# Para deshacer lo del sistema: sudo systemctl unmask sleep.target suspend.target hibernate.target
#   hybrid-sleep.target suspend-then-hibernate.target y borrar /etc/systemd/logind.conf.d/neoarcade.conf
set -euo pipefail
SUDO=sudo
[ "$(id -u)" = 0 ] && SUDO=

echo "== Sistema: suspensión e hibernación bloqueadas"
$SUDO systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target suspend-then-hibernate.target
$SUDO mkdir -p /etc/systemd/logind.conf.d
$SUDO tee /etc/systemd/logind.conf.d/neoarcade.conf >/dev/null <<'LOGIND'
# Neo Arcade: las teclas de suspender y la inactividad no hacen nada. El botón de encendido conserva
# su comportamiento (apagar).
[Login]
HandleSuspendKey=ignore
HandleHibernateKey=ignore
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
IdleAction=ignore
LOGIND
# HUP vuelve a leer la configuración sin cerrar la sesión abierta (reiniciar logind sí la cerraría).
$SUDO systemctl kill -s HUP systemd-logind
[ "${1:-}" = --solo-sistema ] && exit 0

# Lo demás es de la sesión gráfica; sin ella (por ejemplo, desde un SSH sin escritorio) se omite.
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}"
export DISPLAY="${DISPLAY:-:0}" XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}"

if command -v xfconf-query >/dev/null && xfconf-query -c xfce4-power-manager -l >/dev/null 2>&1; then
  echo "== Xfce: sin suspender por inactividad y sin apagar la pantalla"
  ajustar() { xfconf-query -c xfce4-power-manager -p "/xfce4-power-manager/$1" -n -t "$2" -s "$3"; }
  ajustar inactivity-on-ac uint 0        # 0 es «nunca»
  ajustar inactivity-on-battery uint 0
  ajustar blank-on-ac int 0
  ajustar blank-on-battery int 0
  ajustar dpms-enabled bool false
  ajustar dpms-on-ac-sleep uint 0
  ajustar dpms-on-ac-off uint 0
  ajustar lock-screen-suspend-hibernate bool false
else
  echo "== Xfce: no hay sesión abierta, se omite"
fi

# light-locker bloquea la pantalla cuando se apaga; en una consola sin contraseña solo estorba.
mkdir -p "$HOME/.config/autostart"
for programa in light-locker xfce4-screensaver; do
  if [ -f "/etc/xdg/autostart/$programa.desktop" ]; then
    printf '[Desktop Entry]\nHidden=true\n' >"$HOME/.config/autostart/$programa.desktop"
    pkill -x "$programa" || true
    echo "== $programa: desactivado"
  fi
done

if xset q >/dev/null 2>&1; then
  xset s off s noblank -dpms
  xset q | grep -E "timeout:|DPMS is"
fi
