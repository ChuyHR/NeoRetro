# Laboratorio de mejora visual

Prueba perfiles de imagen de RetroArch (escalado, shaders, aspecto) en la MP80 real, **sin tocar** la
configuración de Neo Arcade. Lo que se encontró está en `docs/visual-enhancement-testing.md` y
`docs/visual-comparison.md`.

## Cómo se aísla

- RetroArch se abre con `--config trabajo/base.cfg`: una copia del `retroarch.cfg` de Neo Arcade con
  los ajustes de `laboratorio.cfg` en lugar de los suyos. El original solo se lee.
- `laboratorio.cfg` manda partidas, estados y capturas a `trabajo/`, apaga el guardado de la
  configuración al cerrar, apaga los avisos en pantalla y los shaders o ajustes guardados por núcleo.
- Los botones y las órdenes llegan por la red local (`control-remoto.py`): no se crea un mando, y Neo
  Arcade, abierto detrás, no se entera.
- `preparar.sh` guarda la huella del `retroarch.cfg` de Neo Arcade, y `medir.sh` comprueba al final
  que no cambió.

## Archivos

| Archivo | Qué hace |
|---|---|
| `perfiles/*.cfg` | Un perfil por archivo, como lo recibe RetroArch con `--appendconfig` |
| `laboratorio.cfg` | Los ajustes propios del laboratorio |
| `sin-limite.cfg` | Sin vsync ni sincronía de audio: para medir el máximo de cuadros por segundo |
| `juegos.txt` | Los juegos de prueba, el cuadro que se captura y su estado inicial |
| `preparar.sh` | Crea `trabajo/` y la copia de la configuración |
| `crear-estado.sh` | Deja el estado de Nova the Squirrel dentro del primer nivel |
| `medir.sh` | Corre cada juego con cada perfil y guarda capturas, tiempos de cuadro, GPU, CPU y memoria |
| `resumir.mjs` | Convierte una medición en `resultados.json` y `tabla.md` |
| `probar-fallas.sh` | Qué hace RetroArch con un shader que no existe o no compila, un perfil que falta, una clave rara, y si guarda el perfil al cerrar |
| `probar-sistemas.sh` | Un perfil con un juego de cada sistema de la biblioteca: que abra y que el shader cargue |
| `comparar.py` | Hojas con la misma zona del juego en cada perfil |
| `control-remoto.py` | RetroPad y comandos de RetroArch por la red local |

## Cómo se corre

En la MP80, con la TV encendida (las pruebas se ven en ella) y `intel-gpu-tools` instalado:

```bash
mkdir -p ~/visual-enhancement-lab/juegos      # aquí va nova.nes; los juegos no van en el repositorio
cp -r <este directorio> ~/visual-enhancement-lab/codigo
cd ~/visual-enhancement-lab/codigo
bash preparar.sh
bash crear-estado.sh
bash medir.sh                 # o solo algunos perfiles: bash medir.sh B-entero C-entero-zfast-crt
JUEGOS=mslug bash medir.sh    # solo un juego
node resumir.mjs ../resultados/ultimo
bash probar-fallas.sh
bash probar-sistemas.sh F-pantalla-sharp-bilinear
```

Cada medición queda en `~/visual-enhancement-lab/resultados/<fecha>/`. Para borrar todo el
laboratorio basta con borrar `~/visual-enhancement-lab/`: no deja nada fuera de esa carpeta.

## Qué se mide y cómo

- **Tiempo de cada cuadro:** el HUD de Mesa (`GALLIUM_HUD_DUMP_DIR`), sin dibujarlo en la pantalla.
  Se descartan los primeros 120 cuadros, que son la carga.
- **Tiempo real** (vsync y audio, como juega el usuario): 1 800 cuadros. **Sin límite:** 3 000.
- **GPU:** `intel_gpu_top -J` cada 500 ms: ocupación de Render/3D, frecuencia y vatios de la GPU y del
  procesador entero.
- **CPU y memoria:** `/proc/<pid>` de RetroArch, del segundo 5 al 25 del tiempo real.
- **Capturas:** el mismo cuadro con cada perfil (`--max-frames-ss`), después del shader.
- **Latencia de entrada:** no se mide. Hace falta una cámara rápida o un sensor frente a la TV.
