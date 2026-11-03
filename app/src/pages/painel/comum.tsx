import { Link } from 'react-router-dom'
import { CalendarPlus } from 'lucide-react'
import type { ProximaAula } from '@/api/metricas'
import { DIAS_SEMANA } from '@/lib/format'
import { cn } from '@/lib/cn'

/* Pedaços usados pelo painel da equipe e pelo do aluno. */

/* Tooltip próprio — o padrão do Recharts não segue a tipografia do sistema. */
export function DicaGrafico({ active, payload, label, formatador }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-rs-gray-200 bg-white px-3 py-2 shadow-[var(--shadow-pop)]">
      <p className="rs-label mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-sm">
          <span aria-hidden className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-rs-gray-500">{p.name}</span>
          <span className="ml-auto font-semibold text-rs-ink">{formatador ? formatador(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

/** Único bloco vermelho do painel: a próxima aula. */
export function BlocoProximaAula({ proxima, className }: { proxima: ProximaAula | null; className?: string }) {
  return (
    <div
      className={cn(
        'rs-diagonal relative flex flex-col justify-between overflow-hidden rounded-lg bg-rs-red-600 p-4 text-white sm:p-5',
        className,
      )}
    >
      <div className="relative">
        <p className="rs-label text-white/75">Próxima aula</p>
        {proxima ? (
          <>
            <p className="rs-title mt-3 text-2xl">
              {proxima.hoje ? 'Hoje' : DIAS_SEMANA[new Date(proxima.data + 'T12:00:00').getDay()]}, {proxima.inicio}
            </p>
            <p className="mt-1 text-sm text-white/85">{proxima.titulo}</p>
            <p className="text-xs text-white/70">
              {proxima.turma} · {proxima.local}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-white/85">Nenhuma aula programada.</p>
        )}
      </div>
      <Link
        to="/agenda"
        className="relative mt-4 inline-flex h-11 items-center sm:h-10 justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-rs-red-600 transition-colors hover:bg-white/90"
      >
        <CalendarPlus className="size-4" />
        Ver agenda
      </Link>
    </div>
  )
}
