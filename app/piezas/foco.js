// Foco visible en los botones de las ventanas. El prototipo no lo definía (se usaba con ratón); se toma
// el brillo azul del menú de acciones para no inventar un estilo nuevo.
export const BRILLO_FOCO = '0 0 22px color-mix(in srgb, var(--acento) 66.67%, transparent)';

// Botones que alternan entre el aspecto principal y el secundario del prototipo según tengan el foco.
export function marcarFocoAlterno(boton, enfocado) {
  Object.assign(boton.style, {
    borderColor: enfocado ? 'var(--acento)' : '#2A3B70',
    background: enfocado ? '#0B2350' : '#0E1730',
    boxShadow: enfocado ? BRILLO_FOCO : 'none',
  });
}

// Botones que conservan su aspecto y solo ganan el brillo cuando tienen el foco.
export function marcarFoco(boton, enfocado) {
  boton.style.boxShadow = enfocado ? BRILLO_FOCO : 'none';
}
