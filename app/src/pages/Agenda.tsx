import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Clock, LayoutGrid, List, MapPin, Plus, Trash2, Users } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Carregando, EmptyState, ErroCarga, PageHeader } from '@/components/ui/Misc'
import { useAuth } from '@/app/auth'
import { useAulas, useRemoverAula, useSalvarAula, useTurmas } from '@/api/turmas'
import { mensagemDeErro } from '@/lib/api'
import { DIAS_SEMANA, DIAS_SEMANA_LONGO } from '@/lib/format'
import type { Aula, DiaSemana } from '@/types'
import { cn } from '@/lib/cn'

const VAZIA: Aula = {
  id: '',
  turmaId: '',
  titulo: '',
  diaSemana: 1,
  inicio: '19:00',
  fim: '20:00',
  capacidade: 30,
  local: 'Tatame 1',
}

export function Agenda() {
  const { usuario } = useAuth()
  // O quadro é visível a todos; só a equipe agenda, edita e remove aulas.
  const podeEditar = usuario?.papel === 'gestor' || usuario?.papel === 'professor'
  const consultaAulas = useAulas()
  const consultaTurmas = useTurmas()
  const salvar = useSalvarAula()
  const remover = useRemoverAula()
  const aulas = useMemo(() => consultaAulas.data ?? [], [consultaAulas.data])
  const TURMAS = useMemo(() => (consultaTurmas.data ?? []).filter((t) => t.ativa !== false), [consultaTurmas.data])
  const turmaPorId = (id: string) => consultaTurmas.data?.find((t) => t.id === id)
  const [visao, setVisao] = useState<'semana' | 'lista'>('semana')
  const [turmaFiltro, setTurmaFiltro] = useState('todas')
  const [aberto, setAberto] = useState(false)
  const [dados, setDados] = useState<Aula>(VAZIA)
  const [erro, setErro] = useState('')

  const hoje = new Date().getDay()

  const filtradas = useMemo(
    () => (turmaFiltro === 'todas' ? aulas : aulas.filter((a) => a.turmaId === turmaFiltro)),
    [aulas, turmaFiltro],
  )

  const porDia = useMemo(
    () =>
      Array.from({ length: 7 }, (_, d) =>
        filtradas.filter((a) => a.diaSemana === d).sort((a, b) => a.inicio.localeCompare(b.inicio)),
      ),
    [filtradas],
  )

  const totalSemanal = filtradas.length

  const abrir = (a: Aula | null, dia?: DiaSemana) => {
    if (!podeEditar) return
    setDados(a ?? { ...VAZIA, diaSemana: dia ?? 1, turmaId: TURMAS[0]?.id ?? '' })
    setErro('')
    setAberto(true)
  }

  const submeter = () => {
    if (dados.titulo.trim().length < 3) return setErro('Dê um nome à aula.')
    if (!dados.turmaId) return setErro('Escolha a turma.')
    if (dados.fim <= dados.inicio) return setErro('O horário de término precisa ser depois do início.')
    salvar.mutate(dados, { onSuccess: () => setAberto(false), onError: (e) => setErro(mensagemDeErro(e)) })
  }

  const [erroLista, setErroLista] = useState('')
  const removerAula = (id: string, aoConcluir?: () => void) => {
    setErroLista('')
    remover.mutate(id, {
      onSuccess: aoConcluir,
      onError: (e) => (aoConcluir ? setErro(mensagemDeErro(e)) : setErroLista(mensagemDeErro(e))),
    })
  }

  const falha = consultaAulas.error ?? consultaTurmas.error
  if (falha)
    return (
      <ErroCarga
        mensagem={mensagemDeErro(falha)}
        aoTentarDeNovo={() => {
          consultaAulas.refetch()
          consultaTurmas.refetch()
        }}
      />
    )
  if (consultaAulas.isPending || consultaTurmas.isPending) return <Carregando />

  return (
    <>
      <PageHeader
        titulo="Agenda de aulas"
        subtitulo={`Quadro de horários semanal · ${totalSemanal} aulas por semana`}
        acoes={
          <>
            <div className="flex overflow-hidden rounded-md border border-rs-gray-300">
              {(
                [
                  ['semana', 'Semana', LayoutGrid],
                  ['lista', 'Lista', List],
                ] as const
              ).map(([id, label, Icone]) => (
                <button
                  key={id}
                  onClick={() => setVisao(id)}
                  aria-pressed={visao === id}
                  className={cn(
                    'inline-flex h-10 cursor-pointer items-center gap-1.5 px-3 text-sm font-semibold transition-colors',
                    visao === id ? 'bg-rs-blue-600 text-white' : 'bg-white text-rs-gray-700 hover:bg-rs-gray-50',
                  )}
                >
                  <Icone className="size-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
            {podeEditar && (
              <Button variante="primaria" onClick={() => abrir(null)}>
                <Plus className="size-4" />
                Agendar aula
              </Button>
            )}
          </>
        }
      />

      {erroLista && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-rs-red-100 bg-rs-red-50 px-3 py-2 text-sm font-medium text-rs-red-700"
        >
          {erroLista}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          value={turmaFiltro}
          onChange={(e) => setTurmaFiltro(e.target.value)}
          wrapClass="w-full sm:w-56"
          aria-label="Filtrar por turma"
        >
          <option value="todas">Todas as turmas</option>
          {TURMAS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </Select>
        <div className="flex flex-wrap items-center gap-2">
          {TURMAS.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1.5 text-xs text-rs-gray-500">
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: t.cor }} />
              {t.nome}
            </span>
          ))}
        </div>
      </div>

      {visao === 'semana' ? (
        /* Grade semanal: 7 colunas no desktop, empilhada no celular */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {porDia.map((doDia, dia) => (
            <div
              key={dia}
              className={cn(
                'flex flex-col rounded-lg border bg-white shadow-[var(--shadow-card)]',
                dia === hoje ? 'border-rs-blue-300 ring-1 ring-rs-blue-100' : 'border-rs-gray-200',
              )}
            >
              <header
                className={cn(
                  'flex items-center justify-between gap-2 rounded-t-lg px-3 py-2.5',
                  dia === hoje ? 'bg-rs-blue-600 text-white' : 'bg-rs-gray-50',
                )}
              >
                <span className="rs-title text-sm tracking-wider">{DIAS_SEMANA_LONGO[dia].replace('-feira', '')}</span>
                <span className={cn('text-xs font-semibold', dia === hoje ? 'text-white/75' : 'text-rs-gray-500')}>
                  {doDia.length}
                </span>
              </header>

              <ul className="flex-1 space-y-2 p-2.5">
                {doDia.length === 0 && <li className="px-1 py-3 text-center text-xs text-rs-gray-500">Sem aulas</li>}
                {doDia.map((aula) => {
                  const turma = turmaPorId(aula.turmaId)
                  return (
                    <li key={aula.id}>
                      <button
                        onClick={() => abrir(aula)}
                        disabled={!podeEditar}
                        className="w-full cursor-pointer rounded-md disabled:cursor-default border-l-[3px] bg-rs-gray-50 p-2.5 text-left transition-colors hover:bg-rs-blue-50"
                        style={{ borderLeftColor: turma?.cor }}
                      >
                        <span className="block font-mono text-xs font-bold text-rs-gray-700">
                          {aula.inicio}–{aula.fim}
                        </span>
                        <span className="mt-0.5 block text-sm font-semibold leading-tight text-rs-ink">
                          {aula.titulo}
                        </span>
                        <span className="mt-1 block truncate text-xs text-rs-gray-500">{turma?.nome}</span>
                      </button>
                    </li>
                  )
                })}
                {podeEditar && (
                  <li>
                    <button
                      onClick={() => abrir(null, dia as DiaSemana)}
                      className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-rs-gray-300 py-2 text-xs font-semibold text-rs-gray-500 transition-colors hover:border-rs-blue-300 hover:text-rs-blue-600"
                    >
                      <Plus className="size-3.5" />
                      Adicionar
                    </button>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader titulo="Todas as aulas" descricao="Quadro completo ordenado por dia e horário" />
          {filtradas.length === 0 ? (
            <EmptyState
              icone={<CalendarDays className="size-6" />}
              titulo="Nenhuma aula no quadro"
              mensagem="Comece montando o horário semanal da academia."
              acao={
                podeEditar && (
                  <Button variante="secundaria" onClick={() => abrir(null)}>
                    <Plus className="size-4" />
                    Agendar aula
                  </Button>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-rs-gray-200">
                    {['Dia', 'Horário', 'Aula', 'Turma', 'Local', 'Capacidade', ''].map((h) => (
                      <th key={h} className="rs-label px-5 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-rs-gray-200">
                  {[...filtradas]
                    .sort((a, b) => a.diaSemana - b.diaSemana || a.inicio.localeCompare(b.inicio))
                    .map((aula) => {
                      const turma = turmaPorId(aula.turmaId)
                      return (
                        <tr key={aula.id} className="group hover:bg-rs-gray-50">
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-2 text-sm font-semibold text-rs-ink">
                              {DIAS_SEMANA[aula.diaSemana]}
                              {aula.diaSemana === hoje && <Badge tom="azul">Hoje</Badge>}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-mono text-sm text-rs-gray-700">
                            {aula.inicio}–{aula.fim}
                          </td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => abrir(aula)}
                              disabled={!podeEditar}
                              className="cursor-pointer text-sm font-semibold text-rs-ink hover:text-rs-blue-600 disabled:cursor-default disabled:hover:text-rs-ink"
                            >
                              {aula.titulo}
                            </button>
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1.5 text-sm text-rs-gray-700">
                              <span aria-hidden className="size-2.5 rounded-full" style={{ background: turma?.cor }} />
                              {turma?.nome}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm text-rs-gray-700">{aula.local}</td>
                          <td className="px-5 py-3 text-sm text-rs-gray-700">{aula.capacidade} vagas</td>
                          <td className="px-5 py-3 text-right">
                            {podeEditar && (
                              <button
                                onClick={() => removerAula(aula.id)}
                                disabled={remover.isPending}
                                aria-label={`Remover ${aula.titulo}`}
                                className="cursor-pointer rounded-md p-2 text-rs-gray-500 opacity-0 transition-opacity hover:bg-rs-red-50 hover:text-rs-red-600 focus-visible:opacity-100 group-hover:opacity-100"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Resumo por turma */}
      <Card className="mt-4">
        <CardHeader titulo="Turmas" descricao="Quem conduz cada turma e quantas aulas ela tem por semana" />
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {TURMAS.map((t) => {
            const qtd = aulas.filter((a) => a.turmaId === t.id).length
            return (
              <div
                key={t.id}
                className="rounded-md border-l-[3px] border border-rs-gray-200 p-4"
                style={{ borderLeftColor: t.cor }}
              >
                <h3 className="rs-title text-base text-rs-ink">{t.nome}</h3>
                <p className="mt-1 text-xs text-rs-gray-500">{t.professor}</p>
                <ul className="mt-3 space-y-1 text-xs text-rs-gray-700">
                  <li className="flex items-center gap-1.5">
                    <Users className="size-3.5 text-rs-gray-500" /> {t.faixaEtaria}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-rs-gray-500" /> {qtd} aula{qtd === 1 ? '' : 's'} por semana
                  </li>
                  <li className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-rs-gray-500" /> {t.nivel}
                  </li>
                </ul>
                {podeEditar && (
                  <Link
                    to="/presenca"
                    className="mt-3 inline-block text-xs font-semibold uppercase tracking-wider text-rs-blue-600 hover:underline"
                  >
                    Ver presenças
                  </Link>
                )}
              </div>
            )
          })}
        </CardBody>
      </Card>

      {/* Formulário de aula */}
      <Modal
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo={dados.id ? 'Editar aula' : 'Agendar aula'}
        descricao="A aula se repete toda semana no dia e horário definidos. Remover uma aula que já teve presenças só a tira do quadro: o histórico continua valendo."
        largura="sm"
        rodape={
          <>
            {dados.id && (
              <Button
                variante="perigo"
                className="mr-auto"
                disabled={remover.isPending}
                onClick={() => removerAula(dados.id, () => setAberto(false))}
              >
                {remover.isPending ? 'Removendo…' : 'Remover'}
              </Button>
            )}
            <Button variante="fantasma" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button variante="primaria" onClick={submeter} disabled={salvar.isPending}>
              {salvar.isPending ? 'Salvando…' : dados.id ? 'Salvar' : 'Agendar'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome da aula"
            value={dados.titulo}
            onChange={(e) => setDados({ ...dados, titulo: e.target.value })}
            placeholder="Ex.: Fundamentos de Guarda"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Turma"
              value={dados.turmaId}
              onChange={(e) => setDados({ ...dados, turmaId: e.target.value })}
            >
              {TURMAS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Select>
            <Select
              label="Dia da semana"
              value={dados.diaSemana}
              onChange={(e) => setDados({ ...dados, diaSemana: Number(e.target.value) as DiaSemana })}
            >
              {DIAS_SEMANA_LONGO.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </Select>
            <Input
              label="Início"
              type="time"
              value={dados.inicio}
              onChange={(e) => setDados({ ...dados, inicio: e.target.value })}
            />
            <Input
              label="Término"
              type="time"
              value={dados.fim}
              onChange={(e) => setDados({ ...dados, fim: e.target.value })}
            />
            <Input
              label="Capacidade"
              type="number"
              min={1}
              value={dados.capacidade}
              onChange={(e) => setDados({ ...dados, capacidade: Number(e.target.value) })}
            />
            <Input
              label="Local"
              value={dados.local}
              onChange={(e) => setDados({ ...dados, local: e.target.value })}
              placeholder="Tatame 1"
            />
          </div>

          {erro && (
            <p
              role="alert"
              className="rounded-md border border-rs-red-100 bg-rs-red-50 px-3 py-2 text-sm font-medium text-rs-red-700"
            >
              {erro}
            </p>
          )}
        </div>
      </Modal>
    </>
  )
}
