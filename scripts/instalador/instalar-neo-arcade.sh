#!/usr/bin/env bash
# Convierte un Debian 13 en la consola Neo Arcade (fase 8): instala lo necesario, deja la app en
# /opt/neo-arcade y la arranca sola al encender, a pantalla completa en una sesión de quiosco (Cage),
# sin escritorio, sin menú de arranque a la vista y sin textos del sistema. Sirve para un Debian recién
# instalado sin escritorio y para uno que ya tenga uno (el escritorio queda instalado pero ya no arranca;
# volver-al-escritorio.sh lo regresa). Se puede correr otra vez sin romper nada.
#
# Uso, como root, desde una copia del repositorio o desde la imagen de instalación:
#   bash scripts/instalador/instalar-neo-arcade.sh [opciones]
#     --usuario NOMBRE   usuario de la consola (por omisión, arcade; se crea si no existe)
#     --sin-emuladores   no instala RetroArch, Dolphin ni PPSSPP (para probar rápido)
#     --hz 60            fija la frecuencia de la pantalla (los juegos retro van a 60 Hz)
# Registro en /var/log/neo-arcade-instalacion.log.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
USUARIO=arcade
CON_EMULADORES=true
HZ=""
while [ $# -gt 0 ]; do
  case "$1" in
    --usuario) USUARIO="$2"; shift ;;
    --sin-emuladores) CON_EMULADORES=false ;;
    --hz) HZ="$2"; shift ;;
    *) echo "Opción desconocida: $1" >&2; exit 2 ;;
  esac
  shift
done
if [ "$(id -u)" != 0 ]; then
  echo "Hay que correrlo como root: sudo bash $0" >&2
  exit 1
fi
exec > >(tee -a /var/log/neo-arcade-instalacion.log) 2>&1
echo "== Neo Arcade: instalación del $(date)"
export DEBIAN_FRONTEND=noninteractive

echo "== Paquetes"
apt-get update
# Cage y Xwayland: la sesión de quiosco (Dolphin usa X11). PipeWire: el sonido. polkitd: que la sesión
# pueda apagar el equipo sin contraseña. foot: la terminal de mantenimiento. grim: capturas de pantalla.
apt-get install -y --no-install-recommends \
  cage xwayland foot grim pipewire pipewire-pulse wireplumber dbus-user-session polkitd \
  libgl1-mesa-dri libegl1 libgles2 mesa-vulkan-drivers \
  libgtk-3-0t64 libnss3 libgbm1 libasound2t64 libxss1 libxtst6 \
  flatpak python3 bluez ca-certificates xdg-utils

echo "== Usuario $USUARIO"
id "$USUARIO" >/dev/null 2>&1 || useradd -m -s /bin/bash "$USUARIO"
for grupo in input video render audio; do
  getent group "$grupo" >/dev/null && usermod -aG "$grupo" "$USUARIO"
done
CASA=$(getent passwd "$USUARIO" | cut -d: -f6)

echo "== La app en /opt/neo-arcade"
if [ ! -x "$REPO/dist/neo-arcade/neo-arcade" ]; then
  # Desde una copia del repositorio con node_modules: se arma aquí. La imagen de instalación ya la trae.
  bash "$REPO/scripts/empaquetar.sh"
fi
rm -rf /opt/neo-arcade.nueva
cp -a "$REPO/dist/neo-arcade" /opt/neo-arcade.nueva
rm -rf /opt/neo-arcade
mv /opt/neo-arcade.nueva /opt/neo-arcade
# El ayudante de aislamiento de Chromium necesita ser de root y con setuid.
chown root:root /opt/neo-arcade/chrome-sandbox
chmod 4755 /opt/neo-arcade/chrome-sandbox
# En la consola, los juegos y los medios van en la carpeta del usuario, fáciles de copiar.
printf '{\n  "_nota": "Escrito por instalar-neo-arcade.sh: en la consola, juegos y medios van en la carpeta del usuario.",\n  "roms": "~/roms",\n  "medios": "~/media"\n}\n' \
  >/opt/neo-arcade/resources/app/config/biblioteca.json
python3 - "$REPO/config/systems.json" "$CASA" <<'PY'
import json, os, sys
sistemas = json.load(open(sys.argv[1], encoding="utf-8"))["sistemas"]
for raiz in ("roms", "media"):
    for sistema in sistemas:
        os.makedirs(os.path.join(sys.argv[2], raiz, sistema["carpeta"]), exist_ok=True)
PY
chown -R "$USUARIO:$USUARIO" "$CASA/roms" "$CASA/media"

