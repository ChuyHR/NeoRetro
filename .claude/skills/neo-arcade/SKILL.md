---
name: neo-arcade
description: Desarrolla y mantiene Neo Arcade, un frontend retro para una PC Debian conectada a TV. Gestiona ROMs, juegos, emuladores, BIOS, metadatos, carátulas, videos, partidas, favoritos, recientes y fuentes legales de contenido. Diseñado inicialmente para una Blackview MP80 con RetroArch/FBNeo, Dolphin y PPSSPP.
---

# Neo Arcade

## 1. PROPÓSITO

Neo Arcade convierte una PC conectada a una TV en una consola retro.

El sistema debe:

- Arrancar mostrando la biblioteca de juegos.
- Navegar mediante gamepad o teclado.
- Mostrar carátulas.
- Mostrar información del juego.
- Lanzar automáticamente el emulador correspondiente.
- Ejecutar juegos a pantalla completa.
- Detectar cuando el emulador termina.
- Regresar automáticamente a Neo Arcade.
- Mantener favoritos.
- Mantener juegos recientes.
- Mantener configuración.
- Administrar ROMs.
- Administrar BIOS.
- Administrar partidas.
- Obtener metadatos.
- Obtener artwork.
- Obtener videos.
- Permitir importar juegos.
- Permitir descargar contenido legalmente distribuible.
- Mantener una arquitectura extensible.

Neo Arcade NO debe contener juegos comerciales protegidos por copyright.

El sistema debe permitir al usuario importar sus propias copias.

---

# 2. HARDWARE OBJETIVO

Plataforma inicial:

```text
Blackview MP80
Debian Linux
TV
Gamepad USB/Bluetooth
Teclado
```

La arquitectura debe permanecer independiente del hardware.

No asumir que el hardware siempre será una MP80.

---

# 3. EMULADORES

Emuladores principales:

```text
RetroArch
Dolphin
PPSSPP
```

RetroArch será utilizado principalmente para:

```text
Arcade
CPS
Neo Geo
NES
SNES
Game Boy
Game Boy Color
Game Boy Advance
Nintendo 64
Mega Drive
Master System
Game Gear
Sega 32X
Sega CD
PC Engine
Atari 2600
```

Dolphin:

```text
GameCube
```

PPSSPP:

```text
PSP
```

La arquitectura debe permitir añadir posteriormente otros emuladores.

---

# 4. ESTRUCTURA DE DIRECTORIOS

La biblioteca principal es:

```text
~/NeoRetro/
```

Estructura:

```text
~/NeoRetro/
├── roms/
├── media/
├── saves/
├── states/
├── metadata/
├── logs/
├── backups/
└── config/
```

ROMs:

```text
~/NeoRetro/roms/
```

Media:

```text
~/NeoRetro/media/
```

---

# 5. DIRECTORIOS DE ROMS

Utilizar exactamente estas carpetas:

```text
~/NeoRetro/roms/arcade/
~/NeoRetro/roms/cps/
~/NeoRetro/roms/neogeo/

~/NeoRetro/roms/nes/
~/NeoRetro/roms/snes/
~/NeoRetro/roms/n64/

~/NeoRetro/roms/gb/
~/NeoRetro/roms/gbc/
~/NeoRetro/roms/gba/

~/NeoRetro/roms/megadrive/
~/NeoRetro/roms/mastersystem/
~/NeoRetro/roms/gamegear/
~/NeoRetro/roms/sega32x/
~/NeoRetro/roms/segacd/

~/NeoRetro/roms/psx/
~/NeoRetro/roms/dreamcast/

~/NeoRetro/roms/gamecube/
~/NeoRetro/roms/psp/

~/NeoRetro/roms/pcengine/
~/NeoRetro/roms/atari2600/

~/NeoRetro/roms/ports/
```

El sistema debe crear automáticamente las carpetas que no existan.

---

# 6. FORMATOS SOPORTADOS

## Arcade / CPS / Neo Geo

```text
.zip
```

Utilizar núcleo FBNeo.

IMPORTANTE:

Los ZIP de arcade no deben renombrarse ni modificarse arbitrariamente.

Neo Geo requiere:

```text
neogeo.zip
```

en la ubicación correspondiente al sistema configurado para FBNeo.

---

## NES

```text
.nes
.zip
```

## SNES

```text
.sfc
.smc
.zip
```

## Nintendo 64

```text
.z64
.n64
.v64
```

## Game Boy

```text
.gb
```

