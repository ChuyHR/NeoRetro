#!/usr/bin/env bash
# Arma la imagen de instalación automática de Debian 13 para la MP80 a partir de la imagen oficial.
# Uso: bash scripts/instalador/armar-iso.sh <imagen oficial .iso> <llave pública .pub> \
#        <imagen de salida .iso> [red Wi-Fi] [archivo con la contraseña del Wi-Fi]
# Lo normal es instalar por cable con internet y no dar red Wi-Fi. Si se da, la contraseña queda
# escrita dentro de la imagen y de la memoria USB: bórralas después de instalar.
set -euo pipefail

if [[ $# -lt 3 ]]; then
  sed -n '3,6p' "$0" >&2
  exit 2
fi
aqui="$(cd "$(dirname "$0")" && pwd)"
original="$1" llave="$2" salida="$3" red="${4:-}" archivo_clave="${5:-}"
trabajo="$(mktemp -d)"
trap 'rm -rf "$trabajo"' EXIT

# Con Python y no con sed, para que una contraseña con símbolos no rompa la sustitución.
python3 - "$aqui/preseed.cfg" "$trabajo/preseed.cfg" "$red" "$archivo_clave" <<'PY'
import sys

origen, destino, red, archivo_clave = sys.argv[1:5]
with open(origen, encoding="utf-8") as archivo:
    texto = archivo.read()
if red:
    texto += (
        f"d-i netcfg/wireless_essid string {red}\n"
        f"d-i netcfg/wireless_essid_again string {red}\n"
        "d-i netcfg/wireless_security_type select wpa\n"
    )
    if archivo_clave:
        with open(archivo_clave, encoding="utf-8") as archivo:
            clave = archivo.read().strip()
        texto += f"d-i netcfg/wireless_wpa string {clave}\n"
with open(destino, "w", encoding="utf-8") as archivo:
    archivo.write(texto)
PY
cp "$llave" "$trabajo/authorized_keys"
cp "$aqui/final.sh" "$trabajo/final.sh"

xorriso -osirrox on -indev "$original" -extract /boot/grub/grub.cfg "$trabajo/grub.cfg" >/dev/null 2>&1
chmod u+w "$trabajo/grub.cfg"

# Entrada nueva al principio del menú de arranque UEFI, elegida sola a los 5 segundos. El título va
# sin acentos porque la tipografía del menú de GRUB no los trae.
python3 - "$trabajo/grub.cfg" <<'PY'
import sys

ruta = sys.argv[1]
with open(ruta, encoding="utf-8") as archivo:
    lineas = archivo.read().splitlines(keepends=True)
entrada = """set default=0
set timeout=5
menuentry 'Instalacion automatica de Neo Arcade (junto a Windows)' {
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
with open(ruta, "w", encoding="utf-8") as archivo:
    archivo.writelines(lineas)
PY

rm -f "$salida"
xorriso -indev "$original" -outdev "$salida" \
  -map "$trabajo/preseed.cfg" /neoarcade/preseed.cfg \
  -map "$trabajo/final.sh" /neoarcade/final.sh \
  -map "$trabajo/authorized_keys" /neoarcade/authorized_keys \
  -map "$trabajo/grub.cfg" /boot/grub/grub.cfg \
  -boot_image any replay
echo "Imagen lista: $salida"
