#!/usr/bin/env python3
"""Arma una biblioteca de Neo Arcade con los juegos de la tarjeta del Game Stick, para que la propia
interfaz de Neo Arcade dibuje las pantallas del menú (ver scripts/capturar-diseno.mjs).

  <salida>/roms/<sistema>/   enlaces a los juegos de <tarjeta>/roms/<carpeta>/ (no se copian)
  <salida>/medios/<sistema>/ gamelist.xml con las rutas cambiadas a los nombres de la tarjeta, e
                             images/ con las carátulas originales de la MP80
  <salida>/datos/            datos-usuario.json con un favorito y un reciente, para que la barra de
                             Neo Arcade muestre también FAVORITOS y RECIENTES

<sistema> es el de Neo Arcade (nes, snes, megadrive…) y <carpeta>, el del Game Stick (fc, sfc, md…).
<origen> trae una carpeta por sistema del Game Stick con su gamelist.xml e images/, como la que deja
la MP80 en /tmp/medios-gs.

Uso: python3 preparar-diseno.py <tarjeta> <origen> <salida>
"""
import json
import os
import shutil
import sys
import xml.etree.ElementTree as ET

SISTEMAS = {"fc": "nes", "sfc": "snes", "md": "megadrive", "gb": "gb", "gbc": "gbc", "gba": "gba"}
EXTENSIONES = {".nes", ".sfc", ".smc", ".md", ".gen", ".bin", ".smd", ".gb", ".gbc", ".gba"}


def raiz(nombre):
    return os.path.splitext(nombre)[0].strip()


def main(tarjeta, origen, salida):
    for sub in ("roms", "medios", "datos"):
        shutil.rmtree(os.path.join(salida, sub), ignore_errors=True)
    primero = None
    for carpeta, sistema in SISTEMAS.items():
        roms = os.path.join(tarjeta, "roms", carpeta)
        if not os.path.isdir(roms):
            continue
        destino_roms = os.path.join(salida, "roms", sistema)
        destino_medios = os.path.join(salida, "medios", sistema)
        os.makedirs(destino_roms)
        os.makedirs(os.path.join(destino_medios, "images"))
        archivos = sorted(f for f in os.listdir(roms) if os.path.splitext(f)[1].lower() in EXTENSIONES)
        for f in archivos:
            os.symlink(os.path.join(roms, f), os.path.join(destino_roms, f))
        primero = primero or f"{sistema}/{archivos[0]}"
        por_raiz = {raiz(f): f for f in archivos}
        lista = os.path.join(origen, carpeta, "gamelist.xml")
        salida_xml = ET.Element("gameList")
        if os.path.isfile(lista):
            for juego in ET.parse(lista).getroot().findall("game"):
                nombre = raiz(os.path.basename(juego.findtext("path") or ""))
                if nombre not in por_raiz:
                    continue
                juego.find("path").text = "./" + por_raiz[nombre]
                for etiqueta in ("image", "thumbnail", "marquee", "video", "manual", "bezel"):
                    elemento = juego.find(etiqueta)
                    if elemento is None or not elemento.text:
                        continue
                    imagen = os.path.join(origen, carpeta, "images", os.path.basename(elemento.text))
                    if etiqueta in ("image", "thumbnail") and os.path.isfile(imagen):
                        shutil.copy(imagen, os.path.join(destino_medios, "images"))
                        elemento.text = "./images/" + os.path.basename(elemento.text)
                    else:
                        juego.remove(elemento)  # lo que no se trajo (videos, manuales…) no se anuncia
                salida_xml.append(juego)
        ET.ElementTree(salida_xml).write(os.path.join(destino_medios, "gamelist.xml"), encoding="utf-8",
                                         xml_declaration=True)
        print(f"{sistema}: {len(archivos)} juegos, {len(salida_xml)} con datos")
    os.makedirs(os.path.join(salida, "datos"))
    with open(os.path.join(salida, "datos", "datos-usuario.json"), "w", encoding="utf-8") as f:
        json.dump({"favoritos": [primero], "recientes": [{"id": primero, "fecha": "2026-01-01T00:00:00Z"}]}, f)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
