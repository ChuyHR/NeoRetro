#!/usr/bin/env python3
"""Prueba de la fase 0: el prototipo dibujado con WebKitGTK, el motor de Tauri en Linux.

Uso: python3 prueba.py <url> <carpeta de resultados>
"""

import sys
import time

import gi

gi.require_version("Gtk", "3.0")
gi.require_version("WebKit2", "4.1")
from gi.repository import GLib, Gtk, WebKit2  # noqa: E402

URL, SALIDA = sys.argv[1], sys.argv[2]
T0 = time.monotonic()

JS_CODECS = """(() => { const v = document.createElement('video'); return JSON.stringify({
  h264: v.canPlayType('video/mp4; codecs="avc1.42E01E"'),
  vp9: v.canPlayType('video/webm; codecs="vp9"'),
  av1: v.canPlayType('video/mp4; codecs="av01.0.05M.08"') }); })()"""

# Misma medición que la prueba de Electron: avanzar el carrusel cada 120 ms durante 3 s.
JS_FLUIDEZ = """return new Promise((listo) => {
  const boton = document.querySelector('[aria-label="Juego siguiente"]');
  let cuadros = 0, peor = 0;
  const inicio = performance.now();
  let previo = inicio;
  const avance = setInterval(() => boton && boton.click(), 120);
  function cuadro(t) {
    cuadros++; peor = Math.max(peor, t - previo); previo = t;
    if (t - inicio < 3000) requestAnimationFrame(cuadro);
    else {
      clearInterval(avance);
      listo(JSON.stringify({ botonEncontrado: !!boton,
        fps: +(cuadros * 1000 / (t - inicio)).toFixed(1), peorCuadroMs: +peor.toFixed(1) }));
    }
  }
  requestAnimationFrame(cuadro);
});"""


def log(*partes):
    linea = f"[{time.monotonic() - T0:.2f}s] " + " ".join(str(p) for p in partes)
    print(linea, flush=True)
    with open(f"{SALIDA}/resultado-webkitgtk.txt", "a", encoding="utf-8") as archivo:
        archivo.write(linea + "\n")


ventana = Gtk.Window()
ventana.set_decorated(False)
ventana.set_default_size(1920, 1080)
vista = WebKit2.WebView()
ventana.add(vista)
ventana.connect("destroy", Gtk.main_quit)
ventana.show_all()
version = f"{WebKit2.get_major_version()}.{WebKit2.get_minor_version()}.{WebKit2.get_micro_version()}"
log("WebKitGTK", version, "| aceleración:", vista.get_settings().get_hardware_acceleration_policy().value_nick)


def al_fluidez(v, resultado):
    try:
        log("carrusel", v.call_async_javascript_function_finish(resultado).to_string())
    except GLib.Error as error:
        log("carrusel: error", error.message)
    Gtk.main_quit()


def al_codecs(v, resultado):
    try:
        log("códecs", v.evaluate_javascript_finish(resultado).to_string())
    except GLib.Error as error:
        log("códecs: error", error.message)
    v.call_async_javascript_function(JS_FLUIDEZ, -1, None, None, None, None, al_fluidez)


def al_captura(v, resultado):
    superficie = v.get_snapshot_finish(resultado)
    superficie.write_to_png(f"{SALIDA}/captura-webkitgtk.png")
    log("captura", f"{superficie.get_width()}x{superficie.get_height()}")
    v.evaluate_javascript(JS_CODECS, -1, None, None, None, al_codecs)


def capturar():
    ancho, alto = ventana.get_size()
    log("área de la ventana", f"{ancho}x{alto}")
    vista.get_snapshot(WebKit2.SnapshotRegion.VISIBLE, WebKit2.SnapshotOptions.NONE, None, al_captura)
    return False


def al_cargar(v, evento):
    if evento == WebKit2.LoadEvent.FINISHED:
        log("página cargada")
        GLib.timeout_add(4000, capturar)


vista.connect("load-changed", al_cargar)
vista.load_uri(URL)
GLib.timeout_add_seconds(80, Gtk.main_quit)
Gtk.main()
