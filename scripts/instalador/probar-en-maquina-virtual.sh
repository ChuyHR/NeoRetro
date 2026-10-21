#!/usr/bin/env bash
# Prueba la imagen de la consola (armar-iso-consola.sh) en una máquina virtual de QEMU con KVM y UEFI,
# sin tocar el equipo donde corre. No se ve en ninguna pantalla: se sigue con capturas por QMP.
# Tres arranques, cada uno termina cuando la máquina pide reiniciarse (-no-reboot la apaga):
#   1. instalar: la instalación automática desde la imagen (descarga Debian de la red);
#   2. primer-arranque: el servicio del primer arranque instala Neo Arcade, los emuladores y los
#      núcleos (unos 2.5 GB) y reinicia;
#   3. consola: el arranque de verdad. Captura cada medio segundo durante 2 minutos, mide cuándo aparece
#      Neo Arcade y entra por SSH a revisar el sistema, ~/NeoRetro y el registro.
# La imagen debe armarse con --llave <privada>.pub para poder entrar por SSH (puerto 2222 del equipo).
#
# Uso: bash scripts/instalador/probar-en-maquina-virtual.sh <consola.iso> <carpeta> --llave <privada>
#        [--desde instalar|primer-arranque|consola] [--dejar-encendida]
# --dejar-encendida no apaga la consola al final, para seguir probando a mano (SSH en el puerto 2222,
# teclas y capturas con scripts/herramientas/maquina-virtual.py y el socket <carpeta>/qmp.sock).
# Todo queda en <carpeta>: disco.qcow2, vars.fd (la memoria UEFI), capturas/ y resultado.txt.
set -euo pipefail

if [[ $# -lt 4 ]]; then
  sed -n '12,16p' "$0" >&2
  exit 2
fi
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
IMAGEN="$(realpath "$1")" DIR="$(realpath -m "$2")"
shift 2
LLAVE="" DESDE=instalar ENCENDIDA=false
while [ $# -gt 0 ]; do
  case "$1" in
    --llave) LLAVE="$(realpath "$2")"; shift ;;
    --desde) DESDE="$2"; shift ;;
    --dejar-encendida) ENCENDIDA=true ;;
    *) echo "Opción desconocida: $1" >&2; exit 2 ;;
  esac
  shift
done
mkdir -p "$DIR/capturas"
AYUDANTE="$REPO/scripts/herramientas/maquina-virtual.py"
QMP="$DIR/qmp.sock"
informe() { echo "$*" | tee -a "$DIR/resultado.txt"; }
ms() { date +%s%3N; }

maquina() {
  # 4 núcleos y 4 GB, como una PC pequeña. Disco y red virtio; pantalla virtio sin aceleración 3D. El
  # reloj del equipo en hora local, como lo deja la instalación (clock-setup/utc false, por Windows).
  qemu-system-x86_64 -machine q35,accel=kvm -cpu host -smp 4 -m 4096 -rtc base=localtime \
    -drive if=pflash,format=raw,readonly=on,file=/usr/share/OVMF/OVMF_CODE_4M.fd \
    -drive if=pflash,format=raw,file="$DIR/vars.fd" \
    -drive file="$DIR/disco.qcow2",if=virtio,format=qcow2 \
    -netdev user,id=red,hostfwd=tcp:127.0.0.1:2222-:22 -device virtio-net-pci,netdev=red \
    -device virtio-vga -display none -no-reboot \
    -qmp unix:"$QMP",server=on,wait=off "$@"
}

# Corre un arranque hasta que la máquina se apague, con capturas cada $2 segundos, como mucho $3 min.
arranque() {
  local nombre=$1 cada=$2 minutos=$3
  shift 3
  local t0
  t0=$(ms)
  informe "== $nombre: empieza a las $(date +%T)"
  python3 "$AYUDANTE" serie "$QMP" "$DIR/capturas/$nombre" "$t0" $((minutos * 60)) "$cada" &
  local capturas=$!
  maquina "$@" >"$DIR/qemu-$nombre.log" 2>&1 &
  local qemu=$! salida=0 limite=$(( $(date +%s) + minutos * 60 ))
  while kill -0 "$qemu" 2>/dev/null && [ "$(date +%s)" -lt "$limite" ]; do sleep 5; done
  if kill -0 "$qemu" 2>/dev/null; then
    kill "$qemu"
    informe "FALLA: $nombre no terminó en $minutos minutos"
    return 1
  fi
  wait "$qemu" || salida=$?
  kill "$capturas" 2>/dev/null || true
  informe "== $nombre: terminó a las $(date +%T), en $(( ($(ms) - t0) / 1000 )) s (salida de QEMU $salida)"
}

