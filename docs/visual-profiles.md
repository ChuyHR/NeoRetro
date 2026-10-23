# Perfiles de imagen

Neo Arcade aplica a cada juego de RetroArch un perfil de imagen (escalado y shader) antes de abrirlo.
No hace falta configurar cada juego. La imagen se elige una vez en **Configuración → Imagen de los
juegos**:

| Opción | Perfil |
|---|---|
| ORIGINAL | Sin cambios |
| NÍTIDA | Píxeles parejos |
| **CRT** (de fábrica) | crt-hyllian-fast |
| CRT SUAVE | crt-lottes-fast |

Por qué se eligieron estos valores, en [visual-enhancement-testing.md](visual-enhancement-testing.md).

## Qué se implementó

| Archivo | Qué hace |
|---|---|
| `config/visual.json` | Los perfiles, cuál le toca a cada sistema y a cada juego, y si la mejora está activa |
| `config/emulators.json` | En RetroArch: `perfilesVisuales` y dónde están sus shaders, dentro y fuera de Flatpak |
| `core/lanzador/visual.js` | Elige el perfil, lo valida, busca el shader, escribe el `.cfg` del perfil y arma los argumentos |
| `core/lanzador/retroarch-cfg.js` | Lee y devuelve las claves que el perfil cambia en `retroarch.cfg` |
| `core/configuracion.js` | Lee `visual.json`; si falta o tiene un error, sigue sin perfiles |
| `core/main.js` | Al abrir un juego: aplica el perfil, devuelve `retroarch.cfg` al cerrar y vuelve a abrir sin perfil si RetroArch se cerró al empezar |
| `app/ajustes.js`, `app/estado.js`, `app/piezas/configuracion.js` | La fila «Imagen de los juegos» de Configuración y su valor de fábrica |
| `app/inicio.js` | Manda la imagen elegida junto con la orden de abrir el juego |
| `core/almacenamiento/almacenamiento.js` | Guarda la imagen elegida y descarta valores que no existen |
| `pruebas/visual.test.js` | 13 pruebas de los perfiles; las de Configuración van en `estado.test.js` y `almacenamiento.test.js` |

## Cómo se aplica

1. Al abrir un juego se elige su perfil, en este orden:
   - el del juego, si tiene (`porJuego`);
   - en un sistema con perfil (`porSistema`), el que se eligió en Configuración, que llega con la
     orden de abrir el juego;
   - si no llegó ninguno, el de `porSistema`;
   - en los demás sistemas, el predeterminado.
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

| Perfil | Escalado | Shader | En Configuración |
|---|---|---|---|
| `original` | El de RetroArch | ninguno | ORIGINAL. No agrega nada al comando |
| `nitido` | Llena la altura | sharp-bilinear-simple | NÍTIDA. El ganador del laboratorio por fidelidad |
| `crt` | Llena la altura | crt-hyllian-fast | CRT. **El de fábrica**: lo pidió el usuario, que veía la imagen nítida demasiado pixeleada |
| `crt-suave` | Llena la altura | crt-lottes-fast | CRT SUAVE. El más parecido a una TV de tubo |
| `entero` | Entero | ninguno | Solo en `visual.json`. Píxeles exactos, imagen más chica |
| `crt-ligero` | Entero | zfast-crt | Solo en `visual.json` |

La imagen de Configuración se aplica en estos sistemas: arcade, Neo Geo, CPS, NES, SNES, Game Boy, Game
Boy Color, GBA, Master System, Mega Drive, Game Gear y PC Engine. Los demás se quedan en `original`:
son 3D (Nintendo 64, PlayStation, Dreamcast) o no se probaron.

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
  "porSistema": { "neogeo": "crt" },
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

- **Desde la TV:** Configuración → Imagen de los juegos → ORIGINAL. Vale para el siguiente juego que
  se abra.
- **Todas, también las de `porJuego`:** `"activo": false` en `~/NeoRetro/config/visual.json`. Todos
  los juegos se abren con el comando de antes.
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