## Game Boy Color

```text
.gbc
```

## Game Boy Advance

```text
.gba
```

## Mega Drive / Genesis

```text
.md
.gen
.bin
```

## Master System

```text
.sms
```

## Game Gear

```text
.gg
```

## Sega 32X

```text
.32x
```

## Sega CD

```text
.cue
.bin
.chd
```

Requiere BIOS.

## PlayStation

```text
.cue
.bin
.chd
.pbp
```

## Dreamcast

```text
.gdi
.cdi
.chd
```

## GameCube

```text
.iso
.rvz
.gcz
```

## PSP

```text
.iso
.cso
```

## PC Engine

```text
.pce
```

## Atari 2600

```text
.a26
.bin
```

## Ports

```text
.sh
```

Los ports son programas que pueden ejecutarse directamente y no necesariamente requieren emulador.

---

# 7. SUBCARPETAS

Las ROMs pueden utilizar subcarpetas.

Ejemplo:

```text
~/NeoRetro/roms/psx/
├── Game 1/
│   ├── game.cue
│   └── game.bin
│
└── Game 2/
    └── game.chd
```

Esto es especialmente importante para juegos multidisco.

Nunca asumir que cada archivo representa un juego independiente.

---

# 8. MULTIDISCO

El sistema debe detectar:

```text
Disc 1
Disc 2
Disc 3
```

Ejemplo:

```text
Game/
├── Game (Disc 1).cue
├── Game (Disc 1).bin
├── Game (Disc 2).cue
└── Game (Disc 2).bin
```

La biblioteca debe mostrar:

```text
Game
3 Discs
```

en lugar de crear tres juegos independientes.

---

# 9. BIOS

Las BIOS no son ROMs de juegos.

RetroArch utiliza:

```text
~/.var/app/org.libretro.RetroArch/config/retroarch/system/
```

cuando RetroArch está instalado mediante Flatpak.

La Skill debe detectar automáticamente la ubicación real configurada por RetroArch antes de asumir una ruta.

BIOS conocidas:

```text
bios_CD_U.bin
scph5501.bin
scph5500.bin
scph5502.bin
```

El sistema debe:

- Detectar BIOS.
- Comprobar existencia.
- Calcular hash.
- Informar cuál falta.
- Mostrar dónde debe colocarse.
- No descargar automáticamente BIOS protegidas.

Ejemplo:

```text
BIOS requerida:

scph5501.bin

Estado:
MISSING

Ruta:
~/.var/app/org.libretro.RetroArch/config/retroarch/system/
```

Neo Arcade debe informar antes de lanzar el juego.

---

# 10. RETROARCH

Neo Arcade debe detectar:

```text
RetroArch
```

y comprobar:

```text
Executable
Version
Installation type
Config path
System path
Core path
```

Debe soportar preferentemente:

```text
Flatpak
```

pero permitir otras instalaciones.

No asumir:

```text
/usr/bin/retroarch
```

como única ubicación.

---

# 11. NÚCLEOS DE RETROARCH

El sistema debe poder detectar los cores instalados.

Para FBNeo:

```text
FBNeo
```

Los juegos Arcade/CPS/Neo Geo deben asociarse al core correspondiente.

La arquitectura debe permitir posteriormente:

```text
NES core
SNES core
GBA core
Genesis core
PS1 core
etc.
```

No codificar rutas absolutas de cores.

---

# 12. DOLPHIN

Dolphin será el emulador principal para:

```text
GameCube
```

Neo Arcade debe detectar:

```text
Dolphin executable
Version
Config directory
```

Formatos:

```text
.iso
.rvz
.gcz
```

---

# 13. PPSSPP

PPSSPP será el emulador principal para:

```text
PSP
```

Neo Arcade debe detectar:

```text
PPSSPP executable
Version
Configuration
```

Formatos:

```text
.iso
.cso
```

---

# 14. EMULATOR ADAPTER

Nunca acoplar Neo Arcade directamente a un emulador.

Crear:

```text
EmulatorAdapter
```

Interfaz conceptual:

```text
detect()
getVersion()
getExecutable()
getConfigPath()
getSystemPath()
supports(platform)
validate()
launch(game)
```

Implementaciones:

```text
RetroArchAdapter
DolphinAdapter
PPSSPPAdapter
```

Posteriormente:

```text
PCSX2Adapter
DuckStationAdapter
MAMEAdapter
```

etc.

---

# 15. DETECCIÓN DE EMULADORES

