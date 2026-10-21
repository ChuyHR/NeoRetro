#!/bin/sh
# Parte de la imagen de la consola (armar-iso-consola.sh). Corre al final de la instalación automática
# (preseed/late_command), después de final.sh, con el sistema nuevo en /target y la imagen en /cdrom.
# Deja Neo Arcade listo para terminar de instalarse solo en el primer arranque, cuando ya hay red de
# verdad: ahí baja los emuladores y los núcleos (unos 2.5 GB), y después reinicia en la consola.
set -e

mkdir -p /target/opt/neo-arcade-instalador
cp -a /cdrom/neoarcade/consola/. /target/opt/neo-arcade-instalador/

cat >/target/etc/systemd/system/neo-arcade-primer-arranque.service <<'SERVICIO'
[Unit]
Description=Neo Arcade: terminar la instalación en el primer arranque
After=network-online.target
Wants=network-online.target
ConditionPathExists=!/var/lib/neo-arcade/instalado

[Service]
Type=oneshot
# El avance se ve en la pantalla: es la única vez que la consola muestra texto.
StandardOutput=tty
StandardError=tty
TTYPath=/dev/tty1
ExecStart=/bin/bash /opt/neo-arcade-instalador/scripts/instalador/instalar-neo-arcade.sh
ExecStartPost=/bin/sh -c 'mkdir -p /var/lib/neo-arcade && touch /var/lib/neo-arcade/instalado && systemctl reboot'

[Install]
WantedBy=multi-user.target
SERVICIO
in-target systemctl enable neo-arcade-primer-arranque.service
