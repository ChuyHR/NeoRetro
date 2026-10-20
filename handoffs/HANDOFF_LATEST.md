# Handoff del 2026-10-20

## Resumen

Primera sesión del proyecto. Se creó el `CLAUDE.md`, se guardó el plan, se hizo un análisis de
viabilidad, el usuario tomó las decisiones que cambian el plan (sección «Ajustes al plan» del
`CLAUDE.md`) y se hizo la primera mitad de la fase 0. Las pruebas están hechas y
`Docs/decision-tecnica.md` recomienda Electron 44, emuladores desde Flathub y Debian 13 con Cage.
**La fase 0 está detenida esperando que el usuario apruebe ese documento.** Con su aprobación sigue
el segundo prompt de la fase 0: crear el proyecto base.

## Decisiones del usuario y cómo se interpretaron

- **Camino A: Debian + Neo Arcade.** Preguntó si «Debian» era Batocera, que él entendía que se iba a
  usar; Batocera solo se había citado como ejemplo. Se le presentaron tres caminos y eligió el plan
  original («A ok, continuemos con el plan inicial»).
- **Desarrollo en local.** «Se podría ejecutar en un emulador aquí en local; cuando ya esté casi al
  100% se hacen pruebas reales.» Se eligió Debian 13 en WSL 2, porque WSL ya estaba activo, WSLg da
  ventanas con aceleración y comparte memoria con Docker en un equipo de 8 GB.
- **Disco externo.** El disco C: se estaba llenando (11.9 GB libres). Pidió mover «solo este
  proyecto» y luego aprobó mover el proyecto y su Debian a D:. Quedaron en `D:\UtilsDev\ArcadeRetro`
  y `D:\NeoArcade\wsl`, y C: subió a 15.3 GB libres. Docker y Xenty no se tocaron. El repositorio se
  dejó bajo una carpeta `UtilsDev` porque el registro de horas descarta esas rutas.
- **Windows en la MP80.** Lo conserva hasta las pruebas reales; la fase 8 la reinstala. Esa instalación
  borra el disco: confirmarlo con el usuario antes.
- **Teclado primero**, con la fase 4 de controles en pausa.
- **Universal**: cualquier PC que cumpla los mínimos y cualquier control, USB o Bluetooth.
- **Pantalla adaptable** a cualquier tamaño. Su preocupación por lo pixeleado de los juegos se
  respondió con una propuesta (abajo).
- **Frontend**: aprobó carátulas sin recorte, vista previa para 4:3, texto mínimo de 24 px y foco
  único con barra desplazable.

## Lo que se hizo

- Repositorio con identidad local ChuyHR y `.gitattributes` (finales de línea LF en todo el repo,
  porque con CRLF bash no ejecuta los scripts).
- Debian 13 en WSL: usuario `arcade` (uid 1000, que hace saltar la pantalla de bienvenida de WSL),
  sudo sin contraseña, systemd activo. Paquetes para las pruebas, Flatpak y el remoto de Flathub.
- Carpetas `roms/<sistema>/` y `media/<sistema>/` de los 21 sistemas, vacías y fuera de git.
- Pruebas de la fase 0 en `Docs/pruebas-fase0/` (Electron, WebKitGTK y comparación píxel a píxel), con
  resultados y capturas en `resultados/`.
- `Docs/decision-tecnica.md`: recomendación, resultados, comparación de cuatro caminos, estructura de
  carpetas propuesta y riesgos.

## Defectos y sorpresas encontrados de pasada

- **Dos comandos rechazados por el usuario sí se ejecutaron.** El `apt-get install` de las pruebas y
  el `wsl --manage Debian --move`. El movimiento terminó (el reintento falló con `ERROR_FILE_EXISTS`).
  La instalación quedó a medias, con paquetes «unpacked», porque el movimiento cerró Debian mientras
  apt corría; se terminó con `dpkg --configure -a`. Se le informó al usuario.
- **WSL no aplica la aceleración gráfica por su cuenta.** Mesa usaba llvmpipe; con
  `GALLIUM_DRIVER=d3d12` usa la Iris Xe. `correr.sh` lo exporta solo en WSL.
