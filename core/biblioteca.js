// Convierte la biblioteca escaneada en los datos que dibuja la interfaz: los juegos con lo que su
// sistema aporta (nombre, emulador, colores de la portada de reemplazo), lo que dicen sus medios
// (core/medios/: nombre, descripción, año, carátula, vídeo…) y la lista de sistemas, solo con los que
// tienen juegos.
import path from 'node:path';

import { agruparDiscos, sinMarcaDeDisco } from './discos.js';
import { datosDelJuego } from './medios/medios.js';

// medios: lo que devuelve leerMedios(), un índice por sistema. Sin él, los juegos van sin medios.
// Los juegos de varios discos salen una sola vez, con discos: [archivos] (core/discos.js), en los
// sistemas cuyo emulador abre listas .m3u.
export function datosParaInterfaz(configuracion, biblioteca, medios = null) {
  const juegos = [];
  for (const sistema of configuracion.sistemas) {
    const indice = medios?.get(sistema.id) ?? null;
    const escaneados = biblioteca.sistemas[sistema.id]?.juegos ?? [];
    const conDiscos = sistema.extensiones?.some((extension) => extension.toLowerCase() === '.m3u');
    for (const { archivo, titulo, discos } of conDiscos ? agruparDiscos(escaneados) : escaneados) {
      const datos = datosDelJuego(indice, archivo, configuracion);
      if (datos.oculto) continue; // el gamelist lo oculta, como EmulationStation
      // El nombre del gamelist manda sobre el del archivo: en arcade el archivo es «mslug.zip».
      const nombre = datos.titulo ?? titulo;
      juegos.push({
        id: `${sistema.id}/${archivo}`,
        titulo: discos ? sinMarcaDeDisco(nombre) : nombre,
        ...(discos ? { discos } : {}),
        sistema: sistema.id,
        nombreSistema: sistema.nombreLargo,
        emulador: sistema.nombreEmulador,
        controles: sistema.controles,
        colores: sistema.colores,
        motivo: sistema.motivo,
        anio: datos.anio,
        desarrollador: datos.desarrollador,
        genero: datos.genero,
        jugadores: datos.jugadores,
        descripcion: datos.descripcion,
        caratula: datos.caratula,
        captura: datos.captura,
        video: datos.video,
      });
    }
  }
  juegos.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' }) || a.id.localeCompare(b.id));
  const conJuegos = new Set(juegos.map((juego) => juego.sistema));
  const visibles = configuracion.sistemas.filter((sistema) => conJuegos.has(sistema.id)).map(({ id, nombre }) => ({ id, nombre }));
  return { sistemas: juegos.length ? [{ id: 'todos', nombre: 'ALL GAMES' }, ...visibles] : [], juegos };
}

// El id de un juego es «sistema/ruta dentro de su carpeta»; de ahí se recupera el archivo.
export function ubicarJuego(id, { sistemas, carpetaRoms }) {
  const corte = id.indexOf('/');
  const sistema = sistemas.find((candidato) => candidato.id === id.slice(0, corte));
  if (!sistema) return null;
  const archivo = id.slice(corte + 1);
  const carpeta = path.join(carpetaRoms, sistema.carpeta);
  const ruta = path.join(carpeta, ...archivo.split('/'));
  return ruta.startsWith(carpeta + path.sep) ? { sistema, ruta } : null; // nada fuera de su carpeta
}

// Cuántos juegos hay por sistema, para mostrar el resultado de un escaneo.
export function conteoPorSistema({ sistemas }, biblioteca) {
  return sistemas.map((sistema) => ({ id: sistema.id, juegos: biblioteca.sistemas[sistema.id]?.juegos.length ?? 0 }));
}
