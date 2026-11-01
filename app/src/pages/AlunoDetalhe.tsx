import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, CreditCard, Mail, Pencil, Phone, Send, TrendingUp, User } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, FaixaBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Carregando, EmptyState, ErroCarga, Progress, Tabs } from '@/components/ui/Misc'
import { FormularioAluno } from './alunos/FormularioAluno'
import { useAuth } from '@/app/auth'
import {
  useAluno,
  useCobrancasAluno,
  useConvidarAluno,
  usePresencasAluno,
  type PresencaAluno,
  type SituacaoCobranca,
} from '@/api/alunos'
import { usePlanos } from '@/api/planos'
import { useAulas, useTurmas } from '@/api/turmas'
import { ErroApi, mensagemDeErro } from '@/lib/api'
import { FAIXAS, STATUS_ALUNO, STATUS_PAGAMENTO, brl, dataCurta, dataLonga, idade } from '@/lib/format'
import type { Faixa } from '@/types'

const ORDEM_FAIXAS: Faixa[] = ['branca', 'azul', 'roxa', 'marrom', 'preta']

/** Rótulo e tom de cada situação de presença. Aula realizada sem registro é falta (D2). */
const SITUACAO: Record<PresencaAluno['situacao'], { label: string; tom: 'ok' | 'alerta' | 'neutro' }> = {
  presente: { label: 'Presente', tom: 'ok' },
  justificado: { label: 'Justificado', tom: 'alerta' },
  ausente: { label: 'Falta', tom: 'neutro' },
  sem_checkin: { label: 'Falta · sem check-in', tom: 'neutro' },
}

const COBRANCA: Record<SituacaoCobranca, { label: string; tom: 'ok' | 'alerta' | 'urgente' | 'neutro' }> = {
  paga: { label: 'Paga', tom: 'ok' },
  aberta: { label: 'Em aberto', tom: 'alerta' },
  atrasada: { label: 'Atrasada', tom: 'urgente' },
  cancelada: { label: 'Cancelada', tom: 'neutro' },
}

