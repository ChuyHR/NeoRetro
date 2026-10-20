#!/usr/bin/env bash
# Crea el usuario de desarrollo en un Debian de WSL recién instalado. Se corre como root desde Windows:
#   wsl -d Debian -u root --exec bash /mnt/d/UtilsDev/ArcadeRetro/scripts/crear-usuario-wsl.sh
# Va en un script porque PowerShell 5.1 rompe las comillas internas al pasarle el comando a WSL.
# El uid 1000 hace que WSL se salte su pantalla de bienvenida, que pide un usuario de forma interactiva.
set -euo pipefail

if ! id arcade >/dev/null 2>&1; then
  adduser --uid 1000 --quiet --disabled-password --gecos "" arcade
fi
usermod -aG sudo,video,render,audio,input arcade
echo "arcade ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/arcade
chmod 440 /etc/sudoers.d/arcade
printf '[boot]\nsystemd=true\n\n[user]\ndefault=arcade\n' > /etc/wsl.conf
id arcade