Al iniciar Neo Arcade:

```text
Detect installed emulators
```

Debe comprobar:

```text
RetroArch
Dolphin
PPSSPP
```

y registrar:

```text
name
version
path
installationType
supportedPlatforms
status
```

Ejemplo:

```text
RetroArch
Version: 1.x
Installation: Flatpak
Status: OK
```

---

# 16. LANZAMIENTO

Cuando el usuario selecciona:

```text
Metal Slug
```

Neo Arcade debe:

```text
1. Identificar juego.
2. Identificar plataforma.
3. Identificar emulador.
4. Validar emulador.
5. Validar ROM.
6. Validar BIOS si aplica.
7. Construir argumentos.
8. Ejecutar.
9. Ocultar/minimizar frontend.
10. Esperar proceso.
11. Detectar cierre.
12. Restaurar Neo Arcade.
13. Actualizar historial.
```

---

# 17. FULLSCREEN

El emulador debe iniciarse en pantalla completa cuando la configuración lo permita.

Neo Arcade debe preferir:

```text
Fullscreen
```

para una experiencia de consola.

No asumir que todos los emuladores utilizan exactamente el mismo argumento.

El adapter debe encargarse de ello.

---

# 18. REGRESO AL MENÚ

Cuando termina el emulador:

```text
Emulator exits
       ↓
Neo Arcade resumes
```

El frontend debe permanecer vivo mientras el emulador se ejecuta.

No reiniciar Neo Arcade innecesariamente.

---

# 19. CONTROLES

Neo Arcade debe soportar:

```text
Gamepad
Keyboard
```

Controles mínimos:

```text
Up
Down
Left
Right
A
B
Start
Select
```

Acciones:

```text
A       = Seleccionar
B       = Atrás
Start   = Iniciar
Select  = Menú
```

Combinación de salida:

```text
Select + Start
```

Debe existir además:

```text
Esc
```

como método alternativo.

---

# 20. GAMEPAD

Detectar automáticamente controles conectados.

Mostrar:

```text
Controller detected
```

Permitir configuración futura de botones.

No asumir que todos los gamepads utilizan el mismo layout.

---

# 21. BIBLIOTECA

La pantalla principal debe mostrar:

```text
Favorites
Recently Played
Platforms
All Games
```

Cada juego debe tener:

```text
Artwork
Title
Platform
Year
Genre
Players
```

---

# 22. GAME CARD

Una tarjeta debe mostrar:

```text
┌───────────────────────────┐
│                           │
│         COVER             │
│                           │
├───────────────────────────┤
│ Metal Slug                │
│ Arcade                    │
│ 1996                      │
└───────────────────────────┘
```

La interfaz debe funcionar correctamente a distancia desde una TV.

Los elementos deben ser grandes.

Evitar interfaces diseñadas exclusivamente para mouse.

---

# 23. FAVORITOS

Permitir:

```text
Add Favorite
Remove Favorite
```

Los favoritos son referencias a juegos.

No duplicar archivos.

---

# 24. RECIENTES

Registrar:

```text
lastPlayed
playCount
totalPlayTime
```

Mostrar:

```text
Recently Played
```

---

# 25. METADATOS

Neo Arcade utiliza:

```text
Skraper
```

con perfil:

```text
EmulationStation
```

Los metadatos pueden incluir:

```text
name
description
year
genre
developer
publisher
players
rating
```

---

# 26. GAMELIST.XML

Skraper puede generar:

```text
gamelist.xml
```

Neo Arcade debe poder leerlo.

Ejemplo conceptual:

```xml
<game>
    <path>./game.zip</path>
    <name>Game</name>
    <desc>Description</desc>
    <image>...</image>
    <video>...</video>
    <releasedate>...</releasedate>
    <genre>...</genre>
</game>
```

No asumir que todos los campos existen.

---

# 27. MEDIA

Media puede almacenarse:

```text
~/NeoRetro/media/<platform>/
```

o junto a ROMs cuando Skraper lo requiera.

Tipos:

```text
boxart
screenshot
video
logo
marquee
```

---

# 28. ROM SCANNER

Crear:

```text
RomScanner
```

Funciones:

```text
scan()
identify()
validate()
hash()
detectDuplicates()
detectMultidisc()
```

Debe escanear:

```text
~/NeoRetro/roms/
```

recursivamente.

---

# 29. IDENTIFICACIÓN

No confiar solamente en extensión.

Utilizar:

