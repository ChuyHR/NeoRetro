#!/usr/bin/env python3
"""Hojas de comparación a partir de las capturas de medir.sh: la misma zona del juego en cada perfil.

Las capturas de RetroArch son solo la imagen del juego, después del shader, en píxeles de la TV. Su
tamaño cambia con el perfil (con escalado entero la imagen es más chica), así que la zona se elige en
proporción a la imagen. Después se amplía ×2 sin suavizar, para que se vea cada píxel de la TV.

Uso: python3 comparar.py <carpeta de resultados> <salida> <juego> <x0> <y0> <x1> <y1> [perfil…]
  x0…y1: la zona, en fracciones de la imagen (0 a 1).
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

AMPLIACION = 2


def recorte(ruta, zona, alto):
    imagen = Image.open(ruta).convert("RGB")
    w, h = imagen.size
    x0, y0, x1, y1 = zona
    caja = (round(x0 * w), round(y0 * h), round(x1 * w), round(y1 * h))
    pieza = imagen.crop(caja)
    # A la misma altura en pantalla, ampliando sin suavizar: los píxeles de la TV se ven tal cual.
    escala = alto / pieza.height
    return pieza.resize((round(pieza.width * escala), alto), Image.NEAREST), imagen.size


def main():
    if len(sys.argv) < 8:
        sys.exit(__doc__)
    carpeta, salida, juego = sys.argv[1:4]
    zona = tuple(float(v) for v in sys.argv[4:8])
    perfiles = sys.argv[8:] or sorted(f[len(juego) + 1:-4] for f in os.listdir(os.path.join(carpeta, "capturas"))
                                      if f.startswith(juego + "-") and f.endswith(".png"))
    piezas = [(perfil, os.path.join(carpeta, "capturas", f"{juego}-{perfil}.png")) for perfil in perfiles]
    piezas = [(perfil, ruta) for perfil, ruta in piezas if os.path.exists(ruta)]
    # Todas a la misma altura: la de la zona en la captura más alta, por la ampliación.
    altos = [Image.open(r).size[1] for _, r in piezas]
    alto = round(max(altos) * (zona[3] - zona[1])) * AMPLIACION
    columnas = 3
    fuente = ImageFont.load_default(size=22)
    hechas = []
    for perfil, ruta in piezas:
        pieza, medida = recorte(ruta, zona, alto)
        hechas.append((perfil, pieza, medida))
    ancho = max(p.width for _, p, _ in hechas)
    filas = (len(hechas) + columnas - 1) // columnas
    hoja = Image.new("RGB", (columnas * (ancho + 16) + 16, filas * (alto + 56) + 16), (12, 14, 24))
    dibujo = ImageDraw.Draw(hoja)
    for i, (perfil, pieza, medida) in enumerate(hechas):
        x = 16 + (i % columnas) * (ancho + 16)
        y = 16 + (i // columnas) * (alto + 56)
        dibujo.text((x, y), f"{perfil}  ({medida[0]}×{medida[1]})", fill=(235, 238, 255), font=fuente)
        hoja.paste(pieza, (x, y + 32))
    os.makedirs(os.path.dirname(salida) or ".", exist_ok=True)
    hoja.save(salida)
    print(f"{salida}: {len(hechas)} perfiles, {hoja.size[0]}×{hoja.size[1]}")


if __name__ == "__main__":
    main()
