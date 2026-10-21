// «Configurar control»: los pasos y cómo se asigna a cada uno el botón o el eje que la persona mueve.
// Funciones puras, como estado.js. El resultado tiene la forma de un perfil de core/entrada/traductor.js:
// { botones: { 288: 'a' }, ejes: { 1: ['arriba', 'abajo'] } }.

// [control, lo que se le pide a la persona, si se puede saltar]. Sin las cuatro direcciones, aceptar y
// volver no se puede usar Neo Arcade; lo demás puede no existir en una palanca sencilla.
export const PASOS_MAPEO = [
  ['arriba', 'ARRIBA', false],
  ['abajo', 'ABAJO', false],
  ['izquierda', 'IZQUIERDA', false],
  ['derecha', 'DERECHA', false],
  ['a', 'ACEPTAR (A)', false],
  ['b', 'VOLVER (B)', false],
  ['x', 'FAVORITO (X)', true],
  ['y', 'BUSCAR (Y)', true],
  ['lb', 'SISTEMA ANTERIOR (LB)', true],
  ['rb', 'SISTEMA SIGUIENTE (RB)', true],
  ['lt', 'LETRA ANTERIOR (LT)', true],
  ['rt', 'LETRA SIGUIENTE (RT)', true],
  ['view', 'FILTRO (SELECT O MONEDA)', true],
  ['menu', 'MENÚ (START)', true],
];

const MOVIMIENTO = 0.6; // cuánto tiene que moverse un eje desde su reposo para contar
const EXTREMO = 0.8; // un eje que reposa más allá de esto es un gatillo (de un solo lado)

export function nuevoMapeo({ clave, nombre }) {
  return { clave, nombre, paso: 0, perfil: { botones: {}, ejes: {} } };
}

export const mapeoTerminado = (mapeo) => mapeo.paso >= PASOS_MAPEO.length;

// Un suceso crudo cuenta si es un botón que se pulsa o un eje que se aleja bastante de su reposo.
export function esMovimiento(crudo) {
  if (crudo.tipo === 'boton') return crudo.valor === 1;
  return crudo.tipo === 'eje' && Math.abs(crudo.normalizado - (crudo.reposo ?? 0)) >= MOVIMIENTO;
}

// Asigna el suceso al paso actual y avanza. Un botón o un lado de eje que ya tiene control no se
// reasigna: así, soltar o repetir un botón no se come el paso siguiente.
export function asignar(mapeo, crudo) {
  if (mapeoTerminado(mapeo) || crudo.mando !== mapeo.clave || !esMovimiento(crudo)) return mapeo;
  const [control] = PASOS_MAPEO[mapeo.paso];
  const { botones, ejes } = mapeo.perfil;
  const codigo = String(crudo.codigo);
  if (crudo.tipo === 'boton') {
    if (botones[codigo]) return mapeo;
    return avanzar(mapeo, { botones: { ...botones, [codigo]: control }, ejes });
  }
  const reposo = crudo.reposo ?? 0;
  const par = ejes[codigo] ?? [null, null];
  const lado = Math.abs(reposo) >= EXTREMO ? 1 : (crudo.normalizado > reposo ? 1 : 0);
  if (par[lado]) return mapeo;
  // Un gatillo solo tiene el lado positivo; una palanca, uno por dirección.
  const nuevo = Math.abs(reposo) >= EXTREMO ? [null, control] : par.map((actual, indice) => (indice === lado ? control : actual));
  return avanzar(mapeo, { botones, ejes: { ...ejes, [codigo]: nuevo } });
}

export function omitir(mapeo) {
  if (mapeoTerminado(mapeo) || !PASOS_MAPEO[mapeo.paso][2]) return mapeo;
  return { ...mapeo, paso: mapeo.paso + 1 };
}

function avanzar(mapeo, perfil) {
  return { ...mapeo, perfil, paso: mapeo.paso + 1 };
}
