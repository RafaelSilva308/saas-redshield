import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, CreditCard, Mail, Pencil, Phone, TrendingUp, User } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, FaixaBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState, Progress, Tabs } from '@/components/ui/Misc'
import { FormularioAluno } from './alunos/FormularioAluno'
import { useStore } from '@/app/store'
import { aulaPorId, turmaPorId } from '@/data/mock'
import { FAIXAS, STATUS_ALUNO, STATUS_PAGAMENTO, brl, dataCurta, dataLonga, idade } from '@/lib/format'
import type { Faixa } from '@/types'

const ORDEM_FAIXAS: Faixa[] = ['branca', 'azul', 'roxa', 'marrom', 'preta']

export function AlunoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { alunos, planos, chamadas, transacoes } = useStore()
  const [aba, setAba] = useState<'resumo' | 'presenca' | 'financeiro'>('resumo')
  const [editando, setEditando] = useState(false)

  const aluno = alunos.find((a) => a.id === id)

  const historico = useMemo(() => {
    if (!aluno) return []
    return chamadas
      .filter((c) => c.registros.some((r) => r.alunoId === aluno.id))
      .map((c) => ({
        data: c.data,
        aula: aulaPorId(c.aulaId),
        status: c.registros.find((r) => r.alunoId === aluno.id)!.status,
        origem: c.registros.find((r) => r.alunoId === aluno.id)!.origem,
        horario: c.registros.find((r) => r.alunoId === aluno.id)!.horario,
      }))
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 30)
  }, [aluno, chamadas])

  const pagamentos = useMemo(
    () => (aluno ? transacoes.filter((t) => t.alunoId === aluno.id).slice(0, 12) : []),
    [aluno, transacoes],
  )

  if (!aluno) {
    return (
      <Card>
        <EmptyState
          icone={<User className="size-6" />}
          titulo="Aluno não encontrado"
          mensagem="Esse cadastro pode ter sido removido ou o endereço está incorreto."
          acao={
            <Button variante="secundaria" onClick={() => navigate('/alunos')}>
              Voltar para a lista
            </Button>
          }
        />
      </Card>
    )
  }

  const plano = planos.find((p) => p.id === aluno.planoId)
  const pag = STATUS_PAGAMENTO[aluno.statusPagamento]
  const idxFaixa = ORDEM_FAIXAS.indexOf(aluno.faixa)
  const proximaFaixa = idxFaixa >= 0 && idxFaixa < ORDEM_FAIXAS.length - 1 ? ORDEM_FAIXAS[idxFaixa + 1] : null
  const progressoGraduacao = Math.min(100, (aluno.graus / 4) * 100)
  const presentes = historico.filter((h) => h.status === 'presente').length

  return (
    <>
      <Link
        to="/alunos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-rs-gray-500 hover:text-rs-blue-600"
      >
        <ArrowLeft className="size-4" />
        Voltar para alunos
      </Link>

      {/* Cabeçalho da ficha */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-start gap-4 p-4 sm:gap-5 sm:p-6">
          <Avatar nome={aluno.nome} tamanho="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="rs-title text-2xl break-words text-rs-ink sm:text-3xl">{aluno.nome}</h1>
              <Badge tom={STATUS_ALUNO[aluno.status].tom}>{STATUS_ALUNO[aluno.status].label}</Badge>
              <Badge tom={pag.tom}>{pag.label}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-rs-gray-500">
              <FaixaBadge faixa={aluno.faixa} graus={aluno.graus} />
              <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                <Mail className="size-4 shrink-0" /> <span className="truncate">{aluno.email}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-4" /> {aluno.telefone}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" /> {idade(aluno.nascimento)} anos
              </span>
            </div>
            {aluno.responsavel?.nome && (
              <p className="mt-2 text-sm text-rs-gray-500">
                Responsável: <span className="font-semibold text-rs-gray-700">{aluno.responsavel.nome}</span> ·{' '}
                {aluno.responsavel.telefone}
              </p>
            )}
          </div>
          <Button variante="secundaria" className="w-full sm:w-auto" onClick={() => setEditando(true)}>
            <Pencil className="size-4" />
            Editar cadastro
          </Button>
        </div>

        {aluno.observacoes && (
          <div className="border-t border-rs-gray-200 bg-rs-warn-bg px-4 py-3 sm:px-6">
            <p className="rs-label text-rs-warn">Observação de treino</p>
            <p className="mt-1 text-sm text-rs-gray-700">{aluno.observacoes}</p>
          </div>
        )}
      </Card>

      {/* Indicadores da ficha */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: 'Frequência (30 dias)', valor: `${aluno.frequencia30d}%`, Icone: TrendingUp },
          { label: 'Presenças registradas', valor: presentes, Icone: CalendarDays },
          { label: 'Plano', valor: plano?.nome ?? '—', nota: plano ? brl(plano.valor) : undefined, Icone: CreditCard },
          { label: 'Aluno desde', valor: dataCurta(aluno.matriculaEm), Icone: User },
        ].map(({ label, valor, nota, Icone }) => (
          <div key={label} className="min-w-0 rounded-lg border border-rs-gray-200 bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="rs-label">{label}</p>
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-rs-blue-50 text-rs-blue-600 sm:size-9">
                <Icone className="size-[18px]" />
              </span>
            </div>
            <p className="rs-metric mt-2 truncate text-[1.75rem] text-rs-ink sm:mt-3 sm:text-[2.5rem]">{valor}</p>
            {nota && <p className="mt-1 text-xs text-rs-gray-500">{nota}</p>}
          </div>
        ))}
      </div>

      <div className="mb-4">
        <Tabs
          valor={aba}
          aoMudar={setAba}
          itens={[
            { id: 'resumo', label: 'Resumo' },
            { id: 'presenca', label: 'Presença', contagem: historico.length },
            { id: 'financeiro', label: 'Financeiro', contagem: pagamentos.length },
          ]}
        />
      </div>

      {aba === 'resumo' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader titulo="Jornada de graduação" descricao="Faixa atual e próximo objetivo" />
            <CardBody className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="rs-label">Faixa atual</p>
                  <p className="mt-1">
                    <FaixaBadge faixa={aluno.faixa} graus={aluno.graus} />
                  </p>
                </div>
                {proximaFaixa && (
                  <div className="text-right">
                    <p className="rs-label">Próxima faixa</p>
                    <p className="mt-1">
                      <FaixaBadge faixa={proximaFaixa} />
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-rs-gray-700">Graus na faixa atual</span>
                  <span className="text-sm text-rs-gray-500">{aluno.graus} de 4</span>
                </div>
                <Progress valor={progressoGraduacao} cor={FAIXAS[aluno.faixa].cor === '#e4e8ed' ? '#667085' : FAIXAS[aluno.faixa].cor} altura="h-3" />
              </div>

              <div className="rounded-md border border-rs-blue-100 bg-rs-blue-50 p-4">
                <p className="text-sm font-semibold text-rs-blue-700">O que falta para o próximo grau</p>
                <ul className="mt-2 space-y-1 text-sm text-rs-gray-700">
                  <li>· Manter frequência acima de 70% por três meses</li>
                  <li>· Participar de ao menos um exame de graduação</li>
                  <li>· Demonstrar o programa técnico da faixa atual</li>
                </ul>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader titulo="Últimos treinos" descricao="Presenças mais recentes" />
            {historico.length === 0 ? (
              <EmptyState
                icone={<CalendarDays className="size-6" />}
                titulo="Nenhum treino registrado"
                mensagem="As presenças aparecem aqui quando o aluno faz o check-in ou o professor registra."
              />
            ) : (
              <ul className="divide-y divide-rs-gray-200">
                {historico.slice(0, 8).map((h, i) => (
                  <li key={`${h.data}-${i}`} className="flex items-center gap-4 px-5 py-3">
                    <span className="w-16 shrink-0 text-xs font-semibold text-rs-gray-500">{dataCurta(h.data)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-rs-ink">{h.aula?.titulo}</span>
                      <span className="block text-xs text-rs-gray-500">
                        {turmaPorId(h.aula?.turmaId ?? '')?.nome} · {h.aula?.inicio}
                        {h.origem === 'aluno' && ' · check-in do aluno'}
                      </span>
                    </span>
                    <Badge tom={h.status === 'presente' ? 'ok' : h.status === 'justificado' ? 'alerta' : 'neutro'}>
                      {h.status === 'presente' ? 'Presente' : h.status === 'justificado' ? 'Justificado' : 'Falta'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {aba === 'presenca' && (
        <Card>
          <CardHeader titulo="Histórico de presença" descricao="Últimos 30 registros" />
          {historico.length === 0 ? (
            <EmptyState icone={<CalendarDays className="size-6" />} titulo="Sem registros" mensagem="Nenhum check-in ou registro do professor para este aluno ainda." />
          ) : (
            <div className="overflow-x-auto">
              <table className="rs-tabela-cartoes w-full min-w-[600px] text-left">
                <thead>
                  <tr className="border-b border-rs-gray-200">
                    {['Data', 'Aula', 'Turma', 'Horário', 'Situação', 'Registrado por'].map((h) => (
                      <th key={h} className="rs-label px-5 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-rs-gray-200">
                  {historico.map((h, i) => (
                    <tr key={`${h.data}-${i}`} className="hover:bg-rs-gray-50">
                      <td data-principal className="px-5 py-3 text-sm text-rs-gray-700">{dataLonga(h.data)}</td>
                      <td data-label="Aula" className="px-5 py-3 text-sm font-semibold text-rs-ink">{h.aula?.titulo}</td>
                      <td data-label="Turma" className="px-5 py-3 text-sm text-rs-gray-700">{turmaPorId(h.aula?.turmaId ?? '')?.nome}</td>
                      <td data-label="Horário" className="px-5 py-3 font-mono text-sm text-rs-gray-700">{h.aula?.inicio}</td>
                      <td data-label="Situação" className="px-5 py-3">
                        <Badge tom={h.status === 'presente' ? 'ok' : h.status === 'justificado' ? 'alerta' : 'neutro'}>
                          {h.status === 'presente' ? 'Presente' : h.status === 'justificado' ? 'Justificado' : 'Falta'}
                        </Badge>
                      </td>
                      <td data-label="Registrado por" className="px-5 py-3 text-sm text-rs-gray-700">
                        {h.origem === 'aluno' ? `Check-in do aluno${h.horario ? ` · ${h.horario}` : ''}` : 'Chamada do professor'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {aba === 'financeiro' && (
        <Card>
          <CardHeader
            titulo="Pagamentos"
            descricao={`Plano ${plano?.nome ?? '—'} · vencimento dia ${aluno.vencimentoDia}`}
          />
          {pagamentos.length === 0 ? (
            <EmptyState icone={<CreditCard className="size-6" />} titulo="Sem lançamentos" mensagem="Nenhum pagamento registrado para este aluno." />
          ) : (
            <div className="overflow-x-auto">
              <table className="rs-tabela-cartoes w-full min-w-[600px] text-left">
                <thead>
                  <tr className="border-b border-rs-gray-200">
                    {['Data', 'Descrição', 'Método', 'Valor', 'Situação'].map((h) => (
                      <th key={h} className="rs-label px-5 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-rs-gray-200">
                  {pagamentos.map((t) => (
                    <tr key={t.id} className="hover:bg-rs-gray-50">
                      <td data-principal className="px-5 py-3 text-sm text-rs-gray-700">{dataCurta(t.data)}</td>
                      <td data-label="Descrição" className="px-5 py-3 text-sm font-semibold text-rs-ink">{t.descricao}</td>
                      <td data-label="Método" className="px-5 py-3 text-sm capitalize text-rs-gray-700">{t.metodo}</td>
                      <td data-label="Valor" className="px-5 py-3 text-sm font-bold text-rs-ink">{brl(t.valor)}</td>
                      <td data-label="Situação" className="px-5 py-3">
                        <Badge tom={t.conciliada ? 'ok' : 'alerta'}>{t.conciliada ? 'Conciliado' : 'A conferir'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <FormularioAluno aberto={editando} aluno={aluno} aoFechar={() => setEditando(false)} />
    </>
  )
}
