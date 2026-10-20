#!/usr/bin/env bash
# Deja listo un Debian 13 recién instalado para desarrollar Neo Arcade: las bibliotecas que pide
# Electron, Node LTS y los tres emuladores de Flathub. Se puede correr otra vez sin romper nada.
# Uso, dentro de Debian y con sudo: bash scripts/preparar-desarrollo.sh [--pruebas-fase0]
# Los pasos para crear el Debian de WSL desde Windows están en CLAUDE.md.
set -euo pipefail

NODE_VERSION=v24.21.0 # LTS vigente; Electron 44 pide 22.12 o posterior y Debian 13 trae 20.19
EMULADORES=(org.libretro.RetroArch org.DolphinEmu.dolphin-emu org.ppsspp.PPSSPP)

paquetes=(ca-certificates xdg-utils flatpak xdotool
  libgtk-3-0t64 libnss3 libgbm1 libasound2t64 libxss1 libxtst6)
if [[ "${1:-}" == "--pruebas-fase0" ]]; then
  # Solo para repetir docs/pruebas-fase0/correr.sh (WebKitGTK, vídeo y comparación de capturas).
  paquetes+=(python3-gi python3-gi-cairo gir1.2-webkit2-4.1 python3-pil mesa-utils
    gstreamer1.0-libav gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-gl)
fi

echo "== Paquetes de Debian"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends "${paquetes[@]}"

echo "== Node $NODE_VERSION"
if [[ "$(node --version 2>/dev/null || true)" != "$NODE_VERSION" ]]; then
  archivo="node-$NODE_VERSION-linux-x64"
  # Debian no trae curl; se descarga con Python y se compara con la suma publicada por nodejs.org.
  python3 - "$NODE_VERSION" "$archivo" <<'PY'
import hashlib
import sys
import urllib.request

version, archivo = sys.argv[1], sys.argv[2]
base = f"https://nodejs.org/dist/{version}/"
sumas = urllib.request.urlopen(base + "SHASUMS256.txt").read().decode()
esperada = next(linea.split()[0] for linea in sumas.splitlines() if linea.endswith(f"{archivo}.tar.gz"))
datos = urllib.request.urlopen(base + f"{archivo}.tar.gz").read()
if hashlib.sha256(datos).hexdigest() != esperada:
    sys.exit("La suma de Node no coincide con la publicada; no se instala.")
with open(f"/tmp/{archivo}.tar.gz", "wb") as salida:
    salida.write(datos)
PY
  sudo tar -xzf "/tmp/$archivo.tar.gz" -C /opt
  for programa in node npm npx corepack; do
    sudo ln -sf "/opt/$archivo/bin/$programa" "/usr/local/bin/$programa"
  done
  rm -f "/tmp/$archivo.tar.gz"
fi
node --version

echo "== Emuladores de Flathub"
sudo flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
sudo flatpak install -y --noninteractive flathub "${EMULADORES[@]}"
flatpak list --app --columns=application,version
