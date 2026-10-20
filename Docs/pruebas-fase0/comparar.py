#!/usr/bin/env python3
"""Compara la captura de Electron con la de WebKitGTK, ambas a 1920×1080.

Uso: python3 comparar.py <carpeta de resultados>
Deja diferencias.png (en rojo lo que cambia) y escribe el porcentaje por zona de la pantalla.
"""

import sys

from PIL import Image, ImageChops

SALIDA = sys.argv[1]
UMBRAL = 40  # diferencia por canal a partir de la cual un píxel cuenta como distinto

# Zonas del prototipo (x, y, ancho, alto), tomadas de las medidas de NeoArcade.dc.html.
ZONAS = {
    "cabecera (sin reloj)": (0, 0, 1668, 232),
    "barra de sistemas": (30, 238, 1860, 128),
    "carrusel": (0, 380, 1920, 380),
    "reflejos bajo las portadas": (500, 757, 660, 40),
    "ficha del juego": (58, 798, 690, 190),
    "acciones": (774, 808, 320, 180),
    "vista previa": (1146, 790, 514, 202),
    "pie de controles": (0, 1002, 1920, 78),
}

electron = Image.open(f"{SALIDA}/captura-electron-1920.png").convert("RGB")
webkit = Image.open(f"{SALIDA}/captura-webkitgtk.png").convert("RGB")
if electron.size != webkit.size:
    sys.exit(f"tamaños distintos: {electron.size} y {webkit.size}")

diferencia = ImageChops.difference(electron, webkit).convert("L").point(lambda v: 255 if v > UMBRAL else 0)
mapa = Image.blend(electron.convert("L").convert("RGB"), Image.new("RGB", electron.size, (0, 0, 0)), 0.6)
mapa.paste((255, 40, 40), mask=diferencia)
mapa.save(f"{SALIDA}/diferencias.png")

with open(f"{SALIDA}/resultado-comparacion.txt", "w", encoding="utf-8") as archivo:
    for nombre, (x, y, w, h) in ZONAS.items():
        zona = diferencia.crop((x, y, x + w, y + h))
        distintos = sum(1 for v in zona.getdata() if v)
        linea = f"{nombre:28} {100 * distintos / (w * h):5.1f} % de píxeles distintos"
        print(linea)
        archivo.write(linea + "\n")
