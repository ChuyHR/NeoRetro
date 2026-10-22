#!/bin/sh
# GameStickLite: lanzador. Ocupa el lugar de /usr/res/bin/arm-linux-gdb dentro de DATA03, que es lo
# que el arranque de fábrica (rcS, dentro del kernel) corre en bucle para abrir el menú:
#   /usr/res/bin/arm-linux-gdb --tty=/dev/ttyS0 /entry --ex r
# Una vez por encendido corre lo que haya en la tarjeta (/mnt/neo/arranque.sh); después, y siempre
# que falle, abre el menú de fábrica, que quedó como arm-linux-gdb.fabrica. Así el aparato nunca se
# queda sin menú.
if [ ! -e /tmp/neo-arranque-hecho ] && [ -f /mnt/neo/arranque.sh ]; then
  : > /tmp/neo-arranque-hecho
  /bin/sh /mnt/neo/arranque.sh > /mnt/neo/arranque.log 2>&1
  sync
fi
exec /usr/res/bin/arm-linux-gdb.fabrica "$@"
