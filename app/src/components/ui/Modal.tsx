import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

/** Painel modal com trava de rolagem, foco inicial e fechamento por Esc. */
export function Modal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  largura = 'md',
  rodape,
  children,
}: {
  aberto: boolean
  aoFechar: () => void
  titulo: string
  descricao?: string
  largura?: 'sm' | 'md' | 'lg'
  rodape?: ReactNode
  children: ReactNode
}) {
  const painel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    document.addEventListener('keydown', onKey)
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    painel.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflowAnterior
    }
  }, [aberto, aoFechar])

  if (!aberto) return null

  const larguras = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-rs-ink/45 backdrop-blur-[2px]" onClick={aoFechar} aria-hidden />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex max-h-[92vh] max-h-[92dvh] w-full flex-col rounded-t-xl bg-white shadow-[var(--shadow-pop)] sm:rounded-lg',
          larguras[largura],
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-rs-gray-200 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="rs-title text-xl text-rs-ink">{titulo}</h2>
            {descricao && <p className="mt-1 text-sm text-rs-gray-500">{descricao}</p>}
          </div>
          <button
            onClick={aoFechar}
            aria-label="Fechar"
            className="-mr-2 grid size-10 shrink-0 cursor-pointer place-items-center rounded-md text-rs-gray-500 hover:bg-rs-gray-100 hover:text-rs-ink"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">{children}</div>

        {rodape && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-rs-gray-200 bg-rs-gray-50 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-4">
            {rodape}
          </footer>
        )}
      </div>
    </div>
  )
}

/** Confirmação destrutiva — texto explícito, ação em vermelho de contorno. */
export function ConfirmDialog({
  aberto,
  aoFechar,
  aoConfirmar,
  titulo,
  mensagem,
  rotuloConfirmar = 'Confirmar',
}: {
  aberto: boolean
  aoFechar: () => void
  aoConfirmar: () => void
  titulo: string
  mensagem: string
  rotuloConfirmar?: string
}) {
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={titulo}
      largura="sm"
      rodape={
        <>
          <Button variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            variante="perigo"
            onClick={() => {
              aoConfirmar()
              aoFechar()
            }}
          >
            {rotuloConfirmar}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-rs-gray-700">{mensagem}</p>
    </Modal>
  )
}
