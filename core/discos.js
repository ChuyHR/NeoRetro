// Juegos de varios discos: «Juego (Disc 1).cue», «Juego (Disc 2).cue»… en la misma carpeta son un solo
// juego con sus discos, no varios. Si hay una lista «Juego.m3u» en esa carpeta o en una de más arriba
// (psx/Juego.m3u con los discos en psx/Juego/), esa es la que se abre y los discos sueltos no se
// muestran. Si no la hay, al abrir el juego se arma una (listaDeDiscos) para que el emulador pueda
// cambiar de disco a media partida.
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const MARCA = /\s*\((?:disc|disk|disco|cd)\s*(\d+)(?:\s*(?:of|de)\s*\d+)?\)/i;

export const sinMarcaDeDisco = (titulo) => titulo.replace(MARCA, '').replace(/\s+/g, ' ').trim();

// ¿La carpeta «dentro» es «arriba» o está debajo de ella? Rutas relativas a la carpeta del sistema.
const contiene = (arriba, dentro) => arriba === '.' || dentro === arriba || dentro.startsWith(`${arriba}/`);

// juegos: los de un sistema, como los deja el escáner ({ archivo, titulo }). Devuelve la lista con los
// discos agrupados; cada grupo lleva discos: [archivo del disco 1, del 2…], rutas dentro de la carpeta
// del sistema.
export function agruparDiscos(juegos) {
  const grupos = new Map();
  const listas = [];
  const resultado = [];
  for (const juego of juegos) {
    const marca = MARCA.exec(juego.titulo);
    const base = sinMarcaDeDisco(juego.titulo);
    const carpeta = path.posix.dirname(juego.archivo);
    if (juego.archivo.toLowerCase().endsWith('.m3u')) listas.push({ juego, base: base.toLowerCase(), carpeta, discos: [] });
    else if (marca) {
      const clave = `${carpeta}|${base.toLowerCase()}`;
      if (!grupos.has(clave)) grupos.set(clave, { base, carpeta, discos: [] });
      grupos.get(clave).discos.push({ archivo: juego.archivo, titulo: juego.titulo, numero: Number(marca[1]) });
    } else resultado.push(juego);
  }
  for (const grupo of grupos.values()) {
    grupo.discos.sort((a, b) => a.numero - b.numero || a.archivo.localeCompare(b.archivo));
    // La lista más cercana con el mismo nombre se queda con estos discos.
    const lista = listas
      .filter(({ base, carpeta }) => base === grupo.base.toLowerCase() && contiene(carpeta, grupo.carpeta))
      .sort((a, b) => b.carpeta.length - a.carpeta.length)[0];
    if (lista) lista.discos.push(...grupo.discos.map(({ archivo }) => archivo));
    else if (grupo.discos.length < 2) resultado.push(...grupo.discos.map(({ archivo, titulo }) => ({ archivo, titulo })));
    else resultado.push({ archivo: grupo.discos[0].archivo, titulo: grupo.base, discos: grupo.discos.map(({ archivo }) => archivo) });
  }
  for (const { juego, discos } of listas) resultado.push(discos.length ? { ...juego, discos } : juego);
  return resultado.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' }) || a.archivo.localeCompare(b.archivo));
}

// Escribe la lista .m3u de un juego de varios discos en la carpeta de datos y devuelve su ruta. Lleva
// rutas absolutas: RetroArch las acepta y así la lista no tiene que vivir junto a los discos, en la
// carpeta del usuario.
export async function listaDeDiscos(carpetaDatos, id, rutasDeDiscos) {
  const carpeta = path.join(carpetaDatos, 'listas');
  await mkdir(carpeta, { recursive: true });
  const archivo = path.join(carpeta, `${createHash('sha1').update(id).digest('hex').slice(0, 16)}.m3u`);
  await writeFile(archivo, `${rutasDeDiscos.join('\n')}\n`);
  return archivo;
}
