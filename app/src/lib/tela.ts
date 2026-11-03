import { useSyncExternalStore } from 'react'

const CONSULTA = '(max-width: 639px)'

function assinar(aoMudar: () => void) {
  const mq = window.matchMedia(CONSULTA)
  mq.addEventListener('change', aoMudar)
  return () => mq.removeEventListener('change', aoMudar)
}

/** Verdadeiro em tela de celular (abaixo do breakpoint `sm` do Tailwind, 640px). Para o que o CSS sozinho não resolve, como os eixos dos gráficos. */
export function useCelular(): boolean {
  return useSyncExternalStore(
    assinar,
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  )
}
