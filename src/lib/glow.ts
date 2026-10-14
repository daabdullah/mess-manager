// Makes glass cards light up under your finger or pointer.
// It only stores where the pointer is (--mx, --my); the glow itself is drawn by CSS (.surface::before).
export function initLiquidGlow() {
  const move = (e: PointerEvent) => {
    const card = (e.target as Element | null)?.closest<HTMLElement>('.surface')
    if (!card) return
    const box = card.getBoundingClientRect()
    card.style.setProperty('--mx', `${e.clientX - box.left}px`)
    card.style.setProperty('--my', `${e.clientY - box.top}px`)
  }
  window.addEventListener('pointermove', move, { passive: true })
  window.addEventListener('pointerdown', move, { passive: true })
}
