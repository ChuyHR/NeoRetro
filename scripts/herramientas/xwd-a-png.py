#!/usr/bin/env python3
"""Convierte una captura de xwd (ZPixmap de 24 o 32 bits) a PNG reducido a la mitad, sin dependencias.

Sirve para ver la pantalla real de la MP80, emulador incluido: xwd -root -silent > c.xwd
Uso: python3 scripts/herramientas/xwd-a-png.py entrada.xwd salida.png
"""
import struct
import sys
import zlib

datos = open(sys.argv[1], "rb").read()
campos = struct.unpack(">25I", datos[:100])
tam_encabezado, _, formato, _, ancho, alto = campos[:6]
orden, bpp, por_linea, ncolores = campos[7], campos[11], campos[12], campos[19]
if formato != 2 or bpp not in (24, 32):
    sys.exit(f"formato no soportado: {formato}, {bpp} bits")
paso = bpp // 8
inicio = tam_encabezado + ncolores * 12
filas = []
for y in range(0, alto, 2):
    linea = datos[inicio + y * por_linea: inicio + y * por_linea + ancho * paso]
    fila = bytearray(b"\x00")
    for x in range(0, ancho, 2):
        o = x * paso
        b, g, r = (linea[o], linea[o + 1], linea[o + 2]) if orden == 0 else (linea[o + paso - 1], linea[o + paso - 2], linea[o + paso - 3])
        fila += bytes((r, g, b))
    filas.append(bytes(fila))


def bloque(tipo, contenido):
    return struct.pack(">I", len(contenido)) + tipo + contenido + struct.pack(">I", zlib.crc32(tipo + contenido) & 0xFFFFFFFF)


ihdr = struct.pack(">IIBBBBB", (ancho + 1) // 2, len(filas), 8, 2, 0, 0, 0)
png = b"\x89PNG\r\n\x1a\n" + bloque(b"IHDR", ihdr) + bloque(b"IDAT", zlib.compress(b"".join(filas), 6)) + bloque(b"IEND", b"")
open(sys.argv[2], "wb").write(png)
