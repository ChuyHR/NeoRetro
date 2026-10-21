// Muestra el diagnóstico del equipo (core/diagnostico.js) en palabras, o en JSON con --json. Con
// --juegos revisa además cada juego (core/revision-juegos.js): vacíos, incompletos, listas con archivos
// que faltan, BIOS y posibles duplicados. Sale con código 1 si falta algo sin lo que la consola no puede
// funcionar (un emulador o una carpeta ilegible).
// Uso: npm run diagnostico [-- --juegos] [-- --json]
import os from 'node:os';
import path from 'node:path';

import { cargarConfiguracion, expandirRuta } from '../core/configuracion.js';
import { diagnosticar } from '../core/diagnostico.js';

const configuracion = await cargarConfiguracion();
// La carpeta de datos de Electron para esta app; NEO_ARCADE_DATOS la cambia, como en la app.
const carpetaDatos = process.env.NEO_ARCADE_DATOS ? expandirRuta(process.env.NEO_ARCADE_DATOS) : path.join(os.homedir(), '.config', 'neo-arcade');
const informe = await diagnosticar(configuracion, carpetaDatos, { revisar: process.argv.includes('--juegos') });
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(informe, null, 2));
  process.exit(0);
}

const casa = (ruta) => (ruta ? ruta.replace(os.homedir(), '~') : '(no se encontró)');
const marca = (bien) => (bien ? 'OK   ' : 'FALTA');
let grave = false;

console.log('EMULADORES');
for (const emulador of informe.emuladores) {
  grave ||= !emulador.instalado;
  console.log(`  ${marca(emulador.instalado)} ${emulador.nombre.padEnd(10)} ${emulador.instalado ? `versión ${emulador.version ?? '?'}, ${emulador.tipo}` : 'no está instalado'}`);
  if (emulador.configuracion !== undefined) {
    console.log(`          configuración: ${casa(emulador.configuracion)}`);
    console.log(`          núcleos:       ${casa(emulador.nucleos)}`);
    console.log(`          BIOS:          ${casa(emulador.bios)}`);
  }
}
console.log('NÚCLEOS DE RETROARCH');
for (const { nucleo, presente } of informe.nucleos) console.log(`  ${marca(presente)} ${nucleo}`);
console.log('BIOS');
for (const sistema of informe.bios) {
  console.log(`  ${marca(sistema.lista)} ${sistema.sistema}: hace falta una de ${sistema.archivos.map(({ nombre }) => nombre).join(', ')} en ${casa(sistema.carpeta)}`);
  for (const archivo of sistema.archivos.filter(({ presente }) => presente)) {
    const aviso = archivo.reconocida === false ? ' (no coincide con la BIOS conocida: puede estar dañada o ser de otra región)' : '';
    console.log(`          ${archivo.nombre}: SHA-256 ${archivo.sha256}${aviso}`);
  }
}
console.log(`  ${marca(informe.juegos.neogeoZip)} NEO GEO: neogeo.zip junto a sus juegos o en la carpeta de BIOS`);
console.log('CARPETAS DE JUEGOS');
console.log(`  ${casa(configuracion.carpetaRoms)}${informe.alcanceFlatpak === false ? '  (¡los emuladores de Flathub no pueden leer esta carpeta!)' : ''}`);
for (const carpeta of informe.juegos.carpetas) {
  grave ||= carpeta.existe && !carpeta.legible;
  const estado = !carpeta.existe ? 'no existe' : !carpeta.legible ? 'no se puede leer: revisa sus permisos' : `${carpeta.juegos} juegos`;
  console.log(`  ${marca(carpeta.existe && carpeta.legible)} ${carpeta.sistema.padEnd(16)} ${estado}`);
}
if (informe.revision) {
  const ETIQUETAS = { INVALID: 'NO SIRVE', CORRUPTED: 'DAÑADO', MISSING_BIOS: 'SIN BIOS', DUPLICATE: 'DUPLICADO' };
  const { juegos } = informe.revision;
  const conProblema = juegos.filter(({ estado }) => estado !== 'VALID');
  console.log(`REVISIÓN DE JUEGOS: ${juegos.length - conProblema.length} de ${juegos.length} sin problemas`);
  for (const juego of conProblema) {
    console.log(`  ${(ETIQUETAS[juego.estado] ?? juego.estado).padEnd(9)} ${juego.sistema}/${juego.archivo}: ${juego.detalle.join('; ')}`);
  }
  if (informe.revision.duplicados.length) console.log('  Los duplicados no se borran: decide tú cuál conservar.');
}
console.log(`MEDIOS: ${casa(informe.medios.carpeta)} ${informe.medios.existe ? '' : '(no existe)'}`);
console.log(`MANDOS CONECTADOS: ${informe.mandos.length ? informe.mandos.map(({ nombre }) => nombre).join(', ') : 'ninguno'}`);
console.log(`LO QUE SE RECUERDA: ${casa(informe.datos)}`);
process.exit(grave ? 1 : 0);
