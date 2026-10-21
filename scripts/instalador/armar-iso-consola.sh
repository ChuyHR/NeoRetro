#!/usr/bin/env bash
# Arma la imagen de instalación de la consola Neo Arcade (fase 8) a partir de la imagen oficial de
# Debian 13 (netinst, amd64). Instala Debian sin escritorio en el espacio libre más grande del disco
# (junto a otro sistema, si lo hay), lleva Neo Arcade ya empaquetado y, en el primer arranque, termina
# solo: emuladores, núcleos y arranque directo en la consola (consola.sh).
#
# Uso, en Linux, desde la raíz del repositorio con node_modules instalado:
#   bash scripts/instalador/armar-iso-consola.sh <imagen oficial .iso> <imagen de salida .iso> \
#        [--llave archivo.pub] [--wifi red archivo-con-la-contraseña]
# --llave deja entrar por SSH con esa llave (mantenimiento). --wifi deja la red y su contraseña escritas
# dentro de la imagen y de la memoria USB: bórralas después de instalar. Por cable no hace falta.
set -euo pipefail

if [[ $# -lt 2 ]]; then
  sed -n '7,11p' "$0" >&2
  exit 2
fi
aqui="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$aqui/../.." && pwd)"
original="$1" salida="$2"
shift 2
llave="" red="" archivo_clave=""
while [ $# -gt 0 ]; do
  case "$1" in
    --llave) llave="$2"; shift ;;
    --wifi) red="$2"; archivo_clave="$3"; shift 2 ;;
    *) echo "Opción desconocida: $1" >&2; exit 2 ;;
  esac
  shift
done
trabajo="$(mktemp -d)"
trap 'rm -rf "$trabajo"' EXIT

echo "== Neo Arcade empaquetado"
bash "$repo/scripts/empaquetar.sh" >/dev/null
mkdir -p "$trabajo/consola"
cp -a "$repo/package.json" "$repo/app" "$repo/core" "$repo/config" "$repo/scripts" "$trabajo/consola/"
mkdir -p "$trabajo/consola/dist"
cp -a "$repo/dist/neo-arcade" "$trabajo/consola/dist/"

echo "== Respuestas de la instalación"
# El mismo preseed de la MP80, pero sin escritorio, y con la red Wi-Fi si se dio.
python3 - "$aqui/preseed.cfg" "$trabajo/preseed.cfg" "$red" "$archivo_clave" <<'PY'
import re, sys

origen, destino, red, archivo_clave = sys.argv[1:5]
texto = open(origen, encoding="utf-8").read()
texto = re.sub(r"^tasksel tasksel/first multiselect .*$", "tasksel tasksel/first multiselect standard, ssh-server", texto, flags=re.M)
texto = re.sub(r"^d-i preseed/late_command string .*$",
               "d-i preseed/late_command string sh /cdrom/neoarcade/final.sh && sh /cdrom/neoarcade/consola.sh", texto, flags=re.M)
if red:
    texto += (f"d-i netcfg/wireless_essid string {red}\n"
              f"d-i netcfg/wireless_essid_again string {red}\n"
              "d-i netcfg/wireless_security_type select wpa\n")
    if archivo_clave:
        texto += f"d-i netcfg/wireless_wpa string {open(archivo_clave, encoding='utf-8').read().strip()}\n"
open(destino, "w", encoding="utf-8").write(texto)
PY
cp "$aqui/final.sh" "$aqui/consola.sh" "$trabajo/"
if [ -n "$llave" ]; then cp "$llave" "$trabajo/authorized_keys"; else : >"$trabajo/authorized_keys"; fi

xorriso -osirrox on -indev "$original" -extract /boot/grub/grub.cfg "$trabajo/grub.cfg" >/dev/null 2>&1
chmod u+w "$trabajo/grub.cfg"
# Entrada nueva al principio del menú de arranque UEFI, elegida sola a los 5 segundos. Sin acentos:
# la tipografía del menú de GRUB no los trae.
python3 - "$trabajo/grub.cfg" <<'PY'
import sys
ruta = sys.argv[1]
lineas = open(ruta, encoding="utf-8").read().splitlines(keepends=True)
entrada = """set default=0
set timeout=5
menuentry 'Instalar la consola Neo Arcade' {
    set background_color=black
    linux    /install.amd/vmlinuz vga=788 auto=true priority=high preseed/file=/cdrom/neoarcade/preseed.cfg language=es country=MX locale=es_MX.UTF-8 keymap=latam --- quiet
    initrd   /install.amd/gtk/initrd.gz
}
"""
for posicion, linea in enumerate(lineas):
    if linea.lstrip().startswith("menuentry"):
        lineas.insert(posicion, entrada)
        break
else:
    sys.exit("No hay ninguna entrada menuentry en grub.cfg; la imagen oficial cambió de forma.")
open(ruta, "w", encoding="utf-8").writelines(lineas)
PY

echo "== Imagen"
rm -f "$salida"
xorriso -indev "$original" -outdev "$salida" \
  -map "$trabajo/preseed.cfg" /neoarcade/preseed.cfg \
  -map "$trabajo/final.sh" /neoarcade/final.sh \
  -map "$trabajo/consola.sh" /neoarcade/consola.sh \
  -map "$trabajo/authorized_keys" /neoarcade/authorized_keys \
  -map "$trabajo/consola" /neoarcade/consola \
  -map "$trabajo/grub.cfg" /boot/grub/grub.cfg \
  -boot_image any replay
echo "Imagen lista: $salida ($(du -h "$salida" | cut -f1))"