if $CON_EMULADORES; then
  echo "== Emuladores de Flathub, núcleos y ajustes de RetroArch"
  flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
  flatpak install -y --noninteractive flathub org.libretro.RetroArch org.DolphinEmu.dolphin-emu org.ppsspp.PPSSPP
  sudo -u "$USUARIO" -H bash "$REPO/scripts/instalar-nucleos.sh"
  sudo -u "$USUARIO" -H bash "$REPO/scripts/configurar-retroarch.sh"
fi

echo "== Siempre encendida"
bash "$REPO/scripts/instalador/sin-suspension.sh" --solo-sistema

echo "== Sesión de quiosco al encender"
cat >/etc/pam.d/neo-arcade <<'PAM'
# Sesión de la consola Neo Arcade (neo-arcade.service): sin contraseña, con sesión de logind para que
# tenga pantalla, sonido, mandos y permiso de apagar.
auth     required pam_permit.so
account  required pam_unix.so
session  required pam_unix.so
session  required pam_systemd.so
session  optional pam_env.so
PAM
cat >/etc/systemd/system/neo-arcade.service <<SERVICIO
[Unit]
Description=Neo Arcade (consola a pantalla completa)
After=systemd-user-sessions.service dbus.socket systemd-logind.service
Wants=dbus.socket systemd-logind.service
Conflicts=getty@tty1.service
After=getty@tty1.service

[Service]
User=$USUARIO
PAMName=neo-arcade
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes
TTYVTDisallocate=yes
StandardInput=tty-fail
StandardOutput=journal
UtmpIdentifier=tty1
UtmpMode=user
Environment=XDG_SESSION_TYPE=wayland
# Sin -s: Cage no deja cambiar de consola con Ctrl + Alt + F1…F12 (ajuste 5).
ExecStart=/usr/bin/cage -- /opt/neo-arcade/neo-arcade --ozone-platform-hint=auto
Restart=always
RestartSec=1

[Install]
WantedBy=graphical.target
SERVICIO
for gestor in lightdm gdm3 sddm; do systemctl disable "$gestor.service" 2>/dev/null || true; done
systemctl disable NetworkManager-wait-online.service systemd-networkd-wait-online.service 2>/dev/null || true
systemctl set-default graphical.target
systemctl daemon-reload
systemctl enable neo-arcade.service

echo "== Arranque sin menú ni textos"
GRUB=/etc/default/grub
ajustar() { if grep -q "^$1=" "$GRUB"; then sed -i "s|^$1=.*|$1=$2|" "$GRUB"; else echo "$1=$2" >>"$GRUB"; fi; }
# El menú sigue ahí: con Esc o Mayús durante el primer segundo aparece (para elegir otro sistema).
ajustar GRUB_TIMEOUT 1
ajustar GRUB_TIMEOUT_STYLE hidden
linea="quiet loglevel=3 systemd.show_status=false rd.udev.log_level=3 udev.log_level=3 vt.global_cursor_default=0"
if [ -n "$HZ" ]; then
  for salida in /sys/class/drm/card*-*; do
    [ "$(cat "$salida/status" 2>/dev/null)" = connected ] && linea="$linea video=${salida##*/card?-}:1920x1080@$HZ"
  done
fi
ajustar GRUB_CMDLINE_LINUX_DEFAULT "\"$linea\""
# GRUB escribe «Cargando Linux…» antes de arrancar; Debian no trae una opción para callarlo. Se quita
# esa línea de /etc/grub.d/10_linux (la copia original queda en /var/lib/neo-arcade, fuera de grub.d,
# porque GRUB ejecuta todo lo que hay ahí).
if [ -f /etc/grub.d/10_linux ] && ! grep -q 'neo-arcade: sin mensajes' /etc/grub.d/10_linux; then
  mkdir -p /var/lib/neo-arcade
  cp /etc/grub.d/10_linux /var/lib/neo-arcade/10_linux.original
  python3 - /etc/grub.d/10_linux <<'PY'
import re, sys
ruta = sys.argv[1]
texto = open(ruta, encoding="utf-8").read()
patron = re.compile(r"""^(\s*)echo\s*'\$\(echo "\$message" \| grub_quote\)'\s*$""", re.M)
open(ruta, "w", encoding="utf-8").write(patron.sub(r"\1true # neo-arcade: sin mensajes", texto))
PY
fi
echo 'kernel.printk = 3 3 3 3' >/etc/sysctl.d/20-neo-arcade-silencio.conf
update-grub
# En la MP80, el firmware arranca la copia de GRUB de la partición EFI de Windows.
[ -x /usr/local/sbin/neoarcade-copiar-grub ] && /usr/local/sbin/neoarcade-copiar-grub || true

echo "== Listo. Al reiniciar, el equipo enciende directo en Neo Arcade."
echo "   Juegos en $CASA/roms/<sistema>/, medios en $CASA/media/<sistema>/."
