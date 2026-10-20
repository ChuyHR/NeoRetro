// Portada de reemplazo del prototipo: un fondo de degradados CSS hecho con los tres colores del juego y
// un motivo. La fase 5 la usa cuando falta la carátula real.

export function fondoPortada({ colores: [a, b, c], motivo }) {
  switch (motivo) {
    case 'rays':
      return `repeating-conic-gradient(from 0deg at 50% 55%, ${a} 0deg 12deg, ${c} 12deg 24deg)`;
    case 'grid':
      return `linear-gradient(${b}55 2px, transparent 2px) 0 0/100% 26px, linear-gradient(90deg, ${b}55 2px, transparent 2px) 0 0/26px 100%, radial-gradient(circle at 50% 35%, ${a} 0 24%, ${c} 25%)`;
    case 'circles':
      return `repeating-radial-gradient(circle at 60% 38%, ${a} 0 10px, ${c} 10px 20px, ${b} 20px 24px, ${c} 24px 34px)`;
    case 'stripes':
      return `repeating-linear-gradient(115deg, ${a} 0 14px, ${c} 14px 30px, ${b}99 30px 36px, ${c} 36px 50px)`;
    case 'diamond':
      return `repeating-conic-gradient(from 45deg at 50% 50%, ${a} 0 25%, ${c} 0 50%) 0 0/44px 44px`;
    default: // zigzag
      return `linear-gradient(135deg, ${a} 25%, transparent 25%) -22px 0/44px 44px, linear-gradient(225deg, ${a} 25%, transparent 25%) -22px 0/44px 44px, linear-gradient(315deg, ${b}88 25%, transparent 25%) 0 0/44px 44px, linear-gradient(45deg, ${b}88 25%, transparent 25%) 0 0/44px 44px, ${c}`;
  }
}
