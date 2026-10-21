#!/usr/bin/env bash
# Deshace la parte de arranque de instalar-neo-arcade.sh: el equipo vuelve a encender en el escritorio
# (si hay uno instalado) con el menú de arranque y los mensajes de siempre. La app, los emuladores, los
# juegos y lo que se recuerda no se tocan; instalar-neo-arcade.sh lo vuelve a dejar como consola.
# Uso, como root: bash scripts/instalador/volver-al-escritorio.sh
set -euo pipefail
if [ "$(id -u)" != 0 ]; then
  echo "Hay que correrlo como root: sudo bash $0" >&2
  exit 1
fi

systemctl disable neo-arcade.service 2>/dev/null || true
for gestor in lightdm gdm3 sddm; do
  if [ -f "/lib/systemd/system/$gestor.service" ]; then
    systemctl enable "$gestor.service"
    echo "Escritorio con $gestor"
    break
  fi
done

GRUB=/etc/default/grub
sed -i 's|^GRUB_TIMEOUT=.*|GRUB_TIMEOUT=5|; s|^GRUB_TIMEOUT_STYLE=.*|GRUB_TIMEOUT_STYLE=menu|; s|^GRUB_CMDLINE_LINUX_DEFAULT=.*|GRUB_CMDLINE_LINUX_DEFAULT="quiet"|' "$GRUB"
if [ -f /var/lib/neo-arcade/10_linux.original ]; then
  cp /var/lib/neo-arcade/10_linux.original /etc/grub.d/10_linux
  chmod 755 /etc/grub.d/10_linux
fi
rm -f /etc/sysctl.d/20-neo-arcade-silencio.conf
update-grub
[ -x /usr/local/sbin/neoarcade-copiar-grub ] && /usr/local/sbin/neoarcade-copiar-grub || true
echo "Listo. Al reiniciar, el equipo enciende en el escritorio."
