// Lo que Neo Arcade recuerda entre una sesión y otra, en datos-usuario.json de la carpeta de datos:
// favoritos, recientes (los últimos 50, con fecha), el último juego de cada sistema, el último sistema,
// el perfil y los ajustes. Es JSON con sangría para que una persona lo pueda leer y corregir.
//
// La interfaz es la dueña de estos datos y los manda completos cada vez que cambian; aquí se limpian
// (nada que no sea de la forma esperada se guarda) y se escriben juntando los cambios seguidos, porque
// al recorrer el carrusel la selección cambia varias veces por segundo.
import { readFile, rename, writeFile } from 'node:fs/promises';

export const MAX_RECIENTES = 50;

export const AJUSTES_INICIALES = Object.freeze({
  crt: true,
  neon: 'alto',
  animaciones: true,
  volumen: 70,
  tema: 'azul',
  salir: 'select-start',
});

const OPCIONES = {
  neon: ['alto', 'bajo'],
  tema: ['azul', 'magenta', 'violeta', 'naranja'],
  salir: ['select-start', 'mantener-start', 'lr-select-start'],
};
const PERFILES = ['normal'];

export const datosIniciales = () => ({
  version: 1,
  favoritos: [],
  recientes: [],
  ultimoPorSistema: {},
  ultimoSistema: 'todos',
  perfil: 'normal',
  ajustes: { ...AJUSTES_INICIALES },
});

const esId = (valor) => typeof valor === 'string' && valor.length > 0 && valor.length <= 1000;
const fechaValida = (valor) => typeof valor === 'string' && !Number.isNaN(Date.parse(valor));

export function limpiarDatos(datos) {
  const limpio = datosIniciales();
  if (!datos || typeof datos !== 'object') return limpio;
  if (Array.isArray(datos.favoritos)) limpio.favoritos = [...new Set(datos.favoritos.filter(esId))].slice(0, 10000);
  if (Array.isArray(datos.recientes)) {
    const vistos = new Set();
    limpio.recientes = datos.recientes
      .filter((reciente) => esId(reciente?.id) && fechaValida(reciente.fecha) && !vistos.has(reciente.id) && vistos.add(reciente.id))
      .map(({ id, fecha }) => ({ id, fecha }))
      .slice(0, MAX_RECIENTES);
  }
  if (datos.ultimoPorSistema && typeof datos.ultimoPorSistema === 'object') {
    for (const [sistema, id] of Object.entries(datos.ultimoPorSistema).slice(0, 100)) {
      if (esId(sistema) && sistema.length <= 40 && esId(id)) limpio.ultimoPorSistema[sistema] = id;
    }
  }
  if (esId(datos.ultimoSistema) && datos.ultimoSistema.length <= 40) limpio.ultimoSistema = datos.ultimoSistema;
  if (PERFILES.includes(datos.perfil)) limpio.perfil = datos.perfil;
  const ajustes = datos.ajustes ?? {};
  if (typeof ajustes.crt === 'boolean') limpio.ajustes.crt = ajustes.crt;
  if (typeof ajustes.animaciones === 'boolean') limpio.ajustes.animaciones = ajustes.animaciones;
  if (Number.isInteger(ajustes.volumen) && ajustes.volumen >= 0 && ajustes.volumen <= 100) limpio.ajustes.volumen = ajustes.volumen;
  for (const [clave, valores] of Object.entries(OPCIONES)) {
    if (valores.includes(ajustes[clave])) limpio.ajustes[clave] = ajustes[clave];
  }
  return limpio;
}

export function crearAlmacen(archivo, { esperaMs = 800 } = {}) {
  let pendiente = null;
  let temporizador = null;
  let escribiendo = Promise.resolve();

  async function escribir() {
    temporizador = null;
    if (!pendiente) return;
    const texto = `${JSON.stringify(pendiente, null, 2)}\n`;
    pendiente = null;
    // Se escribe aparte y se renombra: un corte de luz a la mitad no deja el archivo roto.
    escribiendo = escribiendo
      .then(() => writeFile(`${archivo}.nuevo`, texto))
      .then(() => rename(`${archivo}.nuevo`, archivo));
    await escribiendo;
  }

  return {
    async cargar() {
      try {
        return limpiarDatos(JSON.parse(await readFile(archivo, 'utf8')));
      } catch {
        return datosIniciales(); // sin archivo, o ilegible: se empieza de cero
      }
    },
    guardar(datos) {
      pendiente = limpiarDatos(datos);
      clearTimeout(temporizador);
      temporizador = setTimeout(escribir, esperaMs);
    },
    // Al cerrar la app no se espera: lo pendiente se escribe ya.
    async vaciar() {
      clearTimeout(temporizador);
      await escribir();
      await escribiendo;
    },
  };
}
