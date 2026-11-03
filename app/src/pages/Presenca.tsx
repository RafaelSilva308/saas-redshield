import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, Check, ClipboardCheck, Minus, Search, Smartphone, X } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { Badge, FaixaBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Carregando, EmptyState, ErroCarga, PageHeader, Progress } from '@/components/ui/Misc'
import { useAulas, useTurmas } from '@/api/turmas'
import { useAlunos } from '@/api/alunos'
import { useCancelamentoAula, useChamada, useCorrigirPresenca } from '@/api/presenca'
import { mensagemDeErro } from '@/lib/api'
import { DIAS_SEMANA_LONGO, dataLonga, hojeISO } from '@/lib/format'
import type { Aula, StatusPresenca } from '@/types'
import { cn } from '@/lib/cn'

const OPCOES: { id: StatusPresenca; label: string; Icone: typeof Check; classe: string }[] = [
  { id: 'presente', label: 'Presente', Icone: Check, classe: 'bg-rs-success text-white border-rs-success' },
  { id: 'justificado', label: 'Justificado', Icone: Minus, classe: 'bg-rs-warn text-white border-rs-warn' },
  { id: 'ausente', label: 'Falta', Icone: X, classe: 'bg-rs-red-600 text-white border-rs-red-600' },
]

const hora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''

