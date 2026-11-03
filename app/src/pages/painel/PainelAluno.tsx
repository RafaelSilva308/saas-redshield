import { CalendarCheck, CalendarDays, CreditCard, TrendingUp } from 'lucide-react'
import { Carregando, EmptyState, ErroCarga, PageHeader } from '@/components/ui/Misc'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge, FaixaBadge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { useAuth } from '@/app/auth'
import { usePainelAluno } from '@/api/metricas'
import { useMinhasPresencas } from '@/api/presenca'
import { mensagemDeErro } from '@/lib/api'
import { STATUS_PAGAMENTO, dataCurta, primeiroNome } from '@/lib/format'
import { BlocoProximaAula } from './comum'

/* Painel do aluno: só os dados dele (defeito 8). Nada de totais da academia, nomes de outros alunos,
   busca de aluno ou links para telas que ele não abre. A API já responde só com os dados dele. */

const SITUACAO = {
  presente: { label: 'Presente', tom: 'ok' },
  justificado: { label: 'Justificado', tom: 'alerta' },
  ausente: { label: 'Falta', tom: 'neutro' },
  sem_checkin: { label: 'Falta · sem check-in', tom: 'neutro' },
} as const

export function PainelAluno() {
  const { usuario } = useAuth()
  const painel = usePainelAluno()
  const presencas = useMinhasPresencas(30)

  if (painel.isError)
    return <ErroCarga mensagem={mensagemDeErro(painel.error)} aoTentarDeNovo={() => painel.refetch()} />
  if (painel.isPending) return <Carregando />

  const p = painel.data
  const pag = STATUS_PAGAMENTO[p.statusPagamento]
  const ultimos = presencas.data ?? []
  const presentes30 = ultimos.filter((h) => h.situacao === 'presente').length

  return (
    <>
      <PageHeader
        titulo="Painel"
        subtitulo={`Bom treino, ${primeiroNome(usuario?.nome)}. Aqui está o seu resumo.`}
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
          valor={Math.round(p.frequencia30d)}
          sufixo="%"
          icone={<TrendingUp className="size-5" />}
          nota={`${presentes30} presença${presentes30 === 1 ? '' : 's'} em ${ultimos.length} aula${ultimos.length === 1 ? '' : 's'}`}
          para="/progresso"
        />
        <StatCard
          label="Treinos registrados"
          valor={p.presencasTotal}
          icone={<CalendarDays className="size-5" />}
          nota="Desde a matrícula"
          para="/progresso"
        />
        <div className="col-span-2 flex flex-col justify-between rounded-lg border border-rs-gray-200 bg-white p-4 shadow-[var(--shadow-card)] sm:col-span-1 sm:p-5">
          <p className="rs-label">Sua faixa</p>
          <p className="mt-3">
            <FaixaBadge faixa={p.aluno.faixa} graus={p.aluno.graus} />
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm text-rs-gray-500">
            <CreditCard className="size-4" /> Mensalidade: <Badge tom={pag.tom}>{pag.label}</Badge>
          </p>
        </div>
        <BlocoProximaAula proxima={p.proximaAula} className="col-span-2 sm:col-span-1" />
      </div>

      <Card className="mt-4">
        <CardHeader
          titulo="Seus últimos treinos"
          descricao="Aulas das suas turmas nos últimos 30 dias"
          linkPara="/checkin"
        />
        {presencas.isError ? (
          <ErroCarga mensagem={mensagemDeErro(presencas.error)} aoTentarDeNovo={() => presencas.refetch()} />
        ) : presencas.isPending ? (
          <Carregando />
        ) : ultimos.length === 0 ? (
          <CardBody>
            <EmptyState
              icone={<CalendarDays className="size-6" />}
              titulo="Nenhuma aula ainda"
              mensagem="Quando você estiver em uma turma, suas aulas e presenças aparecem aqui."
            />
          </CardBody>
        ) : (
          <ul className="divide-y divide-rs-gray-200">
            {ultimos.slice(0, 8).map((h) => (
              <li key={`${h.data}-${h.aulaId}`} className="flex items-center gap-4 px-5 py-3">
                <span className="w-16 shrink-0 text-xs font-semibold text-rs-gray-500">{dataCurta(h.data)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-rs-ink">{h.titulo}</span>
                  <span className="block text-xs text-rs-gray-500">{h.inicio}</span>
                </span>
                <Badge tom={SITUACAO[h.situacao].tom}>{SITUACAO[h.situacao].label}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
