import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

import { datosParaInterfaz } from '../core/biblioteca.js';
import { anioDe, leerGamelist, rutaRelativa } from '../core/medios/gamelist.js';
import { direccionDe, leerMedios } from '../core/medios/medios.js';
import { crearServidorDeMedios, rutaDeDireccion } from '../core/medios/servidor.js';

const temporales = [];
after(() => Promise.all(temporales.map((carpeta) => rm(carpeta, { recursive: true, force: true }))));

async function carpetaTemporal() {
  const carpeta = await mkdtemp(path.join(os.tmpdir(), 'neo-arcade-medios-'));
  temporales.push(carpeta);
  return carpeta;
}

async function archivo(ruta, contenido = '') {
  await mkdir(path.dirname(ruta), { recursive: true });
  await writeFile(ruta, contenido);
}

const GAMELIST = `<?xml version="1.0"?>
<gameList>
  <game id="1" source="ScreenScraper.fr">
    <path>./mslug.zip</path>
    <name>Metal Slug - Super Vehicle-001</name>
    <desc><![CDATA[Corre & dispara <sin> escapar.]]></desc>
    <image>./media/images/mslug.png</image>
    <releasedate>19960419T000000</releasedate>
    <developer>Nazca &amp; SNK</developer>
    <genre>Acción</genre>
    <players>1-2</players>
  </game>
  <game><path>.\\Sub\\Otro.zip</path><name>Otro &#233;xito &#x263A;</name></game>
  <game><path>./megat.zip</path><name>ZZZ(notgame):Pit Boss Megatouch</name><hidden>true</hidden></game>
  <folder><path>./Sub</path><name>Carpeta</name></folder>
</gameList>`;

test('lee el gamelist de EmulationStation con CDATA, entidades y rutas de Windows', () => {
  const juegos = leerGamelist(GAMELIST);
  assert.equal(juegos.length, 3);
  assert.equal(juegos[0].name, 'Metal Slug - Super Vehicle-001');
  assert.equal(juegos[0].desc, 'Corre & dispara <sin> escapar.');
  assert.equal(juegos[0].developer, 'Nazca & SNK');
  assert.equal(juegos[1].name, 'Otro éxito ☺');
  assert.equal(rutaRelativa(juegos[1].path, 'neogeo'), 'Sub/Otro.zip');
  assert.equal(rutaRelativa('/home/x/roms/neogeo/mslug.zip', 'neogeo'), 'mslug.zip');
  assert.equal(anioDe(juegos[0].releasedate), 1996);
  assert.equal(anioDe('00000000T000000'), null);
});

test('el gamelist da nombre, datos y carátula; sin él, las carpetas por nombre de archivo', async () => {
  const base = await carpetaTemporal();
  const configuracion = {
    carpetaRoms: path.join(base, 'roms'),
    carpetaMedios: path.join(base, 'media'),
    sistemas: [
      { id: 'neogeo', carpeta: 'neogeo', nombreLargo: 'NEO GEO', colores: ['#1', '#2', '#3'] },
      { id: 'snes', carpeta: 'snes', nombreLargo: 'SNES', colores: ['#1', '#2', '#3'] },
    ],
  };
  await archivo(path.join(base, 'roms', 'neogeo', 'gamelist.xml'), GAMELIST); // donde lo deja Skraper
  await archivo(path.join(base, 'media', 'snes', 'covers', 'Mario (USA).png'));
  await archivo(path.join(base, 'media', 'snes', 'videos', 'Mario (USA).mp4'));
  await archivo(path.join(base, 'media', 'snes', 'screenshots', 'Mario (USA).jpg'));
  const biblioteca = { sistemas: { neogeo: { juegos: [{ archivo: 'mslug.zip', titulo: 'mslug' }, { archivo: 'megat.zip', titulo: 'megat' }] }, snes: { juegos: [{ archivo: 'Mario (USA).sfc', titulo: 'Mario' }] } } };
  const { juegos } = datosParaInterfaz(configuracion, biblioteca, await leerMedios(configuracion));
  assert.equal(juegos.length, 2); // megat.zip está oculto en el gamelist, como lo marca RetroBat
  const [mario, slug] = juegos;
  assert.equal(slug.titulo, 'Metal Slug - Super Vehicle-001');
  assert.equal(slug.anio, 1996);
  assert.equal(slug.jugadores, '1-2');
  assert.equal(slug.caratula, 'medio://roms/neogeo/media/images/mslug.png'); // solo <image>: hace de carátula
  assert.equal(mario.caratula, 'medio://medios/snes/covers/Mario%20(USA).png');
  assert.equal(mario.captura, 'medio://medios/snes/screenshots/Mario%20(USA).jpg');
  assert.equal(mario.video, 'medio://medios/snes/videos/Mario%20(USA).mp4');
});

test('nada fuera de las carpetas de medios y de juegos tiene dirección ni se sirve', async () => {
  const carpetas = { carpetaMedios: '/datos/media', carpetaRoms: '/datos/roms' };
  assert.equal(direccionDe('/etc/passwd', carpetas), null);
  // Los «..» sueltos los resuelve la propia URL, que no sale de la raíz; los codificados llegan aquí.
  assert.equal(rutaDeDireccion('medio://medios/../../etc/passwd', carpetas), path.join('/datos/media', 'etc', 'passwd'));
  assert.equal(rutaDeDireccion('medio://medios/%2e%2e%2f%2e%2e%2fetc/passwd', carpetas), null);
  assert.equal(rutaDeDireccion('medio://otra/x.png', carpetas), null);
  assert.equal(rutaDeDireccion('medio://medios/snes/covers/a%20b.png', carpetas), path.join('/datos/media', 'snes', 'covers', 'a b.png'));
});

test('el servidor entrega imágenes enteras y vídeos por rangos, y 404 si falta', async () => {
  const base = await carpetaTemporal();
  const carpetas = { carpetaMedios: path.join(base, 'media'), carpetaRoms: path.join(base, 'roms') };
  await archivo(path.join(base, 'media', 'a.png'), 'PNGDATOS');
  await archivo(path.join(base, 'media', 'v.webm'), '0123456789');
  const servir = crearServidorDeMedios(carpetas);
  const imagen = await servir(new Request('medio://medios/a.png'));
  assert.equal(imagen.status, 200);
  assert.equal(imagen.headers.get('content-type'), 'image/png');
  assert.equal(await imagen.text(), 'PNGDATOS');
  const parte = await servir(new Request('medio://medios/v.webm', { headers: { range: 'bytes=2-5' } }));
  assert.equal(parte.status, 206);
  assert.equal(parte.headers.get('content-range'), 'bytes 2-5/10');
  assert.equal(await parte.text(), '2345');
  assert.equal((await servir(new Request('medio://medios/no.png'))).status, 404);
  assert.equal((await servir(new Request('medio://medios/a.txt'))).status, 404);
});
