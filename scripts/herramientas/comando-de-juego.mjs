// Imprime, en JSON, el comando con el que Neo Arcade abriría un juego (core/lanzador/), después de las
// mismas comprobaciones que hace la app (juego, emulador, núcleo, BIOS). Para las pruebas en la TV.
// Uso: node scripts/herramientas/comando-de-juego.mjs <sistema/archivo>
import { ubicarJuego } from '../../core/biblioteca.js';
import { cargarConfiguracion } from '../../core/configuracion.js';
import { armarComando, verificar } from '../../core/lanzador/lanzador.js';

const configuracion = await cargarConfiguracion();
const id = process.argv[2];
const ubicado = ubicarJuego(id, configuracion);
if (!ubicado) {
  console.log(JSON.stringify({ error: 'No encuentro ese juego en la biblioteca.' }));
  process.exit(1);
}
try {
  const { programa, argumentos, emulador } = armarComando(ubicado.sistema, ubicado.ruta, configuracion.emuladores);
  await verificar({ programa, argumentos, emulador }, ubicado.sistema, ubicado.ruta);
  console.log(JSON.stringify({ programa, argumentos, emulador: ubicado.sistema.nombreEmulador }));
} catch (error) {
  console.log(JSON.stringify({ error: error.message }));
  process.exit(1);
}
