#!/usr/bin/env python3
"""Maneja un RetroArch abierto por la red local, sin crear un mando: Neo Arcade, abierto detrás, no se
entera. Usa dos funciones de RetroArch que activa laboratorio.cfg:

- el RetroPad remoto (network_remote_enable, puerto 55400 para el jugador 1): cada paquete dice qué
  botón cambia y si queda apretado. Es la estructura remote_message de RetroArch: cuatro int y un
  uint16, 20 bytes con el relleno;
- los comandos de red (network_cmd_enable, puerto 55355): SAVE_STATE, SCREENSHOT, QUIT y otros.

Órdenes, una por argumento o por línea en la entrada estándar:
  pulsar <botón> [ms]   lo aprieta y lo suelta (150 ms por omisión)
  esperar <ms>
  comando <ORDEN>       manda una orden de RetroArch, como SAVE_STATE
Botones: b y select start arriba abajo izquierda derecha a x l r l2 r2 l3 r3.

Uso: python3 control-remoto.py "esperar 4000" "pulsar start" "comando SAVE_STATE"
"""
import socket
import struct
import sys
import time

BOTONES = {"b": 0, "y": 1, "select": 2, "start": 3, "arriba": 4, "abajo": 5, "izquierda": 6, "derecha": 7,
           "a": 8, "x": 9, "l": 10, "r": 11, "l2": 12, "r2": 13, "l3": 14, "r3": 15}
RETRO_DEVICE_JOYPAD = 1
PUERTO_MANDO, PUERTO_COMANDOS = 55400, 55355

conexion = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)


def boton(nombre, apretado):
    paquete = struct.pack("<iiiiHxx", 0, RETRO_DEVICE_JOYPAD, 0, BOTONES[nombre], 1 if apretado else 0)
    # Varias veces: es UDP y RetroArch solo lee los paquetes una vez por cuadro.
    for _ in range(3):
        conexion.sendto(paquete, ("127.0.0.1", PUERTO_MANDO))
        time.sleep(0.01)


def orden(linea):
    partes = linea.split()
    if not partes:
        return
    if partes[0] == "pulsar":
        boton(partes[1], True)
        time.sleep((int(partes[2]) if len(partes) > 2 else 150) / 1000)
        boton(partes[1], False)
    elif partes[0] == "esperar":
        time.sleep(int(partes[1]) / 1000)
    elif partes[0] == "comando":
        conexion.sendto(partes[1].encode(), ("127.0.0.1", PUERTO_COMANDOS))
    else:
        sys.exit(f"Orden desconocida: {linea}")
    print(linea, flush=True)


for linea in sys.argv[1:] or sys.stdin:
    orden(linea.strip())
