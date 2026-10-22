#!/usr/bin/env python3
"""Genera los recursos fijos del menú del Game Stick como código C: las tres fuentes de Neo Arcade y
los íconos. No dependen de los juegos: se arman una vez al compilar y van dentro de neo-menu.

- Fuentes: Bungee, Pixelify Sans (variable: se toma el grosor 700) y Share Tech Mono, de los .woff2
  de Neo Arcade (app/fuentes, licencia OFL), pasadas a TrueType para stb_truetype.
- Íconos: dibujos SVG de una sola tinta, rasterizados con rsvg-convert a una máscara de 8 bits por
  tamaño. El menú los pinta del color que toque. El joystick del logotipo va a color (RGB565 + alfa).

Uso: python3 generar-recursos.py <carpeta de fuentes de Neo Arcade> <salida>
Escribe <salida>/recursos.c y <salida>/recursos.h. Necesita python3-fonttools, python3-brotli,
python3-pil y librsvg2-bin.
"""
import io
import os
import subprocess
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from PIL import Image

TRAZO = 'fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"'
LLENO = 'fill="#fff" stroke="none"'

# Íconos en una caja de 24×24. Con «trazo» van en línea, como los del diseño.
ICONOS = {
    "todos": f'<g {LLENO}><rect x="3" y="3" width="7.6" height="7.6" rx="1.6"/><rect x="13.4" y="3" width="7.6" height="7.6" rx="1.6"/>'
             f'<rect x="3" y="13.4" width="7.6" height="7.6" rx="1.6"/><rect x="13.4" y="13.4" width="7.6" height="7.6" rx="1.6"/></g>',
    "nes": f'<g {TRAZO}><rect x="2" y="7" width="20" height="10" rx="1.6"/><path d="M5 12.2h8"/></g>'
           f'<rect x="15" y="11" width="4" height="2.4" rx=".5" {LLENO}/>',
    "snes": f'<g {TRAZO}><path d="M7.2 7h9.6a5 5 0 0 1 0 10H7.2a5 5 0 0 1 0-10z"/><path d="M7.2 10.2v3.6M5.4 12h3.6"/></g>'
            f'<g {LLENO}><circle cx="16.2" cy="10.8" r="1.1"/><circle cx="18.4" cy="13.2" r="1.1"/><circle cx="14" cy="13.2" r="1.1"/></g>',
    "gb": f'<g {TRAZO}><rect x="6" y="2" width="12" height="20" rx="2"/><rect x="8.4" y="4.6" width="7.2" height="6" rx=".6"/>'
          f'<path d="M9.2 14.6v3.2M7.6 16.2h3.2"/></g><g {LLENO}><circle cx="15.6" cy="15.4" r="1.05"/><circle cx="14.2" cy="17.6" r="1.05"/></g>',
    "gbc": f'<g {TRAZO}><path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14a4 4 0 0 1-4 4H8a2 2 0 0 1-2-2z"/><rect x="8.4" y="4.6" width="7.2" height="6.4" rx=".6"/>'
           f'<path d="M9.2 14.8v3M7.7 16.3h3"/></g><g {LLENO}><circle cx="15.4" cy="15.6" r="1.05"/><circle cx="14" cy="17.8" r="1.05"/></g>',
    "gba": f'<g {TRAZO}><rect x="1.5" y="6.5" width="21" height="11" rx="4"/><rect x="8" y="9" width="8" height="6" rx=".6"/>'
           f'<path d="M4.6 10.5v3M3.1 12h3"/></g><g {LLENO}><circle cx="19" cy="11" r="1.05"/><circle cx="20.3" cy="13.4" r="1.05"/></g>',
    "megadrive": f'<g {TRAZO}><path d="M4 9.2c0-2 2-2.8 3.5-2h9c1.5-.8 3.5 0 3.5 2v4.4c0 3-3 4-4.6 2.6l-.9-1.1h-5l-.9 1.1C7 17.6 4 16.6 4 13.6z"/>'
                 f'<path d="M7.6 10v3.4M5.9 11.7h3.4"/></g><g {LLENO}><circle cx="14" cy="12.3" r=".95"/><circle cx="16.2" cy="11.5" r=".95"/><circle cx="18.2" cy="10.7" r=".95"/></g>',
    "favoritos": f'<path {TRAZO} d="M12 20s-7.4-4.5-9.1-9C1.7 7.6 3.9 4.6 7 4.6c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.1 0 5.3 3 4.1 6.4C19.4 15.5 12 20 12 20z"/>',
    "recientes": f'<g {TRAZO}><circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.5 2.2"/></g>',
    "jugar": f'<path {LLENO} d="M7 4.2v15.6l12.4-7.8z"/>',
    "estrella": f'<path {LLENO} d="m12 2.6 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.1 6.3 20.1l1.1-6.3-4.6-4.5 6.4-.9z"/>',
    "estrella-borde": f'<path {TRAZO} d="m12 2.6 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.1 6.3 20.1l1.1-6.3-4.6-4.5 6.4-.9z"/>',
    "cruceta": f'<path {TRAZO} d="M9.2 3h5.6v6.2H21v5.6h-6.2V21H9.2v-6.2H3V9.2h6.2z"/>',
    "flecha-izq": '<path fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M15.5 3.5 7 12l8.5 8.5"/>',
    "flecha-der": '<path fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M8.5 3.5 17 12l-8.5 8.5"/>',
}
TAMANOS = {"todos": [26], "nes": [26], "snes": [26], "gb": [26], "gbc": [26], "gba": [26], "megadrive": [26],
           "favoritos": [26], "recientes": [26], "jugar": [28], "estrella": [28, 22], "estrella-borde": [28],
           "cruceta": [30], "flecha-izq": [40], "flecha-der": [40]}

