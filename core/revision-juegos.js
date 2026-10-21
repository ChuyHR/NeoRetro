// Revisión de los juegos para el diagnóstico (npm run diagnostico -- --juegos): archivos vacíos o
// incompletos, listas .cue, .gdi y .m3u que nombran archivos que no están, BIOS o archivo de sistema que
// falta y posibles duplicados. No borra, no mueve y no renombra nada: los duplicados se muestran para que
// la persona decida.
//
// Cada juego queda con uno de estos estados (los nombres son los de la especificación del proyecto):
// VALID, INVALID (una lista nombra archivos que no están), CORRUPTED (vacío o incompleto),
// MISSING_BIOS y DUPLICATE (mismo contenido que otro, por SHA-256).
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { archivoDeSistema } from './lanzador/lanzador.js';

const MiB = 1024 * 1024;

// Archivos que nombra una lista de pistas o de discos, en el orden en que aparecen.
export function archivosQueNombra(extension, texto) {
  if (extension === '.cue') return [...texto.matchAll(/^\s*FILE\s+(?:"([^"]+)"|(\S+))/gim)].map((parte) => parte[1] ?? parte[2]);
  if (extension === '.gdi') {
    // Primera línea: número de pistas. Después: pista, sector, tipo, tamaño de sector, archivo, desfase.
    return texto.split(/\r?\n/).slice(1)
      .map((linea) => /^\s*\d+\s+\d+\s+\d+\s+\d+\s+(?:"([^"]+)"|(\S+))/.exec(linea))
      .filter(Boolean)
      .map((parte) => parte[1] ?? parte[2]);
  }
  if (extension === '.m3u') return texto.split(/\r?\n/).map((linea) => linea.trim()).filter((linea) => linea && !linea.startsWith('#'));
  return [];
}

// Firma que debe tener el principio (o el final) de cada formato. Sin ella, el archivo está incompleto
// o no es lo que dice su extensión.
async function firmaCorrecta(ruta, extension, tamano) {
  const archivo = await open(ruta, 'r');
  try {
    const leer = async (desde, cuantos) => {
      const bufer = Buffer.alloc(cuantos);
      const { bytesRead } = await archivo.read(bufer, 0, cuantos, desde);
      return bufer.subarray(0, bytesRead);
    };
    if (extension === '.zip') {
      // El índice del zip (fin del directorio central) va al final: una descarga cortada no lo tiene.
      const cola = await leer(Math.max(0, tamano - 65557), Math.min(tamano, 65557));
      return cola.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])) !== -1;
    }
    if (extension === '.7z') return (await leer(0, 6)).equals(Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]));
    if (extension === '.chd') return (await leer(0, 8)).toString('latin1') === 'MComprHD';
    // NES: cabecera iNES («NES» + 0x1A) o formato UNIF, que también usan algunos .nes (visto en la
    // biblioteca de RetroBat).
    if (extension === '.nes') return ['NES\x1a', 'UNIF'].includes((await leer(0, 4)).toString('latin1'));
    if (extension === '.unf' || extension === '.unif') return (await leer(0, 4)).toString('latin1') === 'UNIF';
    return true;
  } finally {
    await archivo.close();
  }
}

async function nombradosQueFaltan(ruta, extension) {
  const carpeta = path.dirname(ruta);
  const nombres = archivosQueNombra(extension, await readFile(ruta, 'latin1'));
  if (!nombres.length) return { faltan: ['(la lista no nombra ningún archivo)'], mayusculas: [] };
  const presentes = await readdir(carpeta).catch(() => []);
  const exactos = new Set(presentes);
  const sinMayusculas = new Map(presentes.map((nombre) => [nombre.toLowerCase(), nombre]));
  const faltan = [];
  const mayusculas = [];
  for (const nombre of nombres) {
    if (path.isAbsolute(nombre)) {
      const otra = await readdir(path.dirname(nombre)).catch(() => []);
      if (!otra.includes(path.basename(nombre))) faltan.push(nombre);
      continue;
    }
    // Las listas suelen nombrar archivos de su misma carpeta; si traen subcarpeta, se busca ahí.
    if (nombre.includes('/') || nombre.includes('\\')) {
      const partes = nombre.split(/[\\/]/);
      const otra = await readdir(path.join(carpeta, ...partes.slice(0, -1))).catch(() => []);
      if (!otra.includes(partes.at(-1))) faltan.push(nombre);
      continue;
    }
    if (exactos.has(nombre)) continue;
    // En Linux «Track 01.bin» y «track 01.bin» son archivos distintos, y el emulador no lo encuentra.
    if (sinMayusculas.has(nombre.toLowerCase())) mayusculas.push(`${nombre} (está como ${sinMayusculas.get(nombre.toLowerCase())})`);
    else faltan.push(nombre);
  }
  return { faltan, mayusculas };
}

async function huellaParcial(ruta, tamano) {
  const archivo = await open(ruta, 'r');
  try {
    const hash = createHash('sha256');
    const trozo = Math.min(MiB, tamano);
    for (const desde of tamano > 2 * MiB ? [0, tamano - MiB] : [0]) {
      const bufer = Buffer.alloc(tamano > 2 * MiB ? trozo : tamano);
      const { bytesRead } = await archivo.read(bufer, 0, bufer.length, desde);
      hash.update(bufer.subarray(0, bytesRead));
    }
    return hash.digest('hex');
  } finally {
    await archivo.close();
  }
}

