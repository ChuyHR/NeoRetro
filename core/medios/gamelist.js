// Lee un gamelist.xml de EmulationStation, el formato que genera Skraper. Basta la parte plana del
// formato: cada <game> trae etiquetas de texto (path, name, desc, image…) sin anidar. Así no hace falta
// una biblioteca de XML.

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodificar(texto) {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entera, nombre) => {
    if (nombre[0] !== '#') return ENTIDADES[nombre.toLowerCase()] ?? entera;
    const codigo = nombre[1].toLowerCase() === 'x' ? parseInt(nombre.slice(2), 16) : parseInt(nombre.slice(1), 10);
    return Number.isFinite(codigo) ? String.fromCodePoint(codigo) : entera;
  });
}

// El texto de una etiqueta: lo que va en CDATA se toma tal cual; lo demás, con sus entidades resueltas.
function textoDe(contenido) {
  const cdata = contenido.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return (cdata ? cdata[1] : decodificar(contenido)).trim();
}

export function leerGamelist(xml) {
  const juegos = [];
  for (const [, cuerpo] of xml.matchAll(/<game\b[^>]*>([\s\S]*?)<\/game>/g)) {
    const juego = {};
    for (const [, etiqueta, contenido] of cuerpo.matchAll(/<([a-zA-Z]+)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      juego[etiqueta] = textoDe(contenido);
    }
    if (juego.path) juegos.push(juego);
  }
  return juegos;
}

// Ruta de un juego como la escribe el gamelist («./Mario.sfc», «.\\Mario.sfc» o absoluta), llevada a la
// forma del escáner: relativa a la carpeta del sistema, con «/». Una ruta absoluta se corta después de
// la última aparición de la carpeta del sistema.
export function rutaRelativa(ruta, carpetaSistema) {
  let limpia = ruta.replaceAll('\\', '/');
  const marca = `/${carpetaSistema}/`;
  if (limpia.startsWith('/') && limpia.includes(marca)) limpia = limpia.slice(limpia.lastIndexOf(marca) + marca.length);
  return limpia.replace(/^(\.\/)+/, '').replace(/\/{2,}/g, '/');
}

// «19910815T000000» → 1991. Sin año reconocible, null.
export function anioDe(fecha) {
  const anio = /^(\d{4})/.exec(fecha ?? '')?.[1];
  return anio && anio !== '0000' ? Number(anio) : null;
}
