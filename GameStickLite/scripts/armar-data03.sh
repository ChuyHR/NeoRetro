#!/usr/bin/env bash
# Arma un DATA03 con el lanzador de GameStickLite a partir del DATA03 original de la V1.5.
# DATA03 son 6 MB de relleno de x86 y, desde ahí, un ext3 que el arranque de fábrica monta en
# /usr/res. Dentro, /bin/arm-linux-gdb pasa a llamarse arm-linux-gdb.fabrica y su lugar lo ocupa
# sistema/lanzador.sh. Se corre en el Debian de WSL (debugfs y e2fsck de e2fsprogs).
# Uso: bash scripts/armar-data03.sh <DATA03 original> [salida]
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
ORIGINAL="${1:?Falta la ruta al DATA03 original de la V1.5}"
SALIDA="${2:-$RAIZ/compilado/DATA03}"
HUELLA_ORIGINAL=d47ac315aec0cb3d5235bd07f40020322e4a18280ae6106af608280f9a5a4501
DESPLAZAMIENTO=6291456 # donde empieza el ext3 (el mismo -o del losetup de rcS)
DEBUGFS=/usr/sbin/debugfs
E2FSCK=/usr/sbin/e2fsck

if [ "$(sha256sum < "$ORIGINAL" | cut -c1-64)" != "$HUELLA_ORIGINAL" ]; then
  echo "Ese no es el DATA03 original de la V1.5 (la huella no coincide)." >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
dd if="$ORIGINAL" of="$tmp/res.ext" bs=1M skip=$((DESPLAZAMIENTO / 1048576)) status=none
tr -d '\r' < "$RAIZ/sistema/lanzador.sh" > "$tmp/lanzador.sh"

# ln y unlink de debugfs no tocan el conteo de enlaces: juntos son un cambio de nombre.
"$DEBUGFS" -w -f - "$tmp/res.ext" > "$tmp/debugfs.log" 2>&1 <<EOF
ln /bin/arm-linux-gdb /bin/arm-linux-gdb.fabrica
unlink /bin/arm-linux-gdb
write $tmp/lanzador.sh /bin/arm-linux-gdb
sif /bin/arm-linux-gdb mode 0100755
sif /bin/arm-linux-gdb uid 0
sif /bin/arm-linux-gdb gid 0
EOF
"$E2FSCK" -fn "$tmp/res.ext" > "$tmp/e2fsck.log" 2>&1 || { cat "$tmp/e2fsck.log" >&2; exit 1; }

mkdir -p "$(dirname "$SALIDA")"
{ head -c "$DESPLAZAMIENTO" "$ORIGINAL"; cat "$tmp/res.ext"; } > "$SALIDA"
if [ "$(stat -c %s "$SALIDA")" != "$(stat -c %s "$ORIGINAL")" ]; then
  echo "El DATA03 nuevo no tiene el tamaño del original." >&2
  exit 1
fi
"$DEBUGFS" -R "ls -l /bin" "$tmp/res.ext" 2>/dev/null | grep -E "arm-linux-gdb"
echo "Listo: $SALIDA ($(sha256sum < "$SALIDA" | cut -c1-16)…)"
