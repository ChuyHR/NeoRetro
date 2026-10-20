#!/bin/sh
# Últimos ajustes de la instalación automática (preseed/late_command). Corre dentro del instalador,
# con el sistema nuevo montado en /target y la imagen de instalación en /cdrom.
set -e

# sudo sin contraseña mientras dure el desarrollo; la reinstalación de la fase 8 lo quita.
echo "arcade ALL=(ALL) NOPASSWD:ALL" > /target/etc/sudoers.d/arcade
chmod 440 /target/etc/sudoers.d/arcade

# Entrada por SSH solo con la llave de la laptop de desarrollo: sin contraseñas por la red.
mkdir -p /target/home/arcade/.ssh
cp /cdrom/neoarcade/authorized_keys /target/home/arcade/.ssh/authorized_keys
chmod 700 /target/home/arcade/.ssh
chmod 600 /target/home/arcade/.ssh/authorized_keys
in-target chown -R arcade:arcade /home/arcade/.ssh
mkdir -p /target/etc/ssh/sshd_config.d
printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\n' \
  > /target/etc/ssh/sshd_config.d/neoarcade.conf

# Al encender, el escritorio abre solo con el usuario arcade.
mkdir -p /target/etc/lightdm/lightdm.conf.d
printf '[Seat:*]\nautologin-user=arcade\nautologin-user-timeout=0\n' \
  > /target/etc/lightdm/lightdm.conf.d/50-neoarcade.conf
in-target sh -c 'getent group autologin >/dev/null || groupadd -r autologin' || true
in-target usermod -aG autologin,video,audio,input arcade || true
in-target usermod -aG render arcade || true

# Que el menú de arranque ofrezca también Windows (Debian lo trae apagado desde GRUB 2.06).
if grep -q 'GRUB_DISABLE_OS_PROBER' /target/etc/default/grub; then
  sed -i 's/^#\{0,1\}GRUB_DISABLE_OS_PROBER=.*/GRUB_DISABLE_OS_PROBER=false/' /target/etc/default/grub
else
  echo 'GRUB_DISABLE_OS_PROBER=false' >> /target/etc/default/grub
fi
in-target update-grub || true
