#!/usr/bin/env bash
# Pruebas de uso sobre la consola de la máquina virtual que dejó encendida
# probar-en-maquina-virtual.sh --dejar-encendida, con el teclado virtual de QEMU:
#   1. copia el programa de prueba de SNES a ~/NeoRetro/roms/snes y reinicia Neo Arcade;
#   2. lo abre con Enter, espera a RetroArch y sale con Esc;
#   3. abre la terminal de mantenimiento (Ctrl + Alt + Mayús + M sostenido) y la cierra;
#   4. corre el diagnóstico dentro de la consola, con el Electron de la app como Node;
#   5. apaga desde Configuración (fila Equipo, dos pulsaciones) y mide cuánto tarda en apagarse.
# Con --actualizar-app copia antes app/, core/ y config/ de este repositorio a /opt/neo-arcade, para
# probar un cambio sin volver a armar la imagen.
# Uso: bash scripts/instalador/probar-consola-encendida.sh <carpeta de la máquina> --llave <privada>
#        [--actualizar-app]
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
DIR="$(realpath "$1")"
shift
LLAVE="" ACTUALIZAR=false
while [ $# -gt 0 ]; do
  case "$1" in
    --llave) LLAVE="$(realpath "$2")"; shift ;;
    --actualizar-app) ACTUALIZAR=true ;;
    *) echo "Opción desconocida: $1" >&2; exit 2 ;;
  esac
  shift
done
QMP="$DIR/qmp.sock"
SALIDA="$DIR/uso"
AYUDANTE="$REPO/scripts/herramientas/maquina-virtual.py"
rm -rf "$SALIDA" && mkdir -p "$SALIDA"
informe() { echo "$*" | tee -a "$SALIDA/resultado.txt"; }
ssh_vm() { ssh -i "$LLAVE" -p 2222 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o ConnectTimeout=5 arcade@127.0.0.1 "$@"; }
captura() { python3 "$AYUDANTE" captura "$QMP" "$SALIDA/$1.png"; }
teclas() { python3 "$AYUDANTE" teclas "$QMP" "$@"; }
ms() { date +%s%3N; }
esperar() { local limite=$(($(ms) + $1 * 1000)); shift; until "$@"; do [ "$(ms)" -gt "$limite" ] && return 1; sleep 0.2; done; }
ra_abierto() { ssh_vm 'pgrep -x retroarch' >/dev/null 2>&1; }
ra_cerrado() { ! ra_abierto; }

if $ACTUALIZAR; then
  tar -C "$REPO" -cf - app core config package.json | ssh_vm 'sudo tar -C /opt/neo-arcade/resources/app -xf -'
  informe "App actualizada desde el repositorio ($(git -C "$REPO" log --oneline -1))"
fi

informe "== 1. Un juego en la biblioteca"
node "$REPO/scripts/juego-de-prueba-snes.mjs" "$SALIDA/juego" >/dev/null
ssh_vm 'mkdir -p ~/NeoRetro/roms/snes'
scp -q -i "$LLAVE" -P 2222 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR \
  "$SALIDA/juego/"*.sfc arcade@127.0.0.1:NeoRetro/roms/snes/
ssh_vm 'sudo systemctl restart neo-arcade.service'
sleep 15
captura 1-biblioteca-con-un-juego
informe "Registro: $(ssh_vm 'grep biblioteca ~/NeoRetro/logs/neo-arcade.log | tail -1' | cut -f2-)"

informe "== 2. Abrir el juego y volver"
t0=$(ms)
teclas ret
if esperar 30 ra_abierto; then
  informe "RetroArch abrió $(( $(ms) - t0 )) ms después de Enter"
  sleep 8
  captura 2-juego-en-retroarch
  t1=$(ms)
  python3 "$AYUDANTE" combinacion "$QMP" 300 esc
  esperar 15 ra_cerrado && informe "Esc: RetroArch cerró en $(( $(ms) - t1 )) ms" || informe "FALLA: RetroArch no cerró con Esc"
  sleep 3
  captura 3-de-vuelta
else
  informe "FALLA: RetroArch no abrió"
  captura 2-sin-retroarch
fi
informe "Registro: $(ssh_vm 'grep lanzamiento ~/NeoRetro/logs/neo-arcade.log | tail -1' | cut -f2- | sed 's#/home/arcade#~#g')"

informe "== 3. Terminal de mantenimiento"
terminal_abierta() { ssh_vm 'pgrep -x foot' >/dev/null 2>&1; }
terminal_cerrada() { ! terminal_abierta; }
t0=$(ms)
python3 "$AYUDANTE" combinacion "$QMP" 3800 ctrl alt shift m
# La primera vez tarda: arma la caché de tipografías.
if esperar 20 terminal_abierta; then
  sleep 2
  informe "OK: la terminal se abrió $(( $(ms) - t0 )) ms después de empezar a mantener la combinación"
  captura 4-terminal
  teclas e x i t ret
  esperar 10 terminal_cerrada && informe "OK: la terminal se cerró con exit" || informe "FALLA: la terminal no se cerró"
  sleep 1.5
  captura 5-tras-cerrar-la-terminal
else
  informe "FALLA: la terminal no se abrió"
  captura 4-sin-terminal
fi

informe "== 4. Diagnóstico dentro de la consola"
ssh_vm 'NEO_ARCADE_CONFIG=~/NeoRetro/config ELECTRON_RUN_AS_NODE=1 /opt/neo-arcade/neo-arcade /opt/neo-arcade-instalador/scripts/diagnostico.mjs --juegos' 2>&1 \
  | sed 's/^/  /' | tee -a "$SALIDA/resultado.txt"
informe "polkit: $(ssh_vm 'systemctl is-active polkit')"

informe "== 5. Apagar desde Configuración"
# Acciones: Jugar, Favoritos, Detalles, Configuración. En Configuración, la fila Equipo es la octava.
teclas down down down ret
sleep 1.5
teclas down down down down down down down
sleep 0.5
teclas ret
sleep 0.8
captura 6-confirmar-apagar
t0=$(ms)
teclas ret
qemu=$(pgrep -f "qmp unix:$QMP" | head -1 || true)
if [ -n "$qemu" ] && esperar 60 bash -c "! kill -0 $qemu 2>/dev/null"; then
  informe "OK: la máquina se apagó $(( ($(ms) - t0) / 1000 )) s después de confirmar"
else
  informe "FALLA: la máquina no se apagó en 60 s"
  captura 7-no-se-apago
fi
