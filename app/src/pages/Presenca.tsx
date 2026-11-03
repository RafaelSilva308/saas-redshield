import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ClipboardCheck, Minus, Search, Smartphone, X } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { Badge, FaixaBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState, PageHeader, Progress } from '@/components/ui/Misc'
import { useStore } from '@/app/store'
import { turmaPorId } from '@/data/mock'
import { alunoNaAula } from '@/data/selectors'
import { DIAS_SEMANA_LONGO, dataLonga, hojeISO } from '@/lib/format'
import type { StatusPresenca } from '@/types'
import { cn } from '@/lib/cn'

const OPCOES: { id: StatusPresenca; label: string; Icone: typeof Check; classe: string }[] = [
  { id: 'presente', label: 'Presente', Icone: Check, classe: 'bg-rs-success text-white border-rs-success' },
  { id: 'justificado', label: 'Justificado', Icone: Minus, classe: 'bg-rs-warn text-white border-rs-warn' },
  { id: 'ausente', label: 'Falta', Icone: X, classe: 'bg-rs-red-600 text-white border-rs-red-600' },
]

export function Presenca() {
  const { alunos, aulas, chamadaDe, marcarPresenca } = useStore()

  const [data, setData] = useState(hojeISO())
  const [busca, setBusca] = useState('')

  const diaSemana = new Date(data + 'T12:00:00').getDay()
  const aulasDoDia = useMemo(
    () => aulas.filter((a) => a.diaSemana === diaSemana).sort((a, b) => a.inicio.localeCompare(b.inicio)),
    [aulas, diaSemana],
  )

  const [aulaId, setAulaId] = useState('')
  const aulaSelecionada = aulasDoDia.find((a) => a.id === aulaId) ?? aulasDoDia[0]

  const chamada = aulaSelecionada ? chamadaDe(aulaSelecionada.id, data) : undefined

  /* Elegíveis: turmas infantis mostram só alunos com responsável cadastrado. */
  const elegiveis = useMemo(() => {
    if (!aulaSelecionada) return []
    const q = busca.trim().toLowerCase()
    return alunos
      .filter((a) => alunoNaAula(a, aulaSelecionada))
      .filter((a) => !q || a.nome.toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [alunos, aulaSelecionada, busca])

  const statusDe = (alunoId: string): StatusPresenca | undefined =>
    chamada?.registros.find((r) => r.alunoId === alunoId)?.status
  const registroDe = (alunoId: string) => chamada?.registros.find((r) => r.alunoId === alunoId)

  const presentes = elegiveis.filter((a) => statusDe(a.id) === 'presente').length
  // Quem não fez check-in e não foi marcado pelo professor conta como falta.
  const semCheckin = elegiveis.filter((a) => statusDe(a.id) === undefined).length
  const ocupacao = aulaSelecionada ? Math.round((presentes / aulaSelecionada.capacidade) * 100) : 0

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
                {a.inicio} — {a.titulo} ({turmaPorId(a.turmaId)?.nome})
              </option>
            ))}
          </Select>
          <Input
            label="Buscar aluno"
            placeholder="Nome do aluno"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            iconeEsq={<Search className="size-4" />}
            wrapClass="w-full sm:min-w-[200px] sm:flex-1"
          />
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
        <div className="grid gap-4 lg:grid-cols-4">
          {/* Resumo da chamada */}
          <Card className="order-2 lg:col-span-1 lg:sticky lg:top-20 lg:self-start">
            <CardHeader titulo="Resumo" descricao={dataLonga(data)} />
            <CardBody className="space-y-4">
              <div>
                <p className="rs-label">{aulaSelecionada.titulo}</p>
                <p className="mt-1 text-sm text-rs-gray-700">
                  {turmaPorId(aulaSelecionada.turmaId)?.nome} · {aulaSelecionada.inicio}–{aulaSelecionada.fim}
                </p>
                <p className="text-sm text-rs-gray-500">{aulaSelecionada.local}</p>
              </div>

              <div className="border-t border-rs-gray-200 pt-4">
                <p className="rs-metric text-rs-ink">
                  {presentes}
                  <span className="text-lg text-rs-gray-500">/{aulaSelecionada.capacidade}</span>
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
                  ['Justificados', elegiveis.filter((a) => statusDe(a.id) === 'justificado').length],
                  ['Faltas', elegiveis.length - presentes - elegiveis.filter((a) => statusDe(a.id) === 'justificado').length],
                ].map(([label, n]) => (
                  <div key={label as string}>
                    <dt className="text-[10px] font-semibold uppercase tracking-normal text-rs-gray-500">{label}</dt>
                    <dd className="rs-title text-xl text-rs-ink">{n}</dd>
                  </div>
                ))}
              </dl>

              <p className="text-xs leading-relaxed text-rs-gray-500">
                {semCheckin} de {elegiveis.length} alunos sem check-in contam como falta. Toque em Presente ou
                Justificado para corrigir.
              </p>
            </CardBody>
          </Card>

          {/* Lista de chamada */}
          <Card className="order-1 lg:col-span-3">
            <CardHeader
              titulo="Presenças"
              descricao={`${elegiveis.length} alunos elegíveis para esta turma`}
            />
            {elegiveis.length === 0 ? (
              <EmptyState icone={<Search className="size-6" />} titulo="Nenhum aluno" mensagem="Ajuste a busca ou verifique os cadastros da turma." />
            ) : (
              <ul className="divide-y divide-rs-gray-200">
                {elegiveis.map((a) => {
                  const st = statusDe(a.id)
                  return (
                    <li
                      key={a.id}
                      className={cn(
                        'flex flex-wrap items-center gap-3 px-4 py-3 transition-colors sm:px-5',
                        st === 'presente' && 'bg-rs-success-bg/40',
                        st === 'ausente' && 'bg-rs-red-50/50',
                      )}
                    >
                      <Avatar nome={a.nome} />
                      <Link to={`/alunos/${a.id}`} className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-rs-ink hover:text-rs-blue-600">
                          {a.nome}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <FaixaBadge faixa={a.faixa} compacto />
                          {!registroDe(a.id) && <Badge tom="neutro">Sem check-in · conta como falta</Badge>}
                          {registroDe(a.id)?.origem === 'aluno' && (
                            <Badge tom="azul">
                              <Smartphone className="size-3" />
                              Check-in do aluno{registroDe(a.id)?.horario ? ` · ${registroDe(a.id)?.horario}` : ''}
                            </Badge>
                          )}
                        </span>
                      </Link>

                      <span className="hidden shrink-0 text-xs text-rs-gray-500 sm:block">
                        {a.frequencia30d}% em 30d
                      </span>

                      {/* Botões grandes o suficiente para uso no tatame, no celular */}
                      <div className="flex w-full shrink-0 gap-1.5 sm:w-auto">
                        {OPCOES.map(({ id, label, Icone, classe }) => {
                          const ativo = st === id
                          return (
                            <button
                              key={id}
                              onClick={() => marcarPresenca(aulaSelecionada.id, data, a.id, id)}
                              aria-pressed={ativo}
                              aria-label={`${label}: ${a.nome}`}
                              className={cn(
                                'inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors sm:flex-none',
                                ativo ? classe : 'border-rs-gray-300 bg-white text-rs-gray-500 hover:border-rs-gray-500 hover:text-rs-ink',
                              )}
                            >
                              <Icone className="size-4" />
                              <span className={cn(ativo ? 'inline' : 'hidden sm:inline')}>{label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