if [ "$DESDE" = instalar ]; then
  rm -rf "$DIR/capturas" "$DIR/resultado.txt" && mkdir -p "$DIR/capturas"
  qemu-img create -q -f qcow2 "$DIR/disco.qcow2" 40G
  cp /usr/share/OVMF/OVMF_VARS_4M.fd "$DIR/vars.fd"
  informe "Imagen: $IMAGEN ($(du -h "$IMAGEN" | cut -f1)), SHA-256 $(sha256sum "$IMAGEN" | cut -c1-16)…"
  arranque instalar 60 120 -cdrom "$IMAGEN"
  DESDE=primer-arranque
fi
if [ "$DESDE" = primer-arranque ]; then
  arranque primer-arranque 30 120
  DESDE=consola
fi

# El arranque de la consola: capturas cada medio segundo y, después, revisión por SSH.
informe "== consola: empieza a las $(date +%T)"
t0=$(ms)
python3 "$AYUDANTE" serie "$QMP" "$DIR/capturas/consola" "$t0" 120 0.5 &
capturas=$!
maquina >"$DIR/qemu-consola.log" 2>&1 &
qemu=$!
wait "$capturas" || true
ssh_vm() { ssh -i "$LLAVE" -p 2222 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o ConnectTimeout=5 arcade@127.0.0.1 "$@"; }
for _ in $(seq 30); do ssh_vm true 2>/dev/null && break; sleep 2; done
informe ""
informe "== Línea de tiempo del arranque (capturas cada 0.5 s desde que se enciende la máquina)"
python3 "$AYUDANTE" analizar "$DIR/capturas/consola" | tee -a "$DIR/resultado.txt"
informe ""
informe "== Dentro de la consola"
ssh_vm 'bash -s' <<'DENTRO' 2>&1 | tee -a "$DIR/resultado.txt"
echo "systemd-analyze: $(systemd-analyze 2>&1 | head -1)"
echo "neo-arcade.service: $(systemctl is-active neo-arcade.service), desde $(systemctl show -p ActiveEnterTimestampMonotonic --value neo-arcade.service | awk '{printf "%.1f s del arranque del núcleo", $1/1000000}')"
echo "Línea del núcleo: $(cat /proc/cmdline)"
echo "GRUB: $(grep -E '^GRUB_(TIMEOUT|TIMEOUT_STYLE)=' /etc/default/grub | tr '\n' ' ')"
echo "Emuladores: $(flatpak list --app --columns=application,version 2>/dev/null | tr '\t\n' ' ,')"
echo "Núcleos: $(ls ~/.var/app/org.libretro.RetroArch/config/retroarch/cores 2>/dev/null | wc -l)"
echo "RetroArch guarda en: $(grep -E '^(savefile_directory|savestate_directory) ' ~/.var/app/org.libretro.RetroArch/config/retroarch/retroarch.cfg | tr '\n' ' ')"
echo "~/NeoRetro: $(ls ~/NeoRetro | tr '\n' ' ')"
echo "~/NeoRetro/roms: $(ls ~/NeoRetro/roms | wc -l) carpetas"
echo "~/NeoRetro/config: $(ls ~/NeoRetro/config | tr '\n' ' ')"
echo "Configuración de la sesión: $(systemctl show -p Environment --value neo-arcade.service)"
echo "Registro de Neo Arcade (~/NeoRetro/logs/neo-arcade.log):"
sed 's/^/  /' ~/NeoRetro/logs/neo-arcade.log 2>/dev/null || echo "  (no existe)"
echo "Arranque del núcleo: $(uptime -s)"
echo "Errores del arranque (journalctl -p err -b):"
journalctl -p err -b --no-pager -q | tail -15 | sed 's/^/  /'
DENTRO
if $ENCENDIDA; then
  informe "== La consola sigue encendida (QEMU $qemu): SSH en 127.0.0.1:2222, QMP en $QMP"
  exit 0
fi
ssh_vm 'sudo systemctl poweroff' 2>/dev/null || true
for _ in $(seq 30); do kill -0 "$qemu" 2>/dev/null || break; sleep 1; done
kill "$qemu" 2>/dev/null || true
informe "== Fin: $(date +%T)"
