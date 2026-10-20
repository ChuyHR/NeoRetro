// Convierte la biblioteca escaneada en los datos que dibuja la interfaz: los juegos con lo que su
// sistema aporta (nombre, emulador, colores de la portada de reemplazo) y la lista de sistemas, solo
// con los que tienen juegos. Año, género y descripción llegan con la fase 5 (gamelist.xml).
import path from 'node:path';

export function datosParaInterfaz({ sistemas }, biblioteca) {
  const juegos = [];
  for (const sistema of sistemas) {
    for (const { archivo, titulo } of biblioteca.sistemas[sistema.id]?.juegos ?? []) {
      juegos.push({
        id: `${sistema.id}/${archivo}`,
        titulo,
        sistema: sistema.id,
        nombreSistema: sistema.nombreLargo,
        emulador: sistema.nombreEmulador,
        controles: sistema.controles,
        colores: sistema.colores,
        motivo: sistema.motivo,
        anio: null,
        desarrollador: null,
        genero: null,
        jugadores: null,
        descripcion: '',
      });
    }
  }
  juegos.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' }) || a.id.localeCompare(b.id));
  const conJuegos = new Set(juegos.map((juego) => juego.sistema));
  const visibles = sistemas.filter((sistema) => conJuegos.has(sistema.id)).map(({ id, nombre }) => ({ id, nombre }));
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
