#!/usr/bin/env bash
# Completa en la MP80 lo que la instalación automática no pudo instalar el 2026-10-20: el instalador
# eligió el cable hacia la laptop, que aún no compartía internet, y dejó solo el sistema base.
# Agrega fuentes de paquetes, teclado de la consola, escritorio Xfce, NetworkManager, anuncio en la
# red (avahi), Windows en el menú de GRUB y Debian primero en el orden de arranque del firmware.
# Corre como root y sigue aunque se corte el SSH:
#   sudo systemd-run --unit=neoarcade-completar bash completar-mp80.sh
# Registro: /var/log/neoarcade-completar.log
set -euo pipefail
exec >>/var/log/neoarcade-completar.log 2>&1
export DEBIAN_FRONTEND=noninteractive
echo "== Inicio $(date)"

cat >/etc/apt/sources.list <<'FUENTES'
deb http://deb.debian.org/debian trixie main non-free-firmware
deb http://deb.debian.org/debian trixie-updates main non-free-firmware
deb http://security.debian.org/debian-security trixie-security main non-free-firmware
FUENTES

# Sin console-setup la pantalla de texto queda con teclado inglés (la ñ no se podía escribir).
debconf-set-selections <<'TECLADO'
keyboard-configuration keyboard-configuration/xkb-keymap select latam
keyboard-configuration keyboard-configuration/layoutcode string latam
keyboard-configuration keyboard-configuration/modelcode string pc105
TECLADO

apt-get update
apt-get -y full-upgrade
apt-get -y install console-setup keyboard-configuration network-manager wpasupplicant \
  avahi-daemon task-xfce-desktop
setupcon --force || true

# Windows en el menú de GRUB y Debian primero en el firmware, que lo había dejado detrás de Windows.
sed -i 's/^#\{0,1\}GRUB_DISABLE_OS_PROBER=.*/GRUB_DISABLE_OS_PROBER=false/' /etc/default/grub
grep -q '^GRUB_DISABLE_OS_PROBER=false' /etc/default/grub ||
  echo 'GRUB_DISABLE_OS_PROBER=false' >>/etc/default/grub
update-grub
debian=$(efibootmgr | sed -n 's/^Boot\([0-9A-Fa-f]\{4\}\)\*\{0,1\} debian.*/\1/p' | head -1)
if [ -n "$debian" ]; then
  resto=$(efibootmgr | sed -n 's/^BootOrder: //p' | tr ',' '\n' | { grep -vx "$debian" || true; } |
    paste -sd, -)
  efibootmgr -o "$debian${resto:+,$resto}" >/dev/null
fi
efibootmgr | grep '^BootOrder'

# Que NetworkManager administre también el cable (lo tenía un dhcpcd lanzado a mano). El SSH se corta
# unos segundos; la laptop vuelve a dar la misma dirección.
echo "== Cambio a NetworkManager"
pkill -x dhcpcd || true
systemctl restart NetworkManager
sleep 10
nmcli -t -f DEVICE,STATE device
echo "== LISTO $(date)"