export function Presenca() {
  const aulas = useAulas()
  const turmas = useTurmas().data ?? []

  const [data, setData] = useState(hojeISO())
  const [aulaId, setAulaId] = useState('')

  const diaSemana = new Date(data + 'T12:00:00').getDay()
  const aulasDoDia = useMemo(
    () => (aulas.data ?? []).filter((a) => a.diaSemana === diaSemana).sort((a, b) => a.inicio.localeCompare(b.inicio)),
    [aulas.data, diaSemana],
  )
  const aulaSelecionada = aulasDoDia.find((a) => a.id === aulaId) ?? aulasDoDia[0]
  const nomeTurma = (id: string) => turmas.find((t) => t.id === id)?.nome ?? ''

  if (aulas.isError) return <ErroCarga mensagem={mensagemDeErro(aulas.error)} aoTentarDeNovo={() => aulas.refetch()} />
  if (aulas.isPending) return <Carregando />

  return (
    <>
      <PageHeader
        titulo="Presenças da aula"
        subtitulo="Os alunos marcam a própria presença pelo check-in. Quem não marcar conta como falta — e você pode corrigir qualquer registro."
      />

      {/* Seleção de dia e aula */}
      <Card className="mb-4">
        <CardBody className="flex flex-wrap items-end gap-3">
          <Input
            label="Data"
            type="date"
            value={data}
            onChange={(e) => {
              if (!e.target.value) return
              setData(e.target.value)
              setAulaId('')
            }}
            wrapClass="w-full sm:w-44"
          />
          <Select
            label="Aula"
            value={aulaSelecionada?.id ?? ''}
            onChange={(e) => setAulaId(e.target.value)}
            wrapClass="w-full sm:min-w-[240px] sm:flex-1"
            disabled={aulasDoDia.length === 0}
          >
            {aulasDoDia.length === 0 && <option>Sem aulas neste dia</option>}
            {aulasDoDia.map((a) => (
              <option key={a.id} value={a.id}>
                {a.inicio} — {a.titulo} ({nomeTurma(a.turmaId)})
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {!aulaSelecionada ? (
        <Card>
          <EmptyState
            icone={<ClipboardCheck className="size-6" />}
            titulo={`Nenhuma aula na ${DIAS_SEMANA_LONGO[diaSemana].toLowerCase()}`}
            mensagem="Escolha outra data ou inclua a aula no quadro de horários."
            acao={
              <Link to="/agenda">
                <Button variante="secundaria">Ver agenda</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        // `key` reinicia busca, erros e formulário de cancelamento ao trocar de aula ou de data.
        <ListaChamada
          key={`${aulaSelecionada.id}-${data}`}
          aula={aulaSelecionada}
          data={data}
          turma={nomeTurma(aulaSelecionada.turmaId)}
        />
      )}
    </>
  )
}

function ListaChamada({ aula, data, turma }: { aula: Aula; data: string; turma: string }) {
  const chamada = useChamada(aula.id, data)
  const alunos = useAlunos().data
  const corrigir = useCorrigirPresenca(aula.id, data)
  const { cancelar, reativar } = useCancelamentoAula(aula.id, data)

  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')
  const [cancelando, setCancelando] = useState(false)
  const [motivo, setMotivo] = useState('')

  const futura = data > hojeISO()

  const registros = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return (chamada.data?.registros ?? []).filter((r) => !q || r.nome.toLowerCase().includes(q))
  }, [chamada.data, busca])

  if (chamada.isError)
    return <ErroCarga mensagem={mensagemDeErro(chamada.error)} aoTentarDeNovo={() => chamada.refetch()} />
  if (chamada.isPending) return <Carregando />

  const todos = chamada.data.registros
  const cancelada = chamada.data.cancelada
  const contar = (s: string) => todos.filter((r) => r.situacao === s).length
  const presentes = contar('presente')
  const justificados = contar('justificado')
  const semCheckin = contar('sem_checkin')
  const ocupacao = Math.round((presentes / aula.capacidade) * 100)
  const alunoPorId = (id: string) => alunos?.find((a) => a.id === id)

  const marcar = (alunoId: string, status: StatusPresenca) => {
    setErro('')
    corrigir.mutate({ alunoId, status }, { onError: (e) => setErro(mensagemDeErro(e)) })
  }

  const confirmarCancelamento = () => {
    setErro('')
    cancelar.mutate(motivo, {
      onSuccess: () => {
        setCancelando(false)
        setMotivo('')
      },
      onError: (e) => setErro(mensagemDeErro(e)),
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {/* Resumo da aula */}
      <Card className="lg:col-span-1 lg:order-2 lg:sticky lg:top-20 lg:self-start">
        <CardHeader titulo="Resumo" descricao={dataLonga(data)} />
        <CardBody className="space-y-4">
          <div>
            <p className="rs-label">{aula.titulo}</p>
            <p className="mt-1 text-sm text-rs-gray-700">
              {turma} · {aula.inicio}–{aula.fim}
            </p>
            <p className="text-sm text-rs-gray-500">{aula.local}</p>
          </div>

          {cancelada ? (
            <div className="space-y-3 border-t border-rs-gray-200 pt-4">
              <Badge tom="neutro">
                <Ban className="size-3.5" /> Aula cancelada
              </Badge>
              {chamada.data.motivo && <p className="text-sm text-rs-gray-700">Motivo: {chamada.data.motivo}</p>}
              <p className="text-xs text-rs-gray-500">Aula cancelada não conta falta para ninguém.</p>
              <Button
                variante="secundaria"
                tamanho="sm"
                disabled={reativar.isPending}
                onClick={() => reativar.mutate(undefined, { onError: (e) => setErro(mensagemDeErro(e)) })}
              >
                {reativar.isPending ? 'Reativando…' : 'Reativar aula'}
              </Button>
            </div>
          ) : (
            <>
              <div className="border-t border-rs-gray-200 pt-4">
                <p className="rs-metric text-rs-ink">
                  {presentes}
                  <span className="text-lg text-rs-gray-500">/{aula.capacidade}</span>
                </p>
                <p className="mt-1 text-xs text-rs-gray-500">presentes · {ocupacao}% da capacidade</p>
                <Progress
                  valor={ocupacao}
                  className="mt-2"
                  cor={ocupacao > 90 ? 'var(--color-rs-red-600)' : 'var(--color-rs-blue-600)'}
                />
              </div>

              <dl className="grid grid-cols-3 gap-2 border-t border-rs-gray-200 pt-4 text-center">
                {[
                  ['Presentes', presentes],
                  ['Justificados', justificados],
                  ['Faltas', todos.length - presentes - justificados],
                ].map(([label, n]) => (
                  <div key={label as string}>
                    <dt className="text-[10px] font-semibold uppercase tracking-normal text-rs-gray-500">{label}</dt>
                    <dd className="rs-title text-xl text-rs-ink">{n}</dd>
                  </div>
                ))}
              </dl>

              <p className="text-xs leading-relaxed text-rs-gray-500">
                {futura
                  ? 'Aula futura: a presença só pode ser registrada no dia.'
                  : `${semCheckin} de ${todos.length} alunos sem check-in contam como falta. Toque em Presente ou Justificado para corrigir.`}
              </p>

              <div className="border-t border-rs-gray-200 pt-4">
                {cancelando ? (
                  <div className="space-y-2">
                    <Input
                      label="Motivo do cancelamento"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Ex.: feriado"
                    />
                    <div className="flex gap-2">
                      <Button
                        variante="perigo"
                        tamanho="sm"
                        disabled={motivo.trim().length < 2 || cancelar.isPending}
                        onClick={confirmarCancelamento}
                      >
                        {cancelar.isPending ? 'Cancelando…' : 'Confirmar'}
                      </Button>
                      <Button variante="fantasma" tamanho="sm" onClick={() => setCancelando(false)}>
                        Voltar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variante="fantasma" tamanho="sm" onClick={() => setCancelando(true)}>
                    <Ban className="size-4" />
                    Cancelar esta aula
                  </Button>
                )}
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Lista de presença */}
      <Card className="lg:col-span-3 lg:order-1">
        <CardHeader titulo="Presenças" descricao={`${todos.length} alunos das turmas desta aula`} />
        <div className="border-b border-rs-gray-200 px-4 py-3 sm:px-5">
          <Input
            aria-label="Buscar aluno"
            placeholder="Buscar aluno"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            iconeEsq={<Search className="size-4" />}
          />
        </div>
        {erro && (
          <p
            role="alert"
            className="border-b border-rs-red-100 bg-rs-red-50 px-5 py-3 text-sm font-medium text-rs-red-700"
          >
            {erro}
          </p>
        )}
        {registros.length === 0 ? (
          <EmptyState
            icone={<Search className="size-6" />}
            titulo="Nenhum aluno"
            mensagem={
              busca ? 'Ajuste a busca.' : 'Nenhum aluno ativo nesta turma. Vincule alunos à turma no cadastro do aluno.'
            }
          />
        ) : (
          <ul className="divide-y divide-rs-gray-200">
            {registros.map((r) => {
              const st = r.situacao
              const aluno = alunoPorId(r.alunoId)
              return (
                <li
                  key={r.alunoId}
                  className={cn(
                    'flex flex-wrap items-center gap-3 px-4 py-3 transition-colors sm:px-5',
                    !cancelada && st === 'presente' && 'bg-rs-success-bg/40',
                    !cancelada && st === 'ausente' && 'bg-rs-red-50/50',
                  )}
                >
                  <Avatar nome={r.nome} />
                  <Link to={`/alunos/${r.alunoId}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-rs-ink hover:text-rs-blue-600">
                      {r.nome}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {aluno && <FaixaBadge faixa={aluno.faixa} compacto />}
                      {st === 'sem_checkin' && !cancelada && !futura && (
                        <Badge tom="neutro">Sem check-in · conta como falta</Badge>
                      )}
                      {r.origem === 'aluno' && (
                        <Badge tom="azul">
                          <Smartphone className="size-3" />
                          Check-in do aluno{r.registradoEm ? ` · ${hora(r.registradoEm)}` : ''}
                        </Badge>
                      )}
                    </span>
                  </Link>

                  {aluno && (
                    <span className="hidden shrink-0 text-xs text-rs-gray-500 sm:block">
                      {aluno.frequencia30d}% em 30d
                    </span>
                  )}

                  {/* Botões grandes o suficiente para uso no tatame, no celular */}
                  {!cancelada && !futura && (
                    <div className="flex w-full shrink-0 gap-1.5 sm:w-auto">
                      {OPCOES.map(({ id, label, Icone, classe }) => {
                        const ativo = st === id
                        return (
                          <button
                            key={id}
                            onClick={() => marcar(r.alunoId, id)}
                            aria-pressed={ativo}
                            aria-label={`${label}: ${r.nome}`}
                            className={cn(
                              'inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors sm:flex-none',
                              ativo
                                ? classe
                                : 'border-rs-gray-300 bg-white text-rs-gray-500 hover:border-rs-gray-500 hover:text-rs-ink',
                            )}
                          >
                            <Icone className="size-4" />
                            <span className={cn(ativo ? 'inline' : 'hidden sm:inline')}>{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
