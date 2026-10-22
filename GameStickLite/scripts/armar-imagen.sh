#!/usr/bin/env bash
# Arma la imagen completa de la microSD del Game Stick (M8 Pro V1.5), lista para escribir con
# balenaEtcher o Win32DiskImager. Igual que la tarjeta de fábrica:
#   - el arranque (u-boot de Amlogic) en el primer MB, con la tabla de particiones en su lugar;
#   - una partición FAT32 (tipo 0x0C) desde el MB 4, con clústeres de 32 KB.
# En la partición:
#   res/   el sistema V1.5, con el DATA03 que lleva el lanzador de GameStickLite;
#   neo/   nuestros programas, el arranque, las carátulas, la BIOS de GBA y las partidas;
#   roms/  los juegos, por carpeta del Game Stick (fc, sfc, md, gb, gbc, gba…);
#   save/ y download/, que el sistema de fábrica espera.
#
# Los archivos de fábrica se toman de fabrica/ (no van al repositorio; ver docs/guia.md).
# Se corre en el Debian de WSL (sfdisk, mkfs.fat y mtools; no hace falta montar nada).
#
# Uso: bash scripts/armar-imagen.sh [--tamano-mb 2048] [--roms <carpeta>] [--medios <carpeta>]
#                                   [--bios <carpeta>] [--salida <archivo.img>]
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
FABRICA="$RAIZ/fabrica"
TAMANO_MB=2048
ROMS="" MEDIOS="" BIOS=""
SALIDA="$RAIZ/compilado/gamestick.img"
while [ $# -gt 0 ]; do
  case "$1" in
    --tamano-mb) TAMANO_MB="$2"; shift ;;
    --roms) ROMS="$2"; shift ;;
    --medios) MEDIOS="$2"; shift ;;
    --bios) BIOS="$2"; shift ;;
    --salida) SALIDA="$2"; shift ;;
    *) echo "Opción desconocida: $1" >&2; exit 2 ;;
  esac
  shift
done

INICIO_PARTICION=8192   # sectores: el MB 4, como la tarjeta de fábrica
FIRMA_DISCO=0x0000d3be  # la misma de la tarjeta de fábrica

# 1. Archivos de fábrica completos y sin cambios.
(cd "$FABRICA" && sha256sum --quiet -c HUELLAS.txt) || { echo "fabrica/ no está completa (ver HUELLAS.txt)." >&2; exit 1; }
[ -f "$RAIZ/compilado/DATA03" ] || bash "$RAIZ/scripts/armar-data03.sh" "$FABRICA/res-v1.5/DATA03"
for p in neo-prueba neo-menu neo-retro-nes neo-retro-snes neo-retro-gb neo-retro-gba neo-retro-md; do
  [ -x "$RAIZ/compilado/$p" ] || { echo "Falta compilado/$p: corre scripts/compilar.sh." >&2; exit 1; }
done

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$(dirname "$SALIDA")"

# 2. La partición FAT32 aparte, en un archivo; después se coloca en la imagen.
SECTORES_PARTICION=$(( TAMANO_MB * 2048 - INICIO_PARTICION ))
truncate -s $(( SECTORES_PARTICION * 512 )) "$tmp/particion.img"
# FAT32 pide al menos 65 525 clústeres; con menos, Linux la toma por FAT16. Tamaño del clúster como el
# de Windows: 4 KB hasta 8 GB, 8 KB hasta 16, 16 KB hasta 32 y 32 KB (el de fábrica) más arriba.
if   [ "$TAMANO_MB" -le 8192 ];  then SECTORES_CLUSTER=8
elif [ "$TAMANO_MB" -le 16384 ]; then SECTORES_CLUSTER=16
elif [ "$TAMANO_MB" -le 32768 ]; then SECTORES_CLUSTER=32
else SECTORES_CLUSTER=64; fi
mkfs.fat -F 32 -s "$SECTORES_CLUSTER" -h "$INICIO_PARTICION" -n GAMESTICK "$tmp/particion.img" > /dev/null
export MTOOLS_SKIP_CHECK=1
P=(-i "$tmp/particion.img")
mmd "${P[@]}" ::res ::res/settings ::neo ::neo/sistema ::neo/partidas ::neo/medios ::roms ::save ::download
mcopy "${P[@]}" "$FABRICA"/res-v1.5/{DATA01,DATA02,DATA06,system.img} "$FABRICA"/res-v1.3/{DATA04,DATA05} ::res/
mcopy "${P[@]}" "$RAIZ/compilado/DATA03" ::res/
mcopy "${P[@]}" "$FABRICA"/res-v1.3/settings/*.txt ::res/settings/
for g in "$RAIZ"/sistema/tarjeta/neo/*.sh; do  # los guiones van con fin de línea de Linux
  tr -d '\r' < "$g" > "$tmp/$(basename "$g")"
  mcopy "${P[@]}" "$tmp/$(basename "$g")" ::neo/
done
mcopy "${P[@]}" "$RAIZ"/compilado/neo-* ::neo/
[ -n "$BIOS" ] && mcopy "${P[@]}" -s "$BIOS"/. ::neo/sistema/
[ -n "$MEDIOS" ] && mcopy "${P[@]}" -s "$MEDIOS"/. ::neo/medios/
if [ -n "$ROMS" ]; then
  mcopy "${P[@]}" -s "$ROMS"/. ::roms/
else
  for c in atari fc gb gba gbc img mame md ps1 res sfc; do mmd "${P[@]}" "::roms/$c"; done
fi

# 3. La imagen: tabla de particiones, el arranque de fábrica alrededor de ella y la partición.
truncate -s $(( TAMANO_MB * 1048576 )) "$SALIDA"
printf 'label: dos\nlabel-id: %s\nstart=%d, type=c\n' "$FIRMA_DISCO" "$INICIO_PARTICION" | sfdisk -q "$SALIDA"
# El arranque ocupa los bytes 0 a 445 y los sectores 1 en adelante; los 446 a 511 son la tabla.
dd if="$FABRICA/arranque-v1.5-1MB.bin" of="$SALIDA" bs=446 count=1 conv=notrunc status=none
dd if="$FABRICA/arranque-v1.5-1MB.bin" of="$SALIDA" bs=512 skip=1 seek=1 count=2047 conv=notrunc status=none
dd if="$tmp/particion.img" of="$SALIDA" bs=1M seek=$(( INICIO_PARTICION / 2048 )) conv=notrunc,sparse status=none

sfdisk -l "$SALIDA" | tail -n 2
mdir "${P[@]}" -/ ::neo | grep -E "neo-|arranque" | head -n 12
echo "Listo: $SALIDA ($TAMANO_MB MB). Se escribe en la microSD con balenaEtcher o Win32DiskImager."