const horaDe = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export function AlunoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const ehGestor = usuario?.papel === 'gestor'
  const [aba, setAba] = useState<'resumo' | 'presenca' | 'financeiro'>('resumo')
  const [editando, setEditando] = useState(false)
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null)

  const consulta = useAluno(id)
  const planos = usePlanos().data ?? []
  const dadosTurmas = useTurmas().data
  const dadosAulas = useAulas().data
  const turmas = useMemo(() => dadosTurmas ?? [], [dadosTurmas])
  const aulas = useMemo(() => dadosAulas ?? [], [dadosAulas])
  const presencas = usePresencasAluno(id)
  const cobrancas = useCobrancasAluno(id, ehGestor)
  const convidar = useConvidarAluno()
  const aluno = consulta.data

  const historico = useMemo(
    () =>
      (presencas.data ?? []).map((p) => {
        const aula = aulas.find((a) => a.id === p.aulaId)
        return { ...p, turma: turmas.find((t) => t.id === aula?.turmaId)?.nome ?? '' }
      }),
    [presencas.data, aulas, turmas],
  )
  const pagamentos = cobrancas.data ?? []

  if (consulta.isPending) return <Carregando />
  const naoExiste = consulta.error instanceof ErroApi && (consulta.error.status === 404 || consulta.error.status === 400)
  if (consulta.isError && !naoExiste)
    return <ErroCarga mensagem={mensagemDeErro(consulta.error)} aoTentarDeNovo={() => consulta.refetch()} />

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
  const presentes = historico.filter((h) => h.situacao === 'presente').length
  const turmasDoAluno = turmas.filter((t) => aluno.turmaIds?.includes(t.id))

  const enviarConvite = () => {
    setAviso(null)
    convidar.mutate(
      { id: aluno.id },
      {
        onSuccess: () => setAviso({ tom: 'ok', texto: `Convite enviado para ${aluno.email}. O link vale por 7 dias.` }),
        onError: (e) => setAviso({ tom: 'erro', texto: mensagemDeErro(e) }),
      },
    )
  }

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
        <div className="flex flex-wrap items-start gap-5 p-6">
          <Avatar nome={aluno.nome} tamanho="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="rs-title text-3xl text-rs-ink">{aluno.nome}</h1>
              <Badge tom={STATUS_ALUNO[aluno.status].tom}>{STATUS_ALUNO[aluno.status].label}</Badge>
              <Badge tom={pag.tom}>{pag.label}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-rs-gray-500">
              <FaixaBadge faixa={aluno.faixa} graus={aluno.graus} />
              {aluno.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-4" /> {aluno.email}
                </span>
              )}
              {aluno.telefone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-4" /> {aluno.telefone}
                </span>
              )}
              {aluno.nascimento && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" /> {idade(aluno.nascimento)} anos
                </span>
              )}
            </div>
            {aluno.responsavel?.nome && (
              <p className="mt-2 text-sm text-rs-gray-500">
                Responsável: <span className="font-semibold text-rs-gray-700">{aluno.responsavel.nome}</span> ·{' '}
                {aluno.responsavel.telefone}
              </p>
            )}
            <p className="mt-2 text-sm text-rs-gray-500">
              Turmas:{' '}
              <span className="font-semibold text-rs-gray-700">
                {turmasDoAluno.length ? turmasDoAluno.map((t) => t.nome).join(', ') : 'nenhuma (não aparece na presença)'}
              </span>
              {' · '}
              {aluno.temAcesso ? 'tem acesso ao sistema' : 'sem acesso ao sistema'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!aluno.temAcesso && aluno.status !== 'inativo' && (
              <Button
                variante="contorno"
                onClick={enviarConvite}
                disabled={convidar.isPending || !aluno.email}
                title={aluno.email ? undefined : 'Cadastre um e-mail para enviar o convite.'}
              >
                <Send className="size-4" />
                {convidar.isPending ? 'Enviando…' : 'Convidar para o sistema'}
              </Button>
            )}
            <Button variante="secundaria" onClick={() => setEditando(true)}>
              <Pencil className="size-4" />
              Editar cadastro
            </Button>
          </div>
        </div>

        {aviso && (
          <p
            role={aviso.tom === 'erro' ? 'alert' : 'status'}
            className={
              aviso.tom === 'erro'
                ? 'border-t border-rs-red-100 bg-rs-red-50 px-6 py-3 text-sm font-medium text-rs-red-700'
                : 'border-t border-rs-gray-200 bg-rs-gray-50 px-6 py-3 text-sm text-rs-gray-700'
            }
          >
            {aviso.texto}
          </p>
        )}

        {aluno.observacoes && (
          <div className="border-t border-rs-gray-200 bg-rs-warn-bg px-6 py-3">
            <p className="rs-label text-rs-warn">Observação de treino</p>
            <p className="mt-1 text-sm text-rs-gray-700">{aluno.observacoes}</p>
          </div>
        )}
      </Card>

      {/* Indicadores da ficha */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Frequência (30 dias)', valor: `${aluno.frequencia30d}%`, Icone: TrendingUp },
          { label: 'Presenças (90 dias)', valor: presentes, Icone: CalendarDays },
          { label: 'Plano', valor: plano?.nome ?? '—', nota: plano ? brl(plano.valor) : undefined, Icone: CreditCard },
          { label: 'Aluno desde', valor: dataCurta(aluno.matriculaEm), Icone: User },
        ].map(({ label, valor, nota, Icone }) => (
          <div key={label} className="rounded-lg border border-rs-gray-200 bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-3">
              <p className="rs-label">{label}</p>
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-rs-blue-50 text-rs-blue-600">
                <Icone className="size-[18px]" />
              </span>
            </div>
            <p className="rs-metric mt-3 truncate text-rs-ink">{valor}</p>
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
            // Cobranças são só do gestor (a API recusa para o professor).
            ...(ehGestor ? [{ id: 'financeiro' as const, label: 'Financeiro', contagem: pagamentos.length }] : []),
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
                <Progress
                  valor={progressoGraduacao}
                  cor={FAIXAS[aluno.faixa].cor === '#e4e8ed' ? '#667085' : FAIXAS[aluno.faixa].cor}
                  altura="h-3"
                />
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
            <CardHeader titulo="Últimos treinos" descricao="Aulas mais recentes das turmas do aluno" />
            {presencas.isError ? (
              <ErroCarga mensagem={mensagemDeErro(presencas.error)} aoTentarDeNovo={() => presencas.refetch()} />
            ) : presencas.isPending ? (
              <Carregando />
            ) : historico.length === 0 ? (
              <EmptyState
                icone={<CalendarDays className="size-6" />}
                titulo="Nenhum treino registrado"
                mensagem="As presenças aparecem aqui quando o aluno faz o check-in ou o professor registra."
              />
            ) : (
              <ul className="divide-y divide-rs-gray-200">
                {historico.slice(0, 8).map((h) => (
                  <li key={`${h.data}-${h.aulaId}`} className="flex items-center gap-4 px-5 py-3">
                    <span className="w-16 shrink-0 text-xs font-semibold text-rs-gray-500">{dataCurta(h.data)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-rs-ink">{h.titulo}</span>
                      <span className="block text-xs text-rs-gray-500">
                        {h.turma && `${h.turma} · `}
                        {h.inicio}
                        {h.origem === 'aluno' && ' · check-in do aluno'}
                      </span>
                    </span>
                    <Badge tom={SITUACAO[h.situacao].tom}>{SITUACAO[h.situacao].label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {aba === 'presenca' && (
        <Card>
          <CardHeader titulo="Histórico de presença" descricao="Aulas das turmas do aluno nos últimos 90 dias" />
          {presencas.isError ? (
            <ErroCarga mensagem={mensagemDeErro(presencas.error)} aoTentarDeNovo={() => presencas.refetch()} />
          ) : presencas.isPending ? (
            <Carregando />
          ) : historico.length === 0 ? (
            <EmptyState
              icone={<CalendarDays className="size-6" />}
              titulo="Sem registros"
              mensagem="Nenhuma aula das turmas deste aluno nos últimos 90 dias."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left">
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
                  {historico.map((h) => (
                    <tr key={`${h.data}-${h.aulaId}`} className="hover:bg-rs-gray-50">
                      <td className="px-5 py-3 text-sm text-rs-gray-700">{dataLonga(h.data)}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-rs-ink">{h.titulo}</td>
                      <td className="px-5 py-3 text-sm text-rs-gray-700">{h.turma}</td>
                      <td className="px-5 py-3 font-mono text-sm text-rs-gray-700">{h.inicio}</td>
                      <td className="px-5 py-3">
                        <Badge tom={SITUACAO[h.situacao].tom}>{SITUACAO[h.situacao].label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-sm text-rs-gray-700">
                        {h.origem === 'aluno'
                          ? `Check-in do aluno${h.registradoEm ? ` · ${horaDe(h.registradoEm)}` : ''}`
                          : h.origem === 'professor'
                            ? 'Professor'
                            : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {aba === 'financeiro' && ehGestor && (
        <Card>
          <CardHeader titulo="Cobranças" descricao={`Plano ${plano?.nome ?? '—'} · vencimento dia ${aluno.vencimentoDia}`} />
          {cobrancas.isError ? (
            <ErroCarga mensagem={mensagemDeErro(cobrancas.error)} aoTentarDeNovo={() => cobrancas.refetch()} />
          ) : cobrancas.isPending ? (
            <Carregando />
          ) : pagamentos.length === 0 ? (
            <EmptyState icone={<CreditCard className="size-6" />} titulo="Sem cobranças" mensagem="Nenhuma cobrança gerada para este aluno." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left">
                <thead>
                  <tr className="border-b border-rs-gray-200">
                    {['Competência', 'Vencimento', 'Valor', 'Situação', 'Pago em'].map((h) => (
                      <th key={h} className="rs-label px-5 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-rs-gray-200">
                  {pagamentos.map((c) => (
                    <tr key={c.id} className="hover:bg-rs-gray-50">
                      <td className="px-5 py-3 text-sm font-semibold text-rs-ink">
                        {c.competencia.slice(5, 7)}/{c.competencia.slice(0, 4)}
                      </td>
                      <td className="px-5 py-3 text-sm text-rs-gray-700">{dataCurta(c.vencimento)}</td>
                      <td className="px-5 py-3 text-sm font-bold text-rs-ink">{brl(c.valor)}</td>
                      <td className="px-5 py-3">
                        <Badge tom={COBRANCA[c.situacao].tom}>
                          {COBRANCA[c.situacao].label}
                          {c.diasAtraso > 0 && ` · ${c.diasAtraso} dia${c.diasAtraso > 1 ? 's' : ''}`}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-sm text-rs-gray-700">{c.pagoEm ? dataCurta(c.pagoEm) : '—'}</td>
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