```text
extension
directory
filename
header
hash
metadata
```

para identificar plataforma.

---

# 30. VALIDACIÓN

Cada juego debe tener un estado:

```text
VALID
INVALID
UNKNOWN
MISSING_BIOS
DUPLICATE
CORRUPTED
UNSUPPORTED
```

Ejemplo:

```text
Game:
Metal Slug

Platform:
Neo Geo

Status:
MISSING_BIOS
```

---

# 31. HASH

Calcular:

```text
MD5
SHA1
SHA256
```

cuando sea necesario.

Usar SHA-256 como identificador fuerte interno cuando sea apropiado.

---

# 32. DUPLICADOS

Detectar mediante:

```text
SHA256
SHA1
MD5
```

y secundariamente:

```text
size
filename
metadata
```

No eliminar automáticamente.

Mostrar:

```text
Possible duplicate
```

y permitir al usuario decidir.

---

# 33. JUEGOS LEGALES

Neo Arcade puede implementar un sistema de descubrimiento y descarga únicamente para contenido cuya distribución sea legal.

Permitido:

```text
Homebrew
Freeware
Demos
Public Domain
Open Source
Contenido oficialmente liberado
Contenido autorizado por sus creadores
```

Fuentes posibles:

```text
Páginas oficiales
Repositorios oficiales
itch.io
Proyectos open source
Repositorios de desarrolladores
MAME / proyectos que publiquen explícitamente contenido autorizado
```

La fuente debe verificarse antes de incorporarse como proveedor.

---

# 34. JUEGOS COMERCIALES

No automatizar la descarga de ROMs comerciales protegidas sin autorización.

Para esos juegos:

```text
Import Local Game
```

El usuario puede proporcionar su propia copia.

Neo Arcade debe poder importar:

```text
ROM
ISO
CHD
CUE/BIN
GDI
etc.
```

según la plataforma.

---

# 35. GAME DOWNLOAD PROVIDER

Crear una abstracción:

```text
GameProvider
```

Interfaz:

```text
search(query, platform)
getGame(id)
getMetadata(id)
getDownloadOptions(id)
download(id, destination)
verify(file)
```

Implementaciones permitidas:

```text
HomebrewProvider
FreewareProvider
OfficialReleaseProvider
PublicDomainProvider
```

No crear:

```text
CommercialRomPiracyProvider
```

ni integrar sitios cuyo propósito principal sea distribuir ROMs comerciales no autorizadas.

---

# 36. DESCARGA

Flujo:

```text
SEARCH
 ↓
SELECT
 ↓
DOWNLOAD
 ↓
VERIFY
 ↓
IDENTIFY
 ↓
VALIDATE
 ↓
INSTALL
 ↓
SCRAPE
 ↓
ADD TO LIBRARY
```

Nunca considerar un archivo instalado hasta terminar la verificación.

---

# 37. DESCARGAS INCOMPLETAS

Si la descarga falla:

```text
FAILED
```

No agregar el archivo a la biblioteca.

Si existe archivo parcial:

```text
.part
```

limpiarlo o permitir reanudar cuando el proveedor lo soporte.

---

# 38. ARCHIVOS COMPRIMIDOS

Para:

```text
.zip
.7z
```

el sistema debe detectar:

```text
archive
contents
platform
game
```

Antes de extraer.

Para juegos arcade:

```text
NO renombrar ZIP
NO modificar ROM set
NO recomprimir automáticamente
```

porque FBNeo puede requerir nombres y estructura específicos.

---

# 39. NEO GEO

Neo Geo requiere:

```text
neogeo.zip
```

El sistema debe detectar su presencia.

Si falta:

```text
Neo Arcade

BIOS / System file missing:

neogeo.zip

El juego no puede iniciarse correctamente.
```

No descargarlo automáticamente si su distribución no está autorizada.

---

# 40. PLAYSTATION

Para PSX:

```text
.cue + .bin
.chd
.pbp
```

Detectar juegos multidisco.

BIOS esperada:

```text
scph5501.bin
```

alternativas:

```text
scph5500.bin
scph5502.bin
```

El sistema debe comprobar la configuración real del core de RetroArch.

---

# 41. SEGA CD

Formatos:

```text
.cue + .bin
.chd
```

BIOS:

```text
bios_CD_U.bin
```

Antes de iniciar:

```text
check BIOS
```

Si falta:

```text
MISSING_BIOS
```

---

# 42. PORTS

Los juegos dentro de:

