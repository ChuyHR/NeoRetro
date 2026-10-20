#!/usr/bin/env bash
# Instala los núcleos de RetroArch que pide config/systems.json en la carpeta que lee la versión de
# Flathub (carpetaNucleos en config/emulators.json). Los baja del mismo servidor que usa el actualizador
# de RetroArch y compara cada uno con el CRC32 que publica ese servidor en su índice. Un núcleo que ya
# está no se vuelve a bajar; con --actualizar se reemplazan todos.
# Uso: bash scripts/instalar-nucleos.sh [--actualizar]
set -euo pipefail
cd "$(dirname "$0")/.."

# Debian no trae curl: se descarga con Python, que ya instala preparar-desarrollo.sh.
python3 - "$@" <<'PY'
import io
import json
import os
import sys
import urllib.request
import zipfile
import zlib

SERVIDOR = "https://buildbot.libretro.com/nightly/linux/x86_64/latest/"
actualizar = "--actualizar" in sys.argv[1:]

with open("config/systems.json", encoding="utf-8") as archivo:
    sistemas = json.load(archivo)["sistemas"]
with open("config/emulators.json", encoding="utf-8") as archivo:
    retroarch = json.load(archivo)["emuladores"]["retroarch"]
destino = os.path.expanduser(retroarch["carpetaNucleos"])
nucleos = sorted({sistema["nucleo"] for sistema in sistemas if sistema["emulador"] == "retroarch"})

# Cada línea del índice: fecha, CRC32 del núcleo ya descomprimido y nombre del zip.
indice = {}
for linea in urllib.request.urlopen(SERVIDOR + ".index-extended").read().decode().splitlines():
    partes = linea.split()
    if len(partes) == 3:
        indice[partes[2]] = int(partes[1], 16)

os.makedirs(destino, exist_ok=True)
print(f"Núcleos en {destino}")
for nucleo in nucleos:
    nombre = f"{nucleo}_libretro.so"
    ruta = os.path.join(destino, nombre)
    if os.path.exists(ruta) and not actualizar:
        print(f"  {nucleo}: ya estaba")
        continue
    if f"{nombre}.zip" not in indice:
        sys.exit(f"El servidor no tiene {nombre}.zip; revisa el nombre del núcleo en config/systems.json.")
    comprimido = urllib.request.urlopen(SERVIDOR + f"{nombre}.zip").read()
    with zipfile.ZipFile(io.BytesIO(comprimido)) as zip_:
        contenido = zip_.read(nombre)
    if zlib.crc32(contenido) != indice[f"{nombre}.zip"]:
        sys.exit(f"{nombre} no coincide con el índice del servidor; no se instala.")
    # Se escribe aparte y se renombra, para no dejar a medias un núcleo que RetroArch podría abrir.
    with open(ruta + ".nuevo", "wb") as salida:
        salida.write(contenido)
    os.replace(ruta + ".nuevo", ruta)
    print(f"  {nucleo}: instalado ({len(contenido) // 1024} KB)")
PY
