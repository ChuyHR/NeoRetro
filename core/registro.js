// Registro de lanzamientos y errores en la carpeta de datos del usuario (registros/), un renglón por
// evento separado con tabuladores: fecha, tipo y detalle.
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export function crearRegistro(carpetaDatos) {
  const carpeta = path.join(carpetaDatos, 'registros');
  const archivo = path.join(carpeta, 'neo-arcade.log');
  return {
    archivo,
    async anotar(tipo, ...detalles) {
      try {
        await mkdir(carpeta, { recursive: true });
        await appendFile(archivo, `${[new Date().toISOString(), tipo, ...detalles].join('\t')}\n`);
      } catch (error) {
        console.error('No se pudo escribir el registro:', error.message);
      }
    },
  };
}
