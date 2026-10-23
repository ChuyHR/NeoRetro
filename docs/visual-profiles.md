# Perfiles de imagen

Neo Arcade aplica a cada juego de RetroArch un perfil de imagen (escalado y shader) antes de abrirlo.
El usuario no configura nada: el perfil sale del sistema del juego. Por qué se eligieron estos valores,
en [visual-enhancement-testing.md](visual-enhancement-testing.md).

## Qué se implementó

| Archivo | Qué hace |
|---|---|
| `config/visual.json` | Los perfiles, cuál le toca a cada sistema y a cada juego, y si la mejora está activa |
| `config/emulators.json` | En RetroArch: `perfilesVisuales` y dónde están sus shaders, dentro y fuera de Flatpak |
| `core/lanzador/visual.js` | Elige el perfil, lo valida, busca el shader, escribe el `.cfg` del perfil y arma los argumentos |
| `core/lanzador/retroarch-cfg.js` | Lee y devuelve las claves que el perfil cambia en `retroarch.cfg` |
| `core/configuracion.js` | Lee `visual.json`; si falta o tiene un error, sigue sin perfiles |
| `core/main.js` | Al abrir un juego: aplica el perfil, devuelve `retroarch.cfg` al cerrar y vuelve a abrir sin perfil si RetroArch se cerró al empezar |
| `pruebas/visual.test.js` | 11 pruebas de lo anterior |

## Cómo se aplica

1. Al abrir un juego, el perfil es el del juego (`porJuego`), si no el de su sistema (`porSistema`),
   y si no el predeterminado.
2. Neo Arcade escribe las claves del perfil en `retroarch-perfil-visual.cfg`, en su carpeta de datos
   (en la MP80, `~/.config/neo-arcade/`).
3. RetroArch se abre con `--appendconfig <ese archivo>` y `--set-shader=<shader>`. El
   `retroarch.cfg` del usuario no se modifica.
4. Antes de abrir, Neo Arcade guarda el valor de las claves del perfil en `retroarch.cfg`. Al cerrar el
   juego las devuelve, porque RetroArch guarda al salir lo del perfil como si fuera suyo.
5. El registro (`~/NeoRetro/logs/neo-arcade.log`) anota en una línea `visual` qué perfil se usó o por
   qué no.

RetroArch 1.22 no carga un shader desde un `.cfg`; por eso va con `--set-shader`. Un perfil sin shader
pasa `--set-shader=` vacío, que además apaga los presets automáticos.

## Los perfiles

| Perfil | Escalado | Shader | Para qué |
|---|---|---|---|
| `original` | El de RetroArch | ninguno | Lo de antes: no agrega nada al comando |
| `nitido` | Llena la altura | sharp-bilinear-simple | El predeterminado de los sistemas probados |
| `entero` | Entero | ninguno | Píxeles exactos, imagen más chica |
| `crt-ligero` | Entero | zfast-crt | Aspecto de TV de tubo |

`nitido` va en arcade, Neo Geo, CPS, NES, SNES, Game Boy, Game Boy Color, GBA, Master System, Mega
Drive, Game Gear y PC Engine. Los demás sistemas se quedan en `original`: son 3D (Nintendo 64,
PlayStation, Dreamcast) o no se probaron.

## Formato de `visual.json`

```json
{
  "activo": true,
  "predeterminado": "original",
  "perfiles": {
    "nitido": {
      "descripcion": "…",
      "retroarch": { "video_scale_integer": "false", "video_shader_enable": "true" },
      "shader": "shaders_glsl/interpolation/sharp-bilinear-simple.glslp",
      "shaderSlang": "shaders_slang/pixel-art-scaling/sharp-bilinear-simple.slangp"
    }
  },
  "porSistema": { "neogeo": "nitido" },
  "porJuego": { "neogeo/mslug.zip": "crt-ligero" }
}
```

- **`retroarch`**: claves de `retroarch.cfg`. Solo se aceptan nombres de letras minúsculas, números y
  guión bajo, y valores sin comillas ni saltos de línea. Un perfil con algo distinto no se aplica.
- **`shader` y `shaderSlang`**: la ruta dentro de la carpeta de shaders de RetroArch. Se usa `shader`
  (GLSL) con el driver `gl`, el de la MP80, y `shaderSlang` con `vulkan`, `glcore` y `d3d`. Con un
  driver para el que el perfil no trae shader, el perfil no se aplica.
- **El id de un juego** es `<sistema>/<archivo>`, con la carpeta de `roms/` y el nombre del archivo tal
  cual (por ejemplo `neogeo/mslug.zip`).

## Cómo se configura un juego o un sistema

En la consola instalada se copia el archivo y se edita la copia:

```bash
cp /opt/neo-arcade/resources/app/config/visual.json ~/NeoRetro/config/visual.json
```

Neo Arcade usa ese archivo en lugar del suyo y lo lee al arrancar, así que después se reinicia
(`sudo systemctl restart neo-arcade.service`).

- **Un juego con otro perfil:** se agrega a `porJuego`, por ejemplo `"neogeo/mslug.zip": "crt-ligero"`.
- **Un sistema con otro perfil:** se cambia su línea en `porSistema`.
- **Un perfil nuevo:** se agrega en `perfiles` con sus claves y, si lleva, sus dos shaders. Las rutas
  de los shaders que trae RetroArch están en
  `/var/lib/flatpak/app/org.libretro.RetroArch/current/active/files/share/libretro/shaders/`. Antes de
  asignarlo conviene probarlo en el laboratorio (`visual-enhancement-lab/`).

## Cómo desactivar las mejoras

- **Todas:** `"activo": false` en `~/NeoRetro/config/visual.json`. Todos los juegos se abren con el
  comando de antes.
- **Un sistema o un juego:** se les pone `"original"`.
- **Volver a la configuración original:** basta con borrar `~/NeoRetro/config/visual.json` (si se
  creó) para regresar a los valores de la app, o poner `"activo": false` para no usar ninguno.
  `retroarch.cfg` no hay que tocarlo: Neo Arcade devuelve sus claves al cerrar cada juego.

## Qué pasa si una mejora falla

Nunca impide jugar. En cada caso el juego se abre con el comando de siempre y el motivo queda en el
registro:

| Falla | Qué pasa |
|---|---|
| `visual.json` falta | Se usa el de la app; sin ninguno, no hay perfiles |
| `visual.json` tiene un error | No hay perfiles. El error se anota al arrancar |
| El perfil no existe | Juego normal: «no existe el perfil» |
| Una clave o un valor inválido | Juego normal: «tiene un ajuste inválido» |
| El shader no está en el equipo | Juego normal: «no está el shader» |
| El perfil no trae shader para ese driver | Juego normal: «no tiene shader para el driver» |
| RetroArch se cierra en los primeros 8 s con el perfil | Se vuelve a abrir sin el perfil |
| El shader está pero no compila en esa GPU | RetroArch usa su shader de fábrica y el juego se ve como sin perfil (comprobado en el laboratorio) |
