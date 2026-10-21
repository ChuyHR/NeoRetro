#!/usr/bin/env python3
"""Lee los mandos conectados (dispositivos de entrada de Linux) y escribe cada suceso en la salida
estándar, una línea JSON por suceso. Lo arranca core/entrada/mandos.js y solo usa la biblioteca
estándar de Python.

Va en un proceso aparte porque Node no puede consultar el rango de cada eje (ioctl EVIOCGABS) ni
esperar a varios dispositivos sin ocupar un hilo de su reserva por cada uno.

Sucesos que escribe:
  {"tipo": "conectado", "id": "event5", "nombre": "...", "nombreExacto": "... ", "fisico": "usb-…/input0",
   "vendor": "045e", "producto": "028e",
   "botones": [304, ...], "ejes": {"0": [mínimo, máximo, zona muerta, valor al conectarse], ...}}
  {"tipo": "desconectado", "id": "event5"}
  {"tipo": "sin-permiso", "id": "event5", "nombre": "..."}
  {"tipo": "boton", "id": "event5", "codigo": 304, "valor": 1}
  {"tipo": "eje", "id": "event5", "codigo": 16, "valor": -1}
"""
import errno
import fcntl
import json
import os
import select
import struct
import sys
import time

CARPETA = "/dev/input"
EV_KEY, EV_ABS = 1, 3
EVENTO = struct.Struct("llHHi")  # struct input_event en 64 bits: segundos, microsegundos, tipo, código, valor
INFO_EJE = struct.Struct("6i")  # struct input_absinfo: valor, mínimo, máximo, ruido, zona muerta, resolución
BOTONES_DE_MANDO = range(0x120, 0x13F)  # BTN_JOYSTICK (palancas y tableros) y BTN_GAMEPAD (mandos)


def eviocgabs(eje):
    """_IOR('E', 0x40 + eje, struct input_absinfo)."""
    return (2 << 30) | (INFO_EJE.size << 16) | (ord("E") << 8) | (0x40 + eje)


def leer(ruta, omision="", exacto=False):
    try:
        with open(ruta, encoding="utf-8", errors="replace") as archivo:
            texto = archivo.read()
    except OSError:
        return omision
    # RetroArch compara el nombre tal cual lo da el núcleo, con espacios al final si los trae (los
    # tableros Zero Delay traen dos): para su perfil hace falta así, sin recortar.
    return texto.removesuffix("\n") if exacto else texto.strip()


def bits(ruta):
    """Máscara de bits de sysfs: palabras de 64 bits en hexadecimal, la más significativa primero."""
    codigos = set()
    for indice, palabra in enumerate(reversed(leer(ruta).split())):
        valor = int(palabra, 16)
        codigos.update(indice * 64 + bit for bit in range(64) if valor >> bit & 1)
    return codigos


def escribir(suceso):
    sys.stdout.write(json.dumps(suceso, ensure_ascii=False) + "\n")
    sys.stdout.flush()


abiertos = {}  # "event5" → descriptor
descartados = set()  # nodos que no son mandos o no se pudieron abrir, para no revisarlos cada segundo


def revisar():
    try:
        presentes = {nombre for nombre in os.listdir(CARPETA) if nombre.startswith("event")}
    except FileNotFoundError:  # en WSL no hay dispositivos de entrada
        presentes = set()
    descartados.intersection_update(presentes)  # un número que se libera puede volver con otro aparato
    for nombre in sorted(presentes - abiertos.keys() - descartados):
        base = f"/sys/class/input/{nombre}/device"
        botones = bits(f"{base}/capabilities/key")
        if not any(codigo in BOTONES_DE_MANDO for codigo in botones):
            descartados.add(nombre)
            continue
        try:
            descriptor = os.open(f"{CARPETA}/{nombre}", os.O_RDONLY | os.O_NONBLOCK)
        except OSError:
            descartados.add(nombre)
            escribir({"tipo": "sin-permiso", "id": nombre, "nombre": leer(f"{base}/name")})
            continue
        ejes = {}
        for eje in sorted(bits(f"{base}/capabilities/abs")):
            if eje > 0x3F:
                continue
            datos = bytearray(INFO_EJE.size)
            try:
                fcntl.ioctl(descriptor, eviocgabs(eje), datos)
            except OSError:
                continue
            # El valor al conectarse sirve de reposo: un gatillo descansa en su mínimo y una palanca en
            # el centro, y así lo distingue «Configurar control».
            valor, minimo, maximo, _, zona, _ = INFO_EJE.unpack(datos)
            ejes[str(eje)] = [minimo, maximo, zona, valor]
        abiertos[nombre] = descriptor
        escribir({
            "tipo": "conectado", "id": nombre, "nombre": leer(f"{base}/name", nombre),
            "nombreExacto": leer(f"{base}/name", nombre, exacto=True), "fisico": leer(f"{base}/phys"),
            "vendor": leer(f"{base}/id/vendor"), "producto": leer(f"{base}/id/product"),
            "botones": sorted(botones), "ejes": ejes,
        })


def desconectar(nombre):
    os.close(abiertos.pop(nombre))
    escribir({"tipo": "desconectado", "id": nombre})


def principal():
    ultima_revision = 0.0
    while True:
        # Sin proceso padre (Neo Arcade se cerró) no hay a quién avisar.
        if os.getppid() == 1:
            return
        if time.monotonic() - ultima_revision >= 1:
            revisar()
            ultima_revision = time.monotonic()
        if not abiertos:
            time.sleep(0.5)
            continue
        listos, _, _ = select.select(list(abiertos.values()), [], [], 0.5)
        for nombre, descriptor in list(abiertos.items()):
            if descriptor not in listos:
                continue
            try:
                datos = os.read(descriptor, EVENTO.size * 64)
            except BlockingIOError:
                continue
            except OSError as error:
                if error.errno in (errno.ENODEV, errno.EIO):
                    desconectar(nombre)
                continue
            for desplazamiento in range(0, len(datos) - EVENTO.size + 1, EVENTO.size):
                _, _, tipo, codigo, valor = EVENTO.unpack_from(datos, desplazamiento)
                if tipo == EV_KEY and valor in (0, 1):  # 2 es la repetición del propio núcleo
                    escribir({"tipo": "boton", "id": nombre, "codigo": codigo, "valor": valor})
                elif tipo == EV_ABS:
                    escribir({"tipo": "eje", "id": nombre, "codigo": codigo, "valor": valor})


if __name__ == "__main__":
    try:
        principal()
    except (BrokenPipeError, KeyboardInterrupt):
        pass