```text
~/NeoRetro/roms/ports/
```

pueden ser ejecutables directamente.

Formato:

```text
.sh
```

Antes de ejecutar:

```text
chmod
path validation
executable validation
```

Nunca ejecutar automáticamente archivos desconocidos sin validación.

---

# 43. SEGURIDAD

Nunca ejecutar directamente contenido proveniente de:

```text
ROM filename
metadata
download URL
user input
archive
```

Validar:

```text
paths
arguments
executables
archives
URLs
```

Prevenir:

```text
path traversal
command injection
arbitrary code execution
malicious archives
```

---

# 44. CONFIGURACIÓN

Configuración principal:

```text
~/NeoRetro/config/
```

Puede incluir:

```text
neo-arcade.json
emulators.json
paths.json
controls.json
library.json
```

Nunca almacenar rutas absolutas innecesarias cuando puedan calcularse dinámicamente.

---

# 45. BACKUPS

Crear:

```text
~/NeoRetro/backups/
```

Permitir respaldar:

```text
database
configuration
saves
save states
metadata
```

No es necesario respaldar ROMs automáticamente.

---

# 46. BASE DE DATOS

Utilizar una base local.

Entidades:

```text
games
platforms
emulators
rom_files
bios
metadata
artwork
collections
favorites
play_history
save_states
```

Relación:

```text
Game
 ├── RomFile
 ├── Metadata
 ├── Artwork
 ├── Platform
 ├── Emulator
 └── PlayHistory
```

---

# 47. ARQUITECTURA

Separar:

```text
UI
│
├── Library
├── Game Detail
├── Settings
├── Platforms
└── Downloads

Services
│
├── RomService
├── EmulatorService
├── MetadataService
├── ArtworkService
├── DownloadService
├── BiosService
├── SaveService
└── LaunchService

Infrastructure
│
├── Database
├── Filesystem
├── ProcessManager
└── Network

Adapters
│
├── RetroArchAdapter
├── DolphinAdapter
└── PPSSPPAdapter
```

---

# 48. PROCESOS

Crear un:

```text
ProcessManager
```

Responsabilidades:

```text
launch()
isRunning()
waitForExit()
terminate()
```

Debe registrar:

```text
PID
startTime
endTime
exitCode
```

---

# 49. EMULATOR LAUNCH

Nunca construir comandos concatenando strings sin sanitización.

Utilizar argumentos separados cuando el lenguaje lo permita.

Conceptualmente:

```text
[
    executable,
    argument1,
    argument2,
    romPath
]
```

No:

```text
"executable argument1 argument2 " + userInput
```

---

# 50. DETECCIÓN DE INSTALACIÓN

Para Linux buscar:

```text
PATH
Flatpak
AppImage
custom path
```

Especialmente:

```text
flatpak list
```

cuando Flatpak esté instalado.

Detectar:

```text
org.libretro.RetroArch
```

cuando corresponda.

No asumir que Flatpak siempre está instalado.

---

# 51. FLATPAK

RetroArch puede instalarse mediante Flatpak.

La aplicación debe detectar:

```text
org.libretro.RetroArch
```

y obtener información mediante:

```text
flatpak info
```

cuando esté disponible.

No asumir que las rutas de acceso a ROMs son idénticas a una instalación nativa.

Comprobar permisos cuando corresponda.

---

# 52. PERMISOS

Si Neo Arcade no puede acceder a:

```text
~/NeoRetro/roms/
```

debe mostrar un error claro.

Ejemplo:

```text
No se puede acceder a:

~/NeoRetro/roms/psx/

Comprueba los permisos del directorio.
```

---

# 53. ARRANQUE

Neo Arcade debe poder configurarse para iniciar automáticamente al arrancar Debian.

La Skill debe estudiar primero el entorno existente.

Posibles mecanismos:

```text
systemd user service
desktop autostart
display manager
```

No modificar el sistema automáticamente sin analizar primero la configuración.

---

# 54. MODO KIOSCO

Modo principal:

```text
TV / Kiosk Mode
```

Características:

```text
Fullscreen
No escritorio visible
Navegación mediante gamepad
Inicio automático
Regreso automático al menú
```

Mantener un modo administrador/configuración accesible mediante combinación de teclas.

---

# 55. ACTUALIZACIONES

No modificar automáticamente:

```text
RetroArch
Dolphin
PPSSPP
BIOS
ROMs
```

sin confirmación del usuario.

Neo Arcade debe poder detectar nuevas versiones pero separar:

