// Registro de lanzamientos y errores en neo-arcade.log de la carpeta de registros (registros/ de la
// carpeta de datos, o ~/NeoRetro/logs en la consola instalada), un renglón por evento separado con
// tabuladores: fecha, tipo y detalle.
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export function crearRegistro(carpeta) {
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