const huellaCompleta = (ruta) => new Promise((listo, fallo) => {
  const hash = createHash('sha256');
  createReadStream(ruta).on('data', (trozo) => hash.update(trozo)).on('error', fallo).on('end', () => listo(hash.digest('hex')));
});

// Dos archivos con el mismo contenido tienen el mismo tamaño: solo se calcula la huella de los que
// coinciden en tamaño, primero con el principio y el final, y completa solo si eso también coincide.
// Así una biblioteca de GameCube (todas las imágenes pesan lo mismo) no se lee entera.
export async function buscarDuplicados(archivos) {
  const agrupar = async (lista, clave) => {
    const grupos = new Map();
    for (const archivo of lista) {
      const valor = await clave(archivo);
      if (!grupos.has(valor)) grupos.set(valor, []);
      grupos.get(valor).push(archivo);
    }
    return [...grupos.entries()].filter(([, grupo]) => grupo.length > 1);
  };
  const porTamano = await agrupar(archivos.filter(({ tamano }) => tamano > 0), ({ tamano }) => tamano);
  const duplicados = [];
  for (const [, mismos] of porTamano) {
    for (const [, parecidos] of await agrupar(mismos, ({ ruta, tamano }) => huellaParcial(ruta, tamano))) {
      for (const [sha256, iguales] of await agrupar(parecidos, ({ ruta, tamano }) => (tamano > 2 * MiB ? huellaCompleta(ruta) : huellaParcial(ruta, tamano)))) {
        duplicados.push({ sha256, archivos: iguales });
      }
    }
  }
  return duplicados;
}

// configuracion: la de la app. biblioteca: la del escáner. biosPorSistema: id del sistema → si tiene
// alguna de sus BIOS (del diagnóstico). carpetaBios: la que usa RetroArch de verdad.
export async function revisarJuegos(configuracion, biblioteca, { biosPorSistema, carpetaBios }) {
  const juegos = [];
  for (const sistema of configuracion.sistemas) {
    const carpeta = path.join(configuracion.carpetaRoms, sistema.carpeta);
    for (const { archivo } of biblioteca.sistemas[sistema.id]?.juegos ?? []) {
      const ruta = path.join(carpeta, ...archivo.split('/'));
      const extension = path.extname(archivo).toLowerCase();
      const juego = { sistema: sistema.id, nombreSistema: sistema.nombreLargo, archivo, ruta, estado: 'VALID', detalle: [] };
      juegos.push(juego);
      let tamano = 0;
      try {
        const descriptor = await open(ruta, 'r');
        tamano = (await descriptor.stat()).size;
        await descriptor.close();
      } catch {
        Object.assign(juego, { estado: 'INVALID', detalle: ['no se puede leer: revisa sus permisos'] });
        continue;
      }
      juego.tamano = tamano;
      if (tamano === 0) {
        Object.assign(juego, { estado: 'CORRUPTED', detalle: ['el archivo está vacío'] });
        continue;
      }
      if (!(await firmaCorrecta(ruta, extension, tamano))) {
        Object.assign(juego, { estado: 'CORRUPTED', detalle: [`no empieza como un archivo ${extension} (le falta su cabecera): puede estar incompleto o dañado`] });
        continue;
      }
      if (['.cue', '.gdi', '.m3u'].includes(extension)) {
        const { faltan, mayusculas } = await nombradosQueFaltan(ruta, extension);
        if (faltan.length || mayusculas.length) {
          juego.estado = 'INVALID';
          if (faltan.length) juego.detalle.push(`faltan: ${faltan.join(', ')}`);
          if (mayusculas.length) juego.detalle.push(`el nombre no coincide en mayúsculas: ${mayusculas.join(', ')}`);
          continue;
        }
      }
      if (biosPorSistema.get(sistema.id) === false) {
        Object.assign(juego, { estado: 'MISSING_BIOS', detalle: [`falta la BIOS (${sistema.bios.join(', ')})`] });
        continue;
      }
      if (sistema.archivoDeSistema && !(await archivoDeSistema(sistema.archivoDeSistema, path.dirname(ruta), carpetaBios))) {
        Object.assign(juego, { estado: 'MISSING_BIOS', detalle: [`falta ${sistema.archivoDeSistema}`] });
      }
    }
  }
  const duplicados = await buscarDuplicados(juegos.filter(({ tamano, estado }) => tamano && estado !== 'CORRUPTED'));
  for (const { archivos } of duplicados) {
    for (const [indice, juego] of archivos.entries()) {
      const otros = archivos.filter((_otro, cual) => cual !== indice).map(({ sistema, archivo }) => `${sistema}/${archivo}`);
      if (juego.estado === 'VALID') juego.estado = 'DUPLICATE';
      juego.detalle.push(`posible duplicado de ${otros.join(', ')}`);
    }
  }
  return { juegos, duplicados: duplicados.map(({ sha256, archivos }) => ({ sha256, archivos: archivos.map(({ sistema, archivo }) => `${sistema}/${archivo}`) })) };
}
