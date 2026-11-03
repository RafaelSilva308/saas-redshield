import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Métrica: número grande, label pequena, variação discreta, ícone funcional. */
export function StatCard({
  label,
  valor,
  sufixo,
  nota,
  variacao,
  icone,
  destaque,
  para,
  className,
}: {
  label: string
  valor: string | number
  sufixo?: string
  nota?: string
  variacao?: number
  icone?: ReactNode
  /** `destaque` pinta o card de vermelho — reservado para 1 ação de conversão por tela. */
  destaque?: boolean
  para?: string
  className?: string
}) {
  const positiva = (variacao ?? 0) >= 0
  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className={cn('rs-label', destaque && 'text-white/75')}>{label}</p>
        {icone && (
          <span
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-md sm:size-9',
              destaque ? 'bg-white/15 text-white' : 'bg-rs-blue-50 text-rs-blue-600',
            )}
          >
            {icone}
          </span>
        )}
      </div>

      <p className={cn('rs-metric mt-2 text-[1.75rem] sm:mt-3 sm:text-[2.5rem]', destaque ? 'text-white' : 'text-rs-ink')}>
        {valor}
        {sufixo && <span className="text-xl sm:text-2xl">{sufixo}</span>}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {variacao !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-semibold',
              destaque ? 'text-white' : positiva ? 'text-rs-success' : 'text-rs-red-600',
            )}
          >
            {positiva ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {positiva ? '+' : ''}
            {variacao.toFixed(0)}%
          </span>
        )}
        {nota && <span className={cn('text-xs', destaque ? 'text-white/80' : 'text-rs-gray-500')}>{nota}</span>}
      </div>
    </>
  )

  const classe = cn(
    'block min-w-0 rounded-lg border p-4 shadow-[var(--shadow-card)] transition-shadow sm:p-5',
    destaque ? 'border-transparent bg-rs-red-600' : 'border-rs-gray-200 bg-white',
    para && 'hover:shadow-[0_4px_14px_rgba(17,17,17,0.10)]',
    className,
  )

  if (para) {
    return (
      <Link to={para} className={cn(classe, 'group')}>
        {conteudo}
        <span
          className={cn(
            'mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider',
            destaque ? 'text-white' : 'text-rs-blue-600',
          )}
        >
          Ver detalhes
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    )
  }

  return <div className={classe}>{conteudo}</div>
}
