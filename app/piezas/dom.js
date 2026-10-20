// Crea nodos a partir del marcado del prototipo, que cada pieza conserva con sus estilos originales.
export function desdeHtml(html) {
  const plantilla = document.createElement('template');
  plantilla.innerHTML = html.trim();
  return plantilla.content;
}

// Agrega el marcado al lienzo y devuelve los elementos marcados con data-ref, por nombre.
export function montar(lienzo, html) {
  const fragmento = desdeHtml(html);
  const refs = {};
  for (const elemento of fragmento.querySelectorAll('[data-ref]')) refs[elemento.dataset.ref] = elemento;
  lienzo.append(fragmento);
  return refs;
}
