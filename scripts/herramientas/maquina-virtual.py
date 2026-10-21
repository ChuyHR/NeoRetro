#!/usr/bin/env python3
"""Capturas de pantalla de una máquina virtual de QEMU por su socket QMP, y su lectura, sin dependencias.

Lo usa scripts/instalador/probar-en-maquina-virtual.sh:
  serie <socket> <carpeta> <t0_ms> <segundos> <cada>
        captura cada <cada> segundos durante <segundos>, en <carpeta>/<ms desde t0>.ppm
  analizar <carpeta>
        clasifica cada captura (negro, texto, color), escribe la línea de tiempo y guarda en
        <carpeta>/png/ la primera captura de cada tramo distinto
  png <entrada.ppm> <salida.png>
  captura <socket> <salida.png>
        una captura suelta, en PNG reducido a la mitad
  teclas <socket> <tecla> [<tecla>…]
        pulsa teclas en la máquina, una tras otra (nombres de QEMU: down, up, tab, ret, spc, esc…)
  combinacion <socket> <ms> <tecla> [<tecla>…]
        pulsa esas teclas juntas y las mantiene <ms> milisegundos
"""
import json
import os
import socket
import struct
import sys
import time
import zlib


def qmp(ruta, orden, argumentos=None):
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as conexion:
        conexion.settimeout(10)
        conexion.connect(ruta)
        archivo = conexion.makefile("rwb")

        def leer():
            while True:
                mensaje = json.loads(archivo.readline())
                if "event" not in mensaje:
                    return mensaje

        leer()  # saludo
        for pedido in ({"execute": "qmp_capabilities"}, {"execute": orden, "arguments": argumentos or {}}):
            archivo.write(json.dumps(pedido).encode() + b"\n")
            archivo.flush()
            respuesta = leer()
        return respuesta


def serie(ruta, carpeta, t0, segundos, cada):
    os.makedirs(carpeta, exist_ok=True)
    fin = time.time() + segundos
    while time.time() < fin:
        inicio = time.time()
        ms = int(inicio * 1000) - t0
        try:
            qmp(ruta, "screendump", {"filename": os.path.abspath(os.path.join(carpeta, f"{ms:07d}.ppm"))})
        except (OSError, ValueError):
            pass  # la máquina aún no arranca o ya se apagó
        time.sleep(max(0, cada - (time.time() - inicio)))


def leer_ppm(ruta):
    datos = open(ruta, "rb").read()
    partes = datos.split(b"\n", 3)
    ancho, alto = map(int, partes[1].split())
    return ancho, alto, partes[3]


def clasificar(ancho, alto, pixeles):
    negros = grises = color = total = 0
    firma = []
    for celda_y in range(9):
        for celda_x in range(16):
            suma = cuenta = 0
            for y in range(celda_y * alto // 9, (celda_y + 1) * alto // 9, 6):
                fila = y * ancho * 3
                for x in range(celda_x * ancho // 16, (celda_x + 1) * ancho // 16, 6):
                    r, g, b = pixeles[fila + x * 3: fila + x * 3 + 3]
                    alto_c, bajo_c = max(r, g, b), min(r, g, b)
                    total += 1
                    if alto_c < 24:
                        negros += 1
                    elif alto_c - bajo_c > 60:
                        color += 1
                    elif alto_c > 150:
                        grises += 1
                    suma += alto_c
                    cuenta += 1
            firma.append(suma / max(cuenta, 1))
    p_negro, p_gris, p_color = (100 * n / total for n in (negros, grises, color))
    if p_negro > 99.7:
        clase = "negro"
    elif p_color > 5:
        clase = "color"
    elif p_negro > 80:
        clase = "texto o logotipo sobre negro"
    else:
        clase = "otro"
    return clase, firma, (p_negro, p_gris, p_color)


def png(entrada, salida):
    ancho, alto, pixeles = leer_ppm(entrada)
    filas = []
    for y in range(0, alto, 2):
        fila = bytearray(b"\x00")
        inicio = y * ancho * 3
        for x in range(0, ancho, 2):
            fila += pixeles[inicio + x * 3: inicio + x * 3 + 3]
        filas.append(bytes(fila))

    def bloque(tipo, contenido):
        return struct.pack(">I", len(contenido)) + tipo + contenido + struct.pack(">I", zlib.crc32(tipo + contenido) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", (ancho + 1) // 2, len(filas), 8, 2, 0, 0, 0)
    with open(salida, "wb") as archivo:
        archivo.write(b"\x89PNG\r\n\x1a\n" + bloque(b"IHDR", ihdr) + bloque(b"IDAT", zlib.compress(b"".join(filas), 6)) + bloque(b"IEND", b""))


def analizar(carpeta):
    capturas = sorted(nombre for nombre in os.listdir(carpeta) if nombre.endswith(".ppm"))
    os.makedirs(os.path.join(carpeta, "png"), exist_ok=True)
    anterior = None
    tramos = []
    for nombre in capturas:
        ms = int(nombre[:-4])
        try:
            ancho, alto, pixeles = leer_ppm(os.path.join(carpeta, nombre))
        except (ValueError, IndexError):
            continue  # captura a medio escribir
        clase, firma, porcentajes = clasificar(ancho, alto, pixeles)
        cambio = anterior is None or clase != anterior[0] or max(abs(a - b) for a, b in zip(firma, anterior[1])) > 40
        if cambio:
            tramos.append([ms, ms, clase, porcentajes, f"{ancho}x{alto}"])
            if len(tramos) <= 60:
                png(os.path.join(carpeta, nombre), os.path.join(carpeta, "png", f"{ms:07d}-{clase.split()[0]}.png"))
        else:
            tramos[-1][1] = ms
        anterior = (clase, firma)
    for desde, hasta, clase, (p_negro, p_gris, p_color), tamano in tramos:
        print(f"{desde / 1000:6.1f} a {hasta / 1000:6.1f} s  {clase:30s} negro {p_negro:5.1f} %  claro {p_gris:4.1f} %  color {p_color:5.1f} %  {tamano}")


if __name__ == "__main__":
    orden = sys.argv[1]
    if orden == "serie":
        serie(sys.argv[2], sys.argv[3], int(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6]))
    elif orden == "analizar":
        analizar(sys.argv[2])
    elif orden == "png":
        png(sys.argv[2], sys.argv[3])
    elif orden == "captura":
        temporal = os.path.abspath(sys.argv[3] + ".ppm")
        qmp(sys.argv[2], "screendump", {"filename": temporal})
        png(temporal, sys.argv[3])
        os.remove(temporal)
    elif orden == "teclas":
        for tecla in sys.argv[3:]:
            qmp(sys.argv[2], "send-key", {"keys": [{"type": "qcode", "data": tecla}]})
            time.sleep(0.4)
    elif orden == "combinacion":
        espera = int(sys.argv[3])
        teclas = [{"type": "qcode", "data": tecla} for tecla in sys.argv[4:]]
        qmp(sys.argv[2], "send-key", {"keys": teclas, "hold-time": espera})
        time.sleep(espera / 1000 + 0.3)  # send-key vuelve antes de soltar
    else:
        sys.exit(__doc__)
