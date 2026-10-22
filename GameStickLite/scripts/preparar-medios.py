#!/usr/bin/env python3
"""Prepara carátulas y fichas de los juegos para el menú del Game Stick.

Lee un gamelist.xml de EmulationStation/Skraper por sistema (el de Neo Arcade en la MP80) con sus
imágenes, y para cada juego que esté en la tarjeta deja en <tarjeta>/neo/medios/<carpeta>/:

  <juego>.img  la carátula reducida a 360 px como máximo, en RGB565 (el formato de la pantalla del
               Game Stick): «NEOI», ancho y alto en 16 bits little-endian y los píxeles.
  <juego>.txt  la ficha: nombre, año, género, jugadores, desarrollador y descripción, una por renglón
               como «clave=valor», en UTF-8.

<juego> es el nombre del archivo en roms/<carpeta>/ sin su extensión. Los juegos se emparejan con el
gamelist por nombre sin extensión (en la MP80 muchos están en .zip y en la tarjeta ya no).

Uso: python3 preparar-medios.py <origen> <tarjeta>
  origen: una carpeta por sistema del Game Stick (fc, sfc, md, gb, gbc, gba), cada una con su
          gamelist.xml y las imágenes en las rutas que el gamelist indica.
"""
import os
import struct
import sys
import xml.etree.ElementTree as ET

from PIL import Image

LADO = 360
EXTENSIONES = {".nes", ".sfc", ".smc", ".md", ".gen", ".bin", ".smd", ".gb", ".gbc", ".gba"}


def raiz(nombre):
    return os.path.splitext(nombre)[0].strip()


def a_rgb565(imagen):
    imagen = imagen.convert("RGB")
    imagen.thumbnail((LADO, LADO), Image.LANCZOS)
    w, h = imagen.size
    datos = bytearray(b"NEOI" + struct.pack("<HH", w, h))
    for r, g, b in imagen.getdata():
        datos += struct.pack("<H", ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3))
    return bytes(datos)


def limpio(texto):
    return " ".join((texto or "").split())


def main(origen, tarjeta):
    total_img = total_txt = 0
    for carpeta in sorted(os.listdir(origen)):
        lista = os.path.join(origen, carpeta, "gamelist.xml")
        roms = os.path.join(tarjeta, "roms", carpeta)
        if not os.path.isfile(lista) or not os.path.isdir(roms):
            continue
        en_tarjeta = {raiz(f): f for f in os.listdir(roms) if os.path.splitext(f)[1].lower() in EXTENSIONES}
        destino = os.path.join(tarjeta, "neo", "medios", carpeta)
        os.makedirs(destino, exist_ok=True)
        for juego in ET.parse(lista).getroot().findall("game"):
            nombre_rom = raiz(os.path.basename(juego.findtext("path") or ""))
            if nombre_rom not in en_tarjeta:
                continue
            base = raiz(en_tarjeta[nombre_rom])
            fecha = juego.findtext("releasedate") or ""
            ficha = {
                "nombre": limpio(juego.findtext("name")),
                "año": fecha[:4] if fecha[:4].isdigit() else "",
                "género": limpio(juego.findtext("genre")),
                "jugadores": limpio(juego.findtext("players")),
                "desarrollador": limpio(juego.findtext("developer")),
                "descripción": limpio(juego.findtext("desc")),
            }
            with open(os.path.join(destino, base + ".txt"), "w", encoding="utf-8", newline="\n") as f:
                for clave, valor in ficha.items():
                    if valor:
                        f.write(f"{clave}={valor}\n")
            total_txt += 1
            # La carátula de la caja (thumbnail) y, si no hay, la captura del juego (image).
            for etiqueta in ("thumbnail", "image"):
                ruta = juego.findtext(etiqueta)
                if not ruta:
                    continue
                archivo = os.path.join(origen, carpeta, "images", os.path.basename(ruta))
                if os.path.isfile(archivo):
                    with Image.open(archivo) as imagen, open(os.path.join(destino, base + ".img"), "wb") as f:
                        f.write(a_rgb565(imagen))
                    total_img += 1
                    break
        print(f"{carpeta}: {len(os.listdir(destino))} archivos")
    print(f"listo: {total_txt} fichas y {total_img} carátulas")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
