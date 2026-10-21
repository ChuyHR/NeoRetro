// Carpeta temporal de scripts/simulacion.mjs: una biblioteca de archivos vacíos (uno por sistema), un
// emulador falso y la configuración que apunta a ellos. Se arma al importar este módulo y de forma
// síncrona, para que core/main.js, que se importa justo después, ya encuentre todo y alcance a
// registrar el protocolo medio:// antes de que la app esté lista.
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
export const EMULADOR_MS = 1500; // lo que «juega» el emulador falso antes de cerrarse

// Un juego por sistema, con nombres como los que traen los archivos reales.
export const JUEGOS = {
  arcade: 'Street Fighter II (World 910522).zip',
  neogeo: 'Metal Slug (Set 1).zip',
  cps: 'Final Fight (World).zip',
  nes: 'Mega Man 2 (USA).nes',
  snes: 'Super Mario World (USA).sfc',
  n64: 'Super Mario 64 (USA).z64',
  gb: 'Tetris (World) (Rev 1).gb',
  gbc: 'Wario Land 3 (World).gbc',
  gba: 'Metroid Fusion (USA).gba',
  gamecube: 'Super Smash Bros Melee (USA).rvz',
  mastersystem: 'Alex Kidd in Miracle World (USA).sms',
  megadrive: 'Sonic_The_Hedgehog_(USA,_Europe).md',
  segacd: 'Sonic CD/Sonic CD (USA).cue',
  sega32x: 'Knuckles Chaotix (Japan, USA).32x',
  gamegear: 'Shinobi (USA, Europe).gg',
  dreamcast: 'Crazy Taxi/Crazy Taxi (USA).gdi',
  psx: 'Metal Gear Solid/Metal Gear Solid (USA) (Disc 1).cue',
  psp: 'Lumines (USA).iso',
  pcengine: 'Bonk Adventure (USA).pce',
  atari2600: 'Pitfall (USA).a26',
  ports: 'Juego propio.sh',
};
// Un segundo juego de SNES, con un nombre largo, para ver cómo se acomoda el título.
export const TITULO_LARGO = 'The Legend of Zelda - A Link to the Past (USA).sfc';

function preparar() {
  const base = mkdtempSync(path.join(os.tmpdir(), 'neo-arcade-simulacion-'));
  const carpeta = (nombre) => path.join(base, nombre);
  const { sistemas } = JSON.parse(readFileSync(path.join(RAIZ, 'config', 'systems.json'), 'utf8'));

  for (const sistema of sistemas) {
    const archivo = path.join(carpeta('roms'), sistema.carpeta, JUEGOS[sistema.id]);
    mkdirSync(path.dirname(archivo), { recursive: true });
    // El port sí corre de verdad: es un script que espera y sale, como un emulador.
    writeFileSync(archivo, sistema.id === 'ports' ? `sleep ${EMULADOR_MS / 1000}\n` : '');
  }
  writeFileSync(path.join(carpeta('roms'), 'snes', TITULO_LARGO), '');

  const emulador = carpeta('emulador-falso.sh');
  writeFileSync(emulador, `#!/usr/bin/env bash
printf '%s\\n' "$*" >> '${carpeta('llamadas.txt')}'
sleep ${EMULADOR_MS / 1000}
date +%s%3N > '${carpeta('cierre.txt')}'
exit 0
`);
  chmodSync(emulador, 0o755);

  // Todos los núcleos menos el de Nintendo 64, para ver el aviso de núcleo faltante.
  mkdirSync(carpeta('nucleos'));
  for (const nucleo of new Set(sistemas.map((sistema) => sistema.nucleo).filter(Boolean))) {
    if (nucleo !== 'mupen64plus_next') writeFileSync(path.join(carpeta('nucleos'), `${nucleo}_libretro.so`), '');
  }

  // La configuración real, salvo los emuladores: RetroArch y PPSSPP son el falso y Dolphin no existe.
  mkdirSync(carpeta('config'));
  writeFileSync(path.join(carpeta('config'), 'systems.json'), JSON.stringify({ sistemas }));
  writeFileSync(path.join(carpeta('config'), 'biblioteca.json'), JSON.stringify({ roms: carpeta('roms'), medios: carpeta('media') }));
  writeFileSync(path.join(carpeta('config'), 'emulators.json'), JSON.stringify({
    emuladores: {
      retroarch: { nombre: 'RetroArch', comando: [emulador], carpetaNucleos: carpeta('nucleos') },
      dolphin: { nombre: 'Dolphin', comando: [carpeta('no-instalado/dolphin-emu')] },
      ppsspp: { nombre: 'PPSSPP', comando: [emulador] },
      directo: { nombre: 'Ejecutable propio', comando: [] },
    },
  }));

  process.env.NEO_ARCADE_CONFIG = carpeta('config');
  process.env.NEO_ARCADE_DATOS = carpeta('datos');
  return { base, carpeta, sistemas };
}

export const entorno = preparar();
