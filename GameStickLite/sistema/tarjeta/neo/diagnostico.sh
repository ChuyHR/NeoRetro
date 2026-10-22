#!/bin/sh
# Diagnóstico del Game Stick: deja en la tarjeta lo que hace falta saber para el sistema propio
# (memoria, pantalla, sonido, controles y registro del kernel). Solo lee; no cambia nada.
salida=/mnt/neo/diagnostico.txt
seccion() { echo; echo "== $1"; }
{
  seccion "uname"; uname -a
  seccion "línea de arranque del kernel"; cat /proc/cmdline
  seccion "cpuinfo"; cat /proc/cpuinfo
  seccion "meminfo"; cat /proc/meminfo
  seccion "free"; free
  seccion "swaps"; cat /proc/swaps
  seccion "montajes"; cat /proc/mounts
  seccion "df"; df
  seccion "módulos"; cat /proc/modules
  seccion "dispositivos de entrada"; cat /proc/bus/input/devices
  seccion "/dev/input"; ls -l /dev/input
  seccion "usb"; lsusb
  seccion "framebuffer (fbset)"; fbset
  seccion "framebuffer (sysfs)"
  for f in /sys/class/graphics/fb0/*; do
    [ -f "$f" ] && echo "$(basename "$f"): $(head -n 3 "$f" 2>/dev/null | tr '\n' ' ')"
  done
  seccion "pantalla (sysfs)"
  for f in /sys/class/display/*; do
    [ -f "$f" ] && echo "$(basename "$f"): $(head -n 2 "$f" 2>/dev/null | tr '\n' ' ')"
  done
  seccion "sonido"; cat /proc/asound/cards; cat /proc/asound/pcm; ls -l /dev/snd
  seccion "aplay -l"; /usr/res/bin/aplay -l
  seccion "procesos"; ps
  seccion "programas de /usr/res/bin"; ls -l /usr/res/bin
  seccion "sonidos de /usr/res/wav"; ls -l /usr/res/wav | head -n 20
  seccion "dmesg"; dmesg
} > "$salida" 2>&1
sync