# El joystick del logotipo, a color.
JOYSTICK = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <ellipse cx="32" cy="51" rx="25" ry="9" fill="#1E90FF"/>
  <ellipse cx="32" cy="47" rx="25" ry="9" fill="#00BFFF"/>
  <ellipse cx="32" cy="46.5" rx="17" ry="5.2" fill="#0B1324"/>
  <rect x="29" y="19" width="6" height="27" rx="3" fill="#C9D2E8"/>
  <circle cx="32" cy="16" r="11.5" fill="#FF168C"/>
  <circle cx="28" cy="12" r="3.6" fill="#FF8AC6"/>
  <circle cx="50" cy="47" r="2.4" fill="#FF168C"/>
</svg>"""


def rasterizar(svg, w, h):
    png = subprocess.run(["rsvg-convert", "-w", str(w), "-h", str(h)], input=svg.encode(), capture_output=True,
                         check=True).stdout
    return Image.open(io.BytesIO(png)).convert("RGBA")


def arreglo(nombre, tipo, datos, por_renglon=24):
    filas = [", ".join(str(v) for v in datos[i:i + por_renglon]) for i in range(0, len(datos), por_renglon)]
    return f"static const {tipo} {nombre}[{len(datos)}] = {{\n  " + ",\n  ".join(filas) + "\n};\n"


def ttf(woff2, grosor=None):
    fuente = TTFont(woff2)
    if grosor and "fvar" in fuente:
        fuente = instancer.instantiateVariableFont(fuente, {"wght": grosor})
    fuente.flavor = None
    salida = io.BytesIO()
    fuente.save(salida)
    return salida.getvalue()


def main(carpeta_fuentes, salida):
    os.makedirs(salida, exist_ok=True)
    c = ['// Generado por scripts/generar-recursos.py: no se edita a mano.', '#include "recursos.h"', ""]
    fuentes = [("bungee", ttf(os.path.join(carpeta_fuentes, "bungee.woff2"))),
               ("pixelify", ttf(os.path.join(carpeta_fuentes, "pixelify-sans.woff2"), 700)),
               ("mono", ttf(os.path.join(carpeta_fuentes, "share-tech-mono.woff2")))]
    for nombre, datos in fuentes:
        c.append(arreglo(f"fuente_{nombre}", "unsigned char", datos))
    c.append("const Fuente FUENTES[] = {" + ", ".join(f"{{fuente_{n}, {len(d)}}}" for n, d in fuentes) + "};\n")

    entradas = []
    for nombre, cuerpo in ICONOS.items():
        for tam in TAMANOS[nombre]:
            svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">{cuerpo}</svg>'
            alfa = list(rasterizar(svg, tam, tam).getchannel("A").getdata())
            ident = f"icono_{nombre.replace('-', '_')}_{tam}"
            c.append(arreglo(ident, "uint8_t", alfa, 32))
            entradas.append(f'{{"{nombre}", {tam}, {tam}, {ident}}}')
    c.append("const Icono ICONOS[] = {\n  " + ",\n  ".join(entradas) + "\n};\n")
    c.append(f"const int N_ICONOS = {len(entradas)};\n")

    imagenes = []
    for tam in (64, 150):
        im = rasterizar(JOYSTICK, tam, tam)
        px, alfa = [], []
        for r, g, b, a in im.getdata():
            px.append(((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3))
            alfa.append(a)
        c.append(arreglo(f"joystick_{tam}_px", "uint16_t", px, 16))
        c.append(arreglo(f"joystick_{tam}_alfa", "uint8_t", alfa, 32))
        imagenes.append(f'{{"joystick", {tam}, {tam}, joystick_{tam}_px, joystick_{tam}_alfa}}')
    c.append("const ImagenFija IMAGENES_FIJAS[] = {\n  " + ",\n  ".join(imagenes) + "\n};\n")
    c.append(f"const int N_IMAGENES_FIJAS = {len(imagenes)};\n")

    with open(os.path.join(salida, "recursos.c"), "w", encoding="utf-8") as f:
        f.write("\n".join(c))
    with open(os.path.join(salida, "recursos.h"), "w", encoding="utf-8") as f:
        f.write("""// Generado por scripts/generar-recursos.py: no se edita a mano.
#pragma once
#include <stdint.h>

typedef struct { const unsigned char *datos; unsigned int tam; } Fuente;
enum { FUENTE_BUNGEE, FUENTE_PIXELIFY, FUENTE_MONO, N_FUENTES };
extern const Fuente FUENTES[N_FUENTES];

typedef struct { const char *nombre; int w, h; const uint8_t *alfa; } Icono;
extern const Icono ICONOS[];
extern const int N_ICONOS;

typedef struct { const char *nombre; int w, h; const uint16_t *px; const uint8_t *alfa; } ImagenFija;
extern const ImagenFija IMAGENES_FIJAS[];
extern const int N_IMAGENES_FIJAS;
""")
    print(f"recursos: 3 fuentes, {len(entradas)} íconos, {len(imagenes)} imágenes en {salida}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
