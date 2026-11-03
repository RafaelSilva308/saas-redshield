import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, CalendarDays, CalendarPlus, CreditCard, Lock, TrendingUp } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/ui/Misc'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge, FaixaBadge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { useAuth } from '@/app/auth'
import { useStore } from '@/app/store'
import { turmaPorId } from '@/data/mock'
import { alunoNaAula, proximaAula } from '@/data/selectors'
import { DIAS_SEMANA, STATUS_PAGAMENTO, dataCurta } from '@/lib/format'
import type { StatusPresenca } from '@/types'

/* Painel do aluno: só os dados dele (defeito 8). Nada de totais da academia, nomes de outros alunos
   ou links para telas que ele não abre. Mesmo desenho do painel do aluno do sistema real. */

const SITUACAO: Record<StatusPresenca, { label: string; tom: 'ok' | 'alerta' | 'neutro' }> = {
  presente: { label: 'Presente', tom: 'ok' },
  justificado: { label: 'Justificado', tom: 'alerta' },
  ausente: { label: 'Falta', tom: 'neutro' },
}

export function PainelAluno() {
  const { usuario } = useAuth()
  const { alunos, aulas, chamadas } = useStore()
  const aluno = alunos.find((a) => a.id === usuario?.alunoId)

  const historico = useMemo(() => {
    if (!aluno) return []
    return chamadas
      .flatMap((c) => {
        const r = c.registros.find((x) => x.alunoId === aluno.id)
        const aula = aulas.find((a) => a.id === c.aulaId)
        return r && aula ? [{ data: c.data, aula, status: r.status }] : []
      })
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [aluno, aulas, chamadas])

  const primeiroNome = (usuario?.nome ?? '').split(' ')[0]

  if (!aluno) {
    return (
      <>
        <PageHeader titulo="Painel" subtitulo={`Bom treino, ${primeiroNome}.`} />
        <Card>
          <EmptyState
            icone={<Lock className="size-6" />}
            titulo="Seu acesso ainda não está ligado a um aluno"
            mensagem="Peça à academia para vincular o seu login à sua ficha de aluno."
          />
        </Card>
      </>
    )
  }

  const pag = STATUS_PAGAMENTO[aluno.statusPagamento]
  const proxima = proximaAula((a) => alunoNaAula(aluno, a))
  const presentes = historico.filter((h) => h.status === 'presente').length

  return (
    <>
      <PageHeader
        titulo="Painel"
        subtitulo={`Bom treino, ${primeiroNome}. Aqui está o seu resumo.`}
        acoes={
          <ButtonLink to="/checkin" variante="primaria">
            <CalendarCheck className="size-4" />
            Fazer check-in
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Sua frequência (30 dias)"
          valor={Math.round(aluno.frequencia30d)}
          sufixo="%"
          icone={<TrendingUp className="size-5" />}
          nota="Presenças sobre as aulas das suas turmas"
          para="/progresso"
        />
        <StatCard
          label="Treinos registrados"
          valor={presentes}
          icone={<CalendarDays className="size-5" />}
          nota="Presenças no histórico"
          para="/progresso"
        />
        <div className="col-span-2 flex flex-col justify-between rounded-lg border border-rs-gray-200 bg-white p-4 shadow-[var(--shadow-card)] sm:col-span-1 sm:p-5">
          <p className="rs-label">Sua faixa</p>
          <p className="mt-3">
            <FaixaBadge faixa={aluno.faixa} graus={aluno.graus} />
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm text-rs-gray-500">
            <CreditCard className="size-4" /> Mensalidade: <Badge tom={pag.tom}>{pag.label}</Badge>
          </p>
        </div>

        {/* Único bloco vermelho do painel: a próxima aula das turmas do aluno */}
        <div className="rs-diagonal relative col-span-2 flex flex-col justify-between overflow-hidden rounded-lg bg-rs-red-600 p-4 text-white sm:col-span-1 sm:p-5">
          <div className="relative">
            <p className="rs-label text-white/75">Sua próxima aula</p>
            {proxima ? (
              <>
                <p className="rs-title mt-3 text-2xl">
                  {proxima.hoje ? 'Hoje' : DIAS_SEMANA[proxima.quando.getDay()]}, {proxima.aula.inicio}
                </p>
                <p className="mt-1 text-sm text-white/85">{proxima.aula.titulo}</p>
                <p className="text-xs text-white/70">
                  {turmaPorId(proxima.aula.turmaId)?.nome} · {proxima.aula.local}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-white/85">Nenhuma aula programada para as suas turmas.</p>
            )}
          </div>
          <Link
            to="/agenda"
            className="relative mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-rs-red-600 transition-colors hover:bg-white/90 sm:h-10"
          >
            <CalendarPlus className="size-4" />
            Ver agenda
          </Link>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader titulo="Seus últimos treinos" descricao="Aulas em que você tem registro" linkPara="/checkin" />
        {historico.length === 0 ? (
          <CardBody>
            <EmptyState
              icone={<CalendarDays className="size-6" />}
              titulo="Nenhum treino registrado"
              mensagem="Faça o check-in nas suas aulas: as presenças aparecem aqui."
            />
          </CardBody>
        ) : (
          <ul className="divide-y divide-rs-gray-200">
            {historico.slice(0, 8).map((h) => (
              <li key={`${h.data}-${h.aula.id}`} className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
                <span className="w-14 shrink-0 text-xs font-semibold text-rs-gray-500 sm:w-16">{dataCurta(h.data)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-rs-ink">{h.aula.titulo}</span>
                  <span className="block text-xs text-rs-gray-500">{h.aula.inicio}</span>
                </span>
                <Badge tom={SITUACAO[h.status].tom}>{SITUACAO[h.status].label}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
