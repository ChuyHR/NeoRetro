// Convierte los sucesos crudos de un mando (botón o eje, con su código de Linux) en controles con
// nombre ('a', 'izquierda', 'lt'…) que se pulsan y se sueltan. Funciones puras: se prueban sin mando.
//
// Un perfil dice qué control es cada código: { botones: { 304: 'a' }, ejes: { 16: ['izquierda', 'derecha'] } }.
// Un eje con dos controles es de dos lados (palanca, cruceta); con [null, 'lt'] es de un solo lado
// (gatillo), y cuenta desde su mínimo.

const BTN_SOUTH = 304;

// Los mandos que tienen BTN_SOUTH siguen la norma de Linux para mandos y usan el perfil estándar;
// los demás (palancas, tableros de arcade) se configuran una vez en Ajustes.
export const sigueLaNorma = (mando) => mando.botones?.includes(BTN_SOUTH) ?? false;

// Identifica al modelo de mando, no al aparato: dos mandos iguales comparten su mapeo.
export const claveDeMando = ({ vendor, producto, nombre }) => `${vendor || '0000'}:${producto || '0000'}:${nombre}`;

// Valor de un eje en -1…1 (dos lados) o 0…1 (un lado), con el rango que reporta el propio mando.
export function normalizar(valor, [minimo, maximo] = [-32768, 32767], dosLados = true) {
  if (maximo <= minimo) return 0;
  if (!dosLados) return Math.min(1, Math.max(0, (valor - minimo) / (maximo - minimo)));
  const centro = (minimo + maximo) / 2;
  return Math.min(1, Math.max(-1, (valor - centro) / ((maximo - minimo) / 2)));
}

// Controles con nombre que puede tener un perfil. Un mapeo que llega de la interfaz se limpia contra
// esta lista antes de guardarse: solo códigos numéricos y nombres conocidos.
export const CONTROLES = ['arriba', 'abajo', 'izquierda', 'derecha', 'a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'view', 'menu', 'guia', 'l3', 'r3'];

export function limpiarPerfil(perfil) {
  const valido = (control) => (CONTROLES.includes(control) ? control : null);
  const codigo = (texto) => /^\d{1,4}$/.test(texto);
  const botones = Object.fromEntries(Object.entries(perfil?.botones ?? {})
    .filter(([clave, control]) => codigo(clave) && valido(control)));
  const ejes = Object.fromEntries(Object.entries(perfil?.ejes ?? {})
    .filter(([clave, par]) => codigo(clave) && Array.isArray(par) && par.length === 2)
    .map(([clave, [negativo, positivo]]) => [clave, [valido(negativo), valido(positivo)]])
    .filter(([, par]) => par.some(Boolean)));
  return { botones, ejes };
}

export function crearTraductor(perfil, rangos = {}, umbral = { pulsar: 0.5, soltar: 0.35 }) {
  const activos = new Map(); // código de eje → control que tiene pulsado

  return function traducir({ tipo, codigo, valor }) {
    if (tipo === 'boton') {
      const control = perfil.botones?.[codigo];
      return control ? [{ control, pulsado: valor === 1 }] : [];
    }
    if (tipo !== 'eje') return [];
    const par = perfil.ejes?.[codigo];
    if (!par) return [];
    const [negativo, positivo] = par;
    const dosLados = Boolean(negativo && positivo);
    const v = normalizar(valor, rangos[codigo], dosLados);
    const anterior = activos.get(codigo) ?? null;
    // Para soltar hace falta bajar del umbral de soltar, no solo del de pulsar: sin ese margen, una
    // palanca justo en el borde pulsaría y soltaría sin parar.
    let ahora = null;
    if (positivo && (v >= umbral.pulsar || (anterior === positivo && v >= umbral.soltar))) ahora = positivo;
    else if (negativo && (v <= -umbral.pulsar || (anterior === negativo && v <= -umbral.soltar))) ahora = negativo;
    if (ahora === anterior) return [];
    activos.set(codigo, ahora);
    const cambios = [];
    if (anterior) cambios.push({ control: anterior, pulsado: false });
    if (ahora) cambios.push({ control: ahora, pulsado: true });
    return cambios;
  };
}
