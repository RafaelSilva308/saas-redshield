import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Cabeçalho de página: título condensado em caixa alta + subtítulo cinza + ações. */
export function PageHeader({
  titulo,
  subtitulo,
  acoes,
}: {
  titulo: string
  subtitulo?: string
  acoes?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="rs-title text-[1.75rem] text-rs-ink sm:text-[2rem]">{titulo}</h1>
        {subtitulo && <p className="mt-1 max-w-2xl text-sm text-rs-gray-500">{subtitulo}</p>}
      </div>
      {/* No celular as ações ocupam a largura toda e dividem o espaço igualmente */}
      {acoes && (
        <div className="flex w-full flex-wrap items-center gap-2 [&>*]:flex-1 sm:w-auto sm:[&>*]:flex-none">
          {acoes}
        </div>
      )}
    </div>
  )
}

/** Barra de progresso linear simples, com rótulo textual obrigatório fora dela. */
export function Progress({
  valor,
  cor = 'var(--color-rs-blue-600)',
  altura = 'h-2',
  fundo = 'bg-rs-gray-200',
  className,
}: {
  valor: number
  cor?: string
  altura?: string
  fundo?: string
  className?: string
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(valor)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('w-full overflow-hidden rounded-full', altura, fundo, className)}
    >
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, valor))}%`, background: cor }} />
    </div>
  )
}

/** Anel de progresso — usado no cartão de progresso de faixas. */
export function ProgressRing({
  valor,
  tamanho = 132,
  espessura = 14,
  cor = 'var(--color-rs-blue-600)',
  centro,
}: {
  valor: number
  tamanho?: number
  espessura?: number
  cor?: string
  centro?: ReactNode
}) {
  const r = (tamanho - espessura) / 2
  const circ = 2 * Math.PI * r
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} className="-rotate-90">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="var(--color-rs-gray-200)" strokeWidth={espessura} />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r}
          fill="none"
          stroke={cor}
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (circ * Math.min(100, valor)) / 100}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{centro}</div>
    </div>
  )
}

/** Estado vazio: explica o que aconteceu e oferece o próximo passo. */
export function EmptyState({
  icone,
  titulo,
  mensagem,
  acao,
}: {
  icone?: ReactNode
  titulo: string
  mensagem: string
  acao?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icone && <span className="grid size-12 place-items-center rounded-full bg-rs-gray-100 text-rs-gray-500">{icone}</span>}
      <h3 className="rs-title text-lg text-rs-ink">{titulo}</h3>
      <p className="max-w-sm text-sm text-rs-gray-500">{mensagem}</p>
      {acao && <div className="mt-1">{acao}</div>}
    </div>
  )
}

/** Faixa de acento diagonal — reservada a momentos de destaque. */
export function AccentBanner({
  titulo,
  texto,
  acao,
  tom = 'azul',
}: {
  titulo: string
  texto: string
  acao?: ReactNode
  tom?: 'azul' | 'vermelho'
}) {
  return (
    <div
      className={cn(
        'rs-diagonal relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-lg px-6 py-5 text-white',
        tom === 'azul' ? 'bg-rs-blue-600' : 'bg-rs-red-600',
      )}
    >
      {/* geometria diagonal abstrata, como acento editorial */}
      <svg aria-hidden className="pointer-events-none absolute inset-y-0 right-0 h-full opacity-15" viewBox="0 0 240 120" preserveAspectRatio="none">
        <polygon points="120,0 240,0 180,120 60,120" fill="white" />
        <polygon points="200,0 240,0 240,120 140,120" fill="white" opacity="0.6" />
      </svg>
      <div className="relative min-w-0">
        <h2 className="rs-title text-xl">{titulo}</h2>
        <p className="mt-1 max-w-xl text-sm text-white/85">{texto}</p>
      </div>
      {acao && <div className="relative shrink-0">{acao}</div>}
    </div>
  )
}

/** Grupo de abas controlado. */
export function Tabs<T extends string>({
  valor,
  aoMudar,
  itens,
}: {
  valor: T
  aoMudar: (v: T) => void
  itens: { id: T; label: string; contagem?: number }[]
}) {
  const lista = useRef<HTMLDivElement>(null)

  // No celular as abas podem não caber: a ativa sempre fica à vista (rolagem lateral).
  useEffect(() => {
    const el = lista.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    const box = lista.current
    if (!el || !box || box.scrollWidth <= box.clientWidth) return
    box.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' })
  }, [valor])

  return (
    <div
      ref={lista}
      role="tablist"
      className="-mx-1 flex snap-x gap-0.5 overflow-x-auto border-b border-rs-gray-200 px-1 [scrollbar-width:none] sm:gap-1 [&::-webkit-scrollbar]:hidden"
    >
      {itens.map((it) => {
        const ativo = it.id === valor
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={ativo}
            onClick={() => aoMudar(it.id)}
            className={cn(
              '-mb-px shrink-0 cursor-pointer snap-start whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors sm:px-4 sm:py-2.5',
              ativo
                ? 'border-rs-red-600 text-rs-ink'
                : 'border-transparent text-rs-gray-500 hover:border-rs-gray-300 hover:text-rs-ink',
            )}
          >
            {it.label}
            {it.contagem !== undefined && (
              <span className={cn('ml-1.5 text-xs', ativo ? 'text-rs-gray-500' : 'text-rs-gray-500/80')}>
                {it.contagem}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
