#!/usr/bin/env bash
# Prepara el laboratorio en la MP80: la carpeta de trabajo y una copia del retroarch.cfg de Neo Arcade
# con los ajustes de laboratorio.cfg en lugar de los suyos. El retroarch.cfg de Neo Arcade solo se lee;
# se guarda su huella para comprobar al final que nadie lo cambió.
# Uso: bash preparar.sh   (desde la carpeta del laboratorio: ~/visual-enhancement-lab/codigo)
set -euo pipefail
COD="$(cd "$(dirname "$0")" && pwd)"
LAB="$(dirname "$COD")"
T="$LAB/trabajo"
ORIGINAL="$HOME/.var/app/org.libretro.RetroArch/config/retroarch/retroarch.cfg"

mkdir -p "$T"/{saves,states,estados,capturas,registros}
# Las opciones de los núcleos de Neo Arcade, para que los juegos corran igual que en la consola.
rm -rf "$T/config"
cp -r "$(dirname "$ORIGINAL")/config" "$T/config"
# Una clave repetida en un .cfg no garantiza cuál gana: se quitan de la copia las que el laboratorio pone.
claves=$(grep -oE '^[a-z0-9_]+' "$COD/laboratorio.cfg" | paste -sd'|')
{ grep -vE "^($claves) = " "$ORIGINAL"; sed "s#__LAB__#$LAB#g" "$COD/laboratorio.cfg"; } > "$T/base.cfg"
sha256sum "$ORIGINAL" > "$T/huella-retroarch-cfg.txt"
echo "Base del laboratorio: $T/base.cfg ($(grep -c ' = ' "$T/base.cfg") claves)"
echo "Huella del retroarch.cfg de Neo Arcade: $(cut -c1-16 "$T/huella-retroarch-cfg.txt")"
