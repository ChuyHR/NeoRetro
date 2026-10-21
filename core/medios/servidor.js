// Sirve a la interfaz los medios de los juegos por el protocolo medio://. medio://medios/… es la carpeta
// de medios y medio://roms/…, la de juegos (Skraper puede dejar ahí sus medios). Nada fuera de esas
// dos carpetas sale por aquí. Acepta pedidos por rangos, que es como el navegador lee un vídeo para
// reproducirlo y volver a empezarlo.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

const TIPOS = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska', '.ogv': 'video/ogg', '.mov': 'video/quicktime',
};

export function rutaDeDireccion(direccion, { carpetaMedios, carpetaRoms }) {
  const url = new URL(direccion);
  const raiz = { medios: carpetaMedios, roms: carpetaRoms }[url.hostname];
  if (!raiz) return null;
  const partes = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const ruta = path.join(raiz, ...partes);
  return ruta.startsWith(raiz + path.sep) ? ruta : null;
}

export function crearServidorDeMedios(carpetas) {
  return async function servir(pedido) {
    const ruta = rutaDeDireccion(pedido.url, carpetas);
    const tipo = ruta && TIPOS[path.extname(ruta).toLowerCase()];
    if (!tipo) return new Response(null, { status: 404 });
    let tamano;
    try {
      const datos = await stat(ruta);
      if (!datos.isFile()) return new Response(null, { status: 404 });
      tamano = datos.size;
    } catch {
      return new Response(null, { status: 404 });
    }
    const rango = /^bytes=(\d*)-(\d*)$/.exec(pedido.headers.get('range') ?? '');
    if (!rango) {
      return new Response(Readable.toWeb(createReadStream(ruta)), {
        headers: { 'content-type': tipo, 'content-length': String(tamano), 'accept-ranges': 'bytes' },
      });
    }
    const inicio = rango[1] ? Number(rango[1]) : Math.max(0, tamano - Number(rango[2]));
    const fin = rango[1] && rango[2] ? Math.min(Number(rango[2]), tamano - 1) : tamano - 1;
    if (inicio > fin || inicio >= tamano) {
      return new Response(null, { status: 416, headers: { 'content-range': `bytes */${tamano}` } });
    }
    return new Response(Readable.toWeb(createReadStream(ruta, { start: inicio, end: fin })), {
      status: 206,
      headers: {
        'content-type': tipo,
        'content-length': String(fin - inicio + 1),
        'content-range': `bytes ${inicio}-${fin}/${tamano}`,
        'accept-ranges': 'bytes',
      },
    });
  };
}
