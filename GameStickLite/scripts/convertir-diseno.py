#!/usr/bin/env python3
"""Convierte las capturas de Neo Arcade (scripts/capturar-diseno.mjs) al formato del menú del Game
Stick y las deja en <tarjeta>/neo/diseno/.

Cada pieza es un archivo .frm: «NEOF», x, y, ancho y alto en 16 bits little-endian, el largo de los
datos en 32 bits y los píxeles en RGB565 (el formato de la pantalla del Game Stick) comprimidos con
LZ4 en bloque. Las capturas son de 1920×1080 y se reducen a 1280×720.

  <vista>/<NNN>.frm     la pantalla completa con ese juego elegido (todos, nes, snes…)
  barras/<id>.frm       solo la barra de sistemas, con FAVORITOS o RECIENTES activo
  acciones/<estado>.frm solo el menú de acciones: jugar-si, jugar-no, favorito-si, favorito-no
                        (lo elegido, y si la estrella va encendida)
  portada.frm           la pantalla de arranque de Neo Arcade, que el Game Stick muestra al encender
  indice.txt            «#id|nombre» por vista y «vista|NNN|carpeta/archivo|título» por pantalla,
                        con las rutas de la tarjeta (fc/…, sfc/…), en el orden de Neo Arcade

Uso: python3 convertir-diseno.py <capturas> <tarjeta>
"""
import json
import os
import shutil
import struct
import sys

import lz4.block
from PIL import Image

ANCHO, ALTO = 1280, 720
# Zonas en coordenadas de 1280×720 (las de Neo Arcade a 1920×1080, por 2/3, con un margen).
BARRA = (16, 154, 1248, 94)    # barra de sistemas: 30,238 de 1860×128
ACCIONES = (508, 532, 232, 128)  # menú de acciones: 774,808 de 320×180
CARPETA = {"nes": "fc", "snes": "sfc", "megadrive": "md", "gb": "gb", "gbc": "gbc", "gba": "gba"}


def rgb565(imagen):
    r, g, b = imagen.convert("RGB").split()
    datos = bytearray(imagen.width * imagen.height * 2)
    for i, (pr, pg, pb) in enumerate(zip(r.getdata(), g.getdata(), b.getdata())):
        v = ((pr >> 3) << 11) | ((pg >> 2) << 5) | (pb >> 3)
        datos[2 * i] = v & 0xFF
        datos[2 * i + 1] = v >> 8
    return bytes(datos)


def guardar(imagen, zona, destino):
    x, y, w, h = zona
    pieza = imagen.crop((x, y, x + w, y + h))
    comprimido = lz4.block.compress(rgb565(pieza), mode="high_compression", compression=9, store_size=False)
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    with open(destino, "wb") as f:
        f.write(b"NEOF" + struct.pack("<HHHHI", x, y, w, h, len(comprimido)) + comprimido)
    return len(comprimido)


def abrir(ruta):
    return Image.open(ruta).convert("RGB").resize((ANCHO, ALTO), Image.LANCZOS)


def main(capturas, tarjeta):
    indice = json.load(open(os.path.join(capturas, "indice.json"), encoding="utf-8"))
    destino = os.path.join(tarjeta, "neo", "diseno")
    shutil.rmtree(destino, ignore_errors=True)
    total = 0
    lineas = [f"#{v['id']}|{v['nombre']}" for v in indice["vistas"]]
    for p in indice["pantallas"]:
        sistema, archivo = p["id"].split("/", 1)
        total += guardar(abrir(os.path.join(capturas, p["png"])), (0, 0, ANCHO, ALTO),
                         os.path.join(destino, p["vista"], f"{p['indice']:03d}.frm"))
        lineas.append(f"{p['vista']}|{p['indice']:03d}|{CARPETA[sistema]}/{archivo}|{p['titulo'].replace('|', '/')}")
    for nombre in ("favoritos", "recientes"):
        total += guardar(abrir(os.path.join(capturas, "barras", f"{nombre}.png")), BARRA,
                         os.path.join(destino, "barras", f"{nombre}.frm"))
    for estado in ("jugar-si", "jugar-no", "favorito-si", "favorito-no"):
        total += guardar(abrir(os.path.join(capturas, "acciones", f"{estado}.png")), ACCIONES,
                         os.path.join(destino, "acciones", f"{estado}.frm"))
    if os.path.isfile(os.path.join(capturas, "portada.png")):  # la pantalla de arranque de Neo Arcade
        total += guardar(abrir(os.path.join(capturas, "portada.png")), (0, 0, ANCHO, ALTO),
                         os.path.join(destino, "portada.frm"))
    with open(os.path.join(destino, "indice.txt"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lineas) + "\n")
    print(f"listo: {len(indice['pantallas'])} pantallas, {total / 1048576:.1f} MB en {destino}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
