#!/bin/sh
# Lo corre el lanzador una vez por encendido, antes del menú de fábrica. Vive en la tarjeta para poder
# cambiarlo desde la laptop sin rearmar DATA03. Todo lo que deja queda en /mnt/neo.
# Cada paso lleva límite de tiempo (timeout de busybox 1.32): nada de aquí puede dejar al aparato sin
# llegar a su menú.
NEO=/mnt/neo
echo "arranque: $(date), núcleo $(uname -r)"
# Lo primero: la portada de Neo Arcade sobre la imagen del fabricante. Se queda hasta que dibuja el menú.
if [ -f "$NEO/neo-menu" ] && [ -f "$NEO/diseno/portada.frm" ]; then
  timeout 10 "$NEO/neo-menu" "$NEO/registro-menu.txt" --portada
  echo "portada: $?"
fi
timeout 60 /bin/sh "$NEO/diagnostico.sh"
echo "diagnóstico terminado ($?)"
# La prueba de pantalla y controles corre solo la primera vez (o si se borra neo/prueba-hecha).
if [ -f "$NEO/neo-prueba" ] && [ ! -f "$NEO/prueba-hecha" ]; then
  timeout 200 "$NEO/neo-prueba" "$NEO/registro-prueba.txt"
  echo "neo-prueba terminó con $?"
  : > "$NEO/prueba-hecha"
  sync
fi
# El menú de juegos. Se sale al menú de fábrica con Select + Start mantenidos 2 s (moneda + Start en el
# tablero); también sale solo tras 15 minutos sin uso. El límite de 6 horas es solo un seguro.
if [ -f "$NEO/neo-menu" ]; then
  timeout 21600 "$NEO/neo-menu" "$NEO/registro-menu.txt"
  echo "neo-menu terminó con $?"
fi
sync