- **`wsl.exe -d Debian -- bash -c` pierde las variables**, porque WSL reinterpreta el comando con otro
  shell. Hay que usar `--exec`.
- **La ventana de Electron se recorta al tamaño de la pantalla** (1366×768 en esta laptop), incluso
  fuera de pantalla. La captura a 1920×1080 se hace emulando el tamaño con el protocolo de depuración.
- **Electron 44 pide Node 22.12 o posterior**; con el Node 20.19 de Debian avisa, aunque instala.
- **Corrección al análisis:** se le había dicho al usuario que WebKitGTK dibujaba distinto. La
  comparación mostró diferencias de suavizado de un píxel nada más; ya se corrigió en el documento.

## Propuestas sin respuesta

- **Aprobar `Docs/decision-tecnica.md`** (lo que detiene la fase 0).
- **Imagen de los juegos** en Ajustes: píxel nítido, suavizado o efecto CRT, escrita por Neo Arcade en
  la configuración de RetroArch. Iría en la fase 6.
- **Revisión temprana en la MP80** desde una USB de Debian, sin tocar Windows, al cerrar la fase 1. El
  usuario prefirió probar en real al final; es solo una recomendación.
- **Perfil Peques en la fase 6** y las combinaciones de teclado (Esc para salir de los emuladores,
  Ctrl + Alt + Mayús + M sostenida 3 s para la terminal de mantenimiento). Quedaron así salvo que diga
  otra cosa.

## Lo que falta, en orden

1. Que el usuario apruebe la decisión técnica.
2. Segundo prompt de la fase 0:
   - Mover `Docs/` a `docs/` con el prototipo en `docs/referencia/`, en dos pasos con `git mv` porque
     el disco no distingue mayúsculas.
   - Instalar Node 22.12 o posterior en el Debian de WSL, crear la estructura de carpetas del
     documento y el `package.json` con Electron fijo.
   - Hacer que la ventana abra a pantalla completa, con fondo `#050914`, el lienzo escalado y el texto
     NEO ARCADE, y que Esc la cierre solo en desarrollo.
   - Dejar los comandos de desarrollo y de versión final en el `CLAUDE.md`.
3. Al aprobar Flathub: quitar el RetroArch de Debian que se instaló para las pruebas e instalar los
   tres emuladores de Flathub. Con la tecnología aprobada, eso ya no adelanta nada.

## Datos verificados en esta sesión

- PC de trabajo: i7-1165G7, Iris Xe, 7.7 GB de RAM visibles, pantalla de 1366×768, laptop. WSL 3.0.3
  con kernel 6.18 y WSLg 1.0.79. WSL asigna 3.7 GB de memoria a sus distribuciones.
- MP80: N95 con UHD de 16 EU, 16 GB LPDDR5, SSD M.2 SATA de 512 GB, Bluetooth 4.2 (Intel y CNX
  Software). GameCube queda al límite en esta clase de procesador.
- Debian 13: RetroArch 1.20.0 con 7 núcleos (de los del plan solo mGBA), Dolphin 2503, sin PPSSPP,
  Cage 0.2.0, Flatpak 1.16.6, Node 20.19, WebKitGTK 2.54, solo Godot 3.6.
- Flathub: `org.libretro.RetroArch` (416 MB, base KDE 6.11), `org.DolphinEmu.dolphin-emu` (22 MB, KDE
  6.11), `org.ppsspp.PPSSPP` (36 MB, Freedesktop 26.08).
- Cage: la ventana nueva queda encima con toda la entrada y al cerrarse vuelve la anterior (su wiki).
- Godot 4 solo reproduce Ogg Theora (su documentación).

## Supuestos que conviene revisar

- Las mediciones de fluidez y arranque son de WSLg y no dicen nada de la MP80.
- Que el RetroArch de Flathub traiga sus núcleos está inferido por su tamaño, no comprobado.
- Los requisitos mínimos del ajuste 2 siguen siendo una propuesta.
- Con 8 GB en la PC de trabajo, WSL comparte memoria con los contenedores de Xenty; si se queda corta,
  se detienen esos contenedores mientras se trabaja aquí.
