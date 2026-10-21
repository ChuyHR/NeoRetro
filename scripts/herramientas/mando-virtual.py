#!/usr/bin/env python3
"""Mando virtual para probar Neo Arcade sin un mando físico, en la pantalla real.

Crea un dispositivo de entrada con uinput (necesita root) que para Neo Arcade, RetroArch y cualquier
programa es un mando conectado por USB. Obedece órdenes por la entrada estándar, una por línea:
  bajar <control>          lo deja pulsado
  subir <control>          lo suelta
  pulsar <control> [ms]    lo pulsa y lo suelta (por omisión, 150 ms)
  esperar <ms>
Al cerrarse la entrada, el mando se desconecta.

Perfiles:
  xbox     «Microsoft X-Box 360 pad» (045e:028e), como lo presenta el controlador xpad: sigue la norma
           de Linux para mandos. Controles: a b x y lb rb lt rt view menu guia arriba abajo izquierda derecha.
  palanca  «DragonRise Inc. Generic USB Joystick» (0079:0006), la placa de muchas palancas de arcade:
           no sigue la norma. Controles: boton1 … boton12 y las cuatro direcciones.

Uso: sudo python3 scripts/herramientas/mando-virtual.py xbox|palanca
"""
import fcntl
import os
import struct
import sys
import time

EV_SYN, EV_KEY, EV_ABS = 0, 1, 3
UI_SET_EVBIT, UI_SET_KEYBIT, UI_SET_ABSBIT = 0x40045564, 0x40045565, 0x40045567
UI_DEV_CREATE, UI_DEV_DESTROY = 0x5501, 0x5502
BUS_USB = 0x03
ABS_X, ABS_Y, ABS_Z, ABS_RX, ABS_RY, ABS_RZ, ABS_HAT0X, ABS_HAT0Y = 0, 1, 2, 3, 4, 5, 16, 17

# Cada control: ("boton", código) o ("eje", código, valor al pulsar, valor al soltar).
PERFILES = {
    "xbox": {
        "nombre": "Microsoft X-Box 360 pad", "vendor": 0x045E, "producto": 0x028E,
        "botones": [304, 305, 307, 308, 310, 311, 314, 315, 316, 317, 318],
        "ejes": {ABS_X: (-32768, 32767), ABS_Y: (-32768, 32767), ABS_Z: (0, 255), ABS_RX: (-32768, 32767),
                 ABS_RY: (-32768, 32767), ABS_RZ: (0, 255), ABS_HAT0X: (-1, 1), ABS_HAT0Y: (-1, 1)},
        "controles": {
            "a": ("boton", 304), "b": ("boton", 305), "x": ("boton", 307), "y": ("boton", 308),
            "lb": ("boton", 310), "rb": ("boton", 311), "view": ("boton", 314), "menu": ("boton", 315),
            "guia": ("boton", 316), "lt": ("eje", ABS_Z, 255, 0), "rt": ("eje", ABS_RZ, 255, 0),
            "arriba": ("eje", ABS_HAT0Y, -1, 0), "abajo": ("eje", ABS_HAT0Y, 1, 0),
            "izquierda": ("eje", ABS_HAT0X, -1, 0), "derecha": ("eje", ABS_HAT0X, 1, 0),
        },
    },
    "palanca": {
        "nombre": "DragonRise Inc. Generic USB Joystick", "vendor": 0x0079, "producto": 0x0006,
        "botones": list(range(0x120, 0x12C)),  # BTN_TRIGGER … BTN_BASE6: doce botones
        "ejes": {ABS_X: (0, 255), ABS_Y: (0, 255)},
        "controles": {
            **{f"boton{numero}": ("boton", 0x120 + numero - 1) for numero in range(1, 13)},
            "arriba": ("eje", ABS_Y, 0, 127), "abajo": ("eje", ABS_Y, 255, 127),
            "izquierda": ("eje", ABS_X, 0, 127), "derecha": ("eje", ABS_X, 255, 127),
        },
    },
}


def crear(perfil):
    descriptor = os.open("/dev/uinput", os.O_WRONLY | os.O_NONBLOCK)
    fcntl.ioctl(descriptor, UI_SET_EVBIT, EV_KEY)
    fcntl.ioctl(descriptor, UI_SET_EVBIT, EV_ABS)
    for codigo in perfil["botones"]:
        fcntl.ioctl(descriptor, UI_SET_KEYBIT, codigo)
    maximos, minimos = [0] * 64, [0] * 64
    for eje, (minimo, maximo) in perfil["ejes"].items():
        fcntl.ioctl(descriptor, UI_SET_ABSBIT, eje)
        minimos[eje], maximos[eje] = minimo, maximo
    # struct uinput_user_dev: nombre, input_id, ff_effects_max y los cuatro arreglos de ejes.
    dispositivo = struct.pack("80sHHHHi64i64i64i64i", perfil["nombre"].encode(), BUS_USB, perfil["vendor"],
                              perfil["producto"], 0x0110, 0, *maximos, *minimos, *([0] * 64), *([0] * 64))
    os.write(descriptor, dispositivo)
    fcntl.ioctl(descriptor, UI_DEV_CREATE)
    # Las palancas de verdad reposan en el centro: se deja así para que no arranquen movidas.
    for eje, (minimo, maximo) in perfil["ejes"].items():
        if eje not in (ABS_Z, ABS_RZ):
            emitir(descriptor, EV_ABS, eje, (minimo + maximo) // 2 if minimo < 0 or maximo > 1 else 0)
    return descriptor


def emitir(descriptor, tipo, codigo, valor):
    os.write(descriptor, struct.pack("llHHi", 0, 0, tipo, codigo, valor))
    os.write(descriptor, struct.pack("llHHi", 0, 0, EV_SYN, 0, 0))


def cambiar(descriptor, perfil, control, pulsado):
    definicion = perfil["controles"][control]
    if definicion[0] == "boton":
        emitir(descriptor, EV_KEY, definicion[1], 1 if pulsado else 0)
    else:
        _, eje, al_pulsar, al_soltar = definicion
        emitir(descriptor, EV_ABS, eje, al_pulsar if pulsado else al_soltar)


def principal():
    perfil = PERFILES[sys.argv[1]]
    descriptor = crear(perfil)
    print(f"mando virtual listo: {perfil['nombre']}", flush=True)
    try:
        for linea in sys.stdin:
            partes = linea.split()
            if not partes:
                continue
            orden, *argumentos = partes
            if orden == "esperar":
                time.sleep(int(argumentos[0]) / 1000)
            elif orden == "bajar":
                cambiar(descriptor, perfil, argumentos[0], True)
            elif orden == "subir":
                cambiar(descriptor, perfil, argumentos[0], False)
            elif orden == "pulsar":
                cambiar(descriptor, perfil, argumentos[0], True)
                time.sleep(int(argumentos[1]) / 1000 if len(argumentos) > 1 else 0.15)
                cambiar(descriptor, perfil, argumentos[0], False)
            print(f"hecho: {linea.strip()}", flush=True)
    finally:
        fcntl.ioctl(descriptor, UI_DEV_DESTROY)
        os.close(descriptor)


if __name__ == "__main__":
    principal()