```text
AVAILABLE
INSTALLED
UPDATE AVAILABLE
```

---

# 56. LOGS

Guardar logs en:

```text
~/NeoRetro/logs/
```

Registrar:

```text
startup
rom_scan
emulator_detection
launch
exit
download
verification
errors
```

No registrar secretos.

---

# 57. TESTS

Crear tests para:

```text
Platform detection
ROM detection
ROM validation
Hash calculation
Duplicate detection
Multidisc detection
BIOS detection
Emulator detection
RetroArch launch
Dolphin launch
PPSSPP launch
Process management
Metadata parsing
gamelist.xml parsing
Download verification
Filesystem permissions
```

---

# 58. DESARROLLO POR FASES

Claude Code debe trabajar por fases.

## Fase 1

Infraestructura:

```text
Project structure
Config
Logging
Filesystem
Database
```

## Fase 2

ROM scanner:

```text
Scan
Identify
Hash
Validate
```

## Fase 3

Emulators:

```text
RetroArch
Dolphin
PPSSPP
```

## Fase 4

Launcher:

```text
Launch
Fullscreen
Wait
Return
```

## Fase 5

Library:

```text
Games
Favorites
Recent
Search
```

## Fase 6

Metadata:

```text
Skraper
gamelist.xml
Artwork
Video
```

## Fase 7

Gamepad:

```text
Navigation
Select
Back
Start
Select + Start
```

## Fase 8

Legal content:

```text
GameProvider
Homebrew
Freeware
Demos
Official releases
```

## Fase 9

Kiosk:

```text
Autostart
Fullscreen
TV UI
```

## Fase 10

Polish:

```text
Animations
Performance
Caching
Error handling
Backup
Recovery
```

---

# 59. REGLAS PARA CLAUDE CODE

Antes de modificar código:

1. Inspeccionar el proyecto.
2. Identificar arquitectura actual.
3. Revisar dependencias.
4. Revisar configuración.
5. Revisar cómo se lanzan actualmente procesos.
6. Revisar estructura de ROMs.
7. Revisar emuladores instalados.
8. No duplicar funcionalidad existente.

Antes de agregar un emulador:

```text
1. Crear Adapter.
2. Detectar instalación.
3. Detectar versión.
4. Detectar plataformas.
5. Implementar launch().
6. Implementar validación.
7. Crear tests.
```

Antes de agregar una plataforma:

```text
1. Registrar plataforma.
2. Registrar extensiones.
3. Registrar emuladores compatibles.
4. Registrar BIOS requerida.
5. Registrar reglas especiales.
6. Crear tests.
```

---

# 60. COMANDOS SUGERIDOS

Claude Code debe entender solicitudes como:

```text
/neo-arcade scan
```

Escanear ROMs.

```text
/neo-arcade detect-emulators
```

Detectar emuladores.

```text
/neo-arcade verify
```

Verificar juegos.

```text
/neo-arcade metadata
```

Procesar metadatos.

```text
/neo-arcade scrape
```

Ejecutar/procesar scraping.

```text
/neo-arcade bios
```

Comprobar BIOS.

```text
/neo-arcade download
```

Gestionar contenido legal disponible.

```text
/neo-arcade organize
```

Organizar biblioteca.

```text
/neo-arcade test
```

Ejecutar tests.

---

# 61. OBJETIVO FINAL

Neo Arcade debe proporcionar una experiencia similar a una consola:

```text
ENCENDER PC
     ↓
NEO ARCADE
     ↓
BIBLIOTECA
     ↓
SELECCIONAR JUEGO
     ↓
DETECTAR EMULADOR
     ↓
VALIDAR ROM
     ↓
VALIDAR BIOS
     ↓
LANZAR FULLSCREEN
     ↓
JUGAR
     ↓
SALIR
     ↓
NEO ARCADE
```

El usuario nunca debería necesitar conocer los detalles técnicos del emulador para jugar.

La complejidad debe quedar dentro de:

```text
Adapters
Services
Managers
```

y no en la interfaz.

---

# 62. PRINCIPIO FUNDAMENTAL

Neo Arcade NO es un emulador.

Neo Arcade es un:

```text
RETRO FRONTEND
+
ROM MANAGER
+
EMULATOR MANAGER
+
LIBRARY MANAGER
+
METADATA MANAGER
+
LEGAL CONTENT MANAGER
```

Los emuladores realizan la emulación.

Neo Arcade coordina todo lo demás.
