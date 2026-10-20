#!/usr/bin/env bash
# El firmware de la MP80 arranca siempre «Windows Boot Manager» e ignora el orden que se pone desde
# Debian con efibootmgr. Para que aparezca el menú de GRUB, esa entrada se apunta desde Windows
#   bcdedit /set "{bootmgr}" path \EFI\debian\shimx64.efi
# a una copia de shim y GRUB que vive en la partición EFI de Windows. Este script hace esa copia y la
# mantiene: apt lo llama después de cada instalación, para que no quede desfasada respecto de los
# módulos de /boot/grub cuando Debian actualice GRUB. Para volver atrás, desde Windows:
#   bcdedit /set "{bootmgr}" path \EFI\Microsoft\Boot\bootmgfw.efi
# Instalación en la MP80:
#   sudo install -m 755 copiar-grub-a-esp-windows.sh /usr/local/sbin/neoarcade-copiar-grub
#   y el gancho /etc/apt/apt.conf.d/99neoarcade-copiar-grub (ver CLAUDE.md)
set -euo pipefail

PARTUUID_WINDOWS=fdd3815a-befa-4adb-b8b5-f9f5cf11a41f # partición EFI de Windows (sda1) en la MP80
origen=/boot/efi/EFI/debian
dispositivo=/dev/disk/by-partuuid/$PARTUUID_WINDOWS

if [ ! -b "$dispositivo" ]; then
  echo "No encontré la partición EFI de Windows ($PARTUUID_WINDOWS)." >&2
  exit 1
fi
punto=$(mktemp -d)
trap 'umount "$punto" 2>/dev/null || true; rmdir "$punto"' EXIT
mount -t vfat "$dispositivo" "$punto"
mkdir -p "$punto/EFI/debian"
cp -r "$origen/." "$punto/EFI/debian/"
sync
echo "Menú de Debian copiado a la partición EFI de Windows."
