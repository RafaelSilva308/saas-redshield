import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, CheckCircle2, CreditCard, Plus, Users } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Switch, Textarea } from '@/components/ui/Field'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Carregando, EmptyState, ErroCarga, PageHeader, Progress } from '@/components/ui/Misc'
import { usePlanos, useSalvarPlano } from '@/api/planos'
import { useAlunos } from '@/api/alunos'
import { mensagemDeErro } from '@/lib/api'
import { brl } from '@/lib/format'
import type { Periodicidade, Plano } from '@/types'
import { cn } from '@/lib/cn'

const ROTULO_PERIODO: Record<Periodicidade, string> = {
  mensal: '/mês',
  trimestral: '/trimestre',
  semestral: '/semestre',
  anual: '/ano',
}

const VAZIO: Plano = {
  id: '',
  nome: '',
  descricao: '',
  valor: 180,
  periodicidade: 'mensal',
  aulasPorSemana: 2,
  ativo: true,
}

export function Planos() {
  const consultaPlanos = usePlanos()
  const consultaAlunos = useAlunos()
  const salvar = useSalvarPlano()
  const planos = useMemo(() => consultaPlanos.data ?? [], [consultaPlanos.data])
  const alunos = useMemo(() => consultaAlunos.data ?? [], [consultaAlunos.data])
  const [aberto, setAberto] = useState(false)
  const [emEdicao, setEmEdicao] = useState<Plano | null>(null)
  const [dados, setDados] = useState<Plano>(VAZIO)
  const [erro, setErro] = useState('')

  const porPlano = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of alunos) if (a.status !== 'inativo') m.set(a.planoId, (m.get(a.planoId) ?? 0) + 1)
    return m
  }, [alunos])

  const totalMatriculados = [...porPlano.values()].reduce((s, n) => s + n, 0)

  // Agenda de vencimentos: quantos alunos vencem em cada dia do mês
  const vencimentos = useMemo(() => {
    const m = new Map<number, number>()
    for (const a of alunos.filter((x) => x.status === 'ativo')) {
      m.set(a.vencimentoDia, (m.get(a.vencimentoDia) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0])
  }, [alunos])

  const abrir = (p: Plano | null) => {
    setEmEdicao(p)
    setDados(p ?? VAZIO)
    setErro('')
    setAberto(true)
  }

  const submeter = () => {
    if (dados.nome.trim().length < 3) return setErro('Dê um nome claro ao plano.')
    if (!(dados.valor > 0)) return setErro('Informe um valor maior que zero.')
    salvar.mutate(dados, {
      onSuccess: () => setAberto(false),
      onError: (e) => setErro(mensagemDeErro(e)),
    })
  }

  const [erroAlternar, setErroAlternar] = useState('')
  const alternar = (p: Plano) => {
    setErroAlternar('')
    salvar.mutate({ ...p, ativo: !p.ativo }, { onError: (e) => setErroAlternar(mensagemDeErro(e)) })
  }

  const falha = consultaPlanos.error ?? consultaAlunos.error
  if (falha)
    return (
      <ErroCarga
        mensagem={mensagemDeErro(falha)}
        aoTentarDeNovo={() => {
          consultaPlanos.refetch()
          consultaAlunos.refetch()
        }}
      />
    )
  if (consultaPlanos.isPending || consultaAlunos.isPending) return <Carregando />

  return (
    <>
      <PageHeader
        titulo="Planos e vencimentos"
        subtitulo="Defina os planos oferecidos, os valores e em que dia cada aluno paga."
        acoes={
          <Button variante="primaria" onClick={() => abrir(null)}>
            <Plus className="size-4" />
            Criar plano
          </Button>
        }
      />

      {erroAlternar && (
        <p role="alert" className="mb-4 rounded-md border border-rs-red-100 bg-rs-red-50 px-3 py-2 text-sm font-medium text-rs-red-700">
          {erroAlternar}
        </p>
      )}

      {planos.length === 0 && (
        <Card>
          <EmptyState
            icone={<CreditCard className="size-6" />}
            titulo="Nenhum plano cadastrado"
            mensagem="Crie o primeiro plano para poder matricular alunos e gerar cobranças."
          />
        </Card>
      )}

      {/* Grade de planos */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {planos.map((p) => {
          const matriculados = porPlano.get(p.id) ?? 0
          const participacao = totalMatriculados ? Math.round((matriculados / totalMatriculados) * 100) : 0
          return (
            <Card key={p.id} className={cn('flex flex-col', !p.ativo && 'opacity-70')}>
              <div className="flex-1 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="rs-title text-xl text-rs-ink">{p.nome}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-rs-gray-500">{p.descricao}</p>
                  </div>
                  <Badge tom={p.ativo ? 'ok' : 'neutro'}>{p.ativo ? 'Ativo' : 'Pausado'}</Badge>
                </div>

                <p className="mt-5 flex items-baseline gap-1">
                  <span className="rs-metric text-rs-ink">{brl(p.valor)}</span>
                  <span className="text-sm text-rs-gray-500">{ROTULO_PERIODO[p.periodicidade]}</span>
                </p>

                <ul className="mt-4 space-y-2 text-sm text-rs-gray-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-rs-blue-600" />
                    {p.aulasPorSemana === 'ilimitado'
                      ? 'Aulas ilimitadas em todas as turmas'
                      : `${p.aulasPorSemana} aulas por semana`}
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="size-4 shrink-0 text-rs-blue-600" />
                    {matriculados} aluno{matriculados === 1 ? '' : 's'} matriculado{matriculados === 1 ? '' : 's'}
                  </li>
                  <li className="flex items-center gap-2">
                    <CreditCard className="size-4 shrink-0 text-rs-blue-600" />
                    Receita estimada {brl(matriculados * p.valor)}
                  </li>
                </ul>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-baseline justify-between text-xs text-rs-gray-500">
                    <span>Participação na base</span>
                    <span className="font-semibold text-rs-ink">{participacao}%</span>
                  </div>
                  <Progress valor={participacao} />
                </div>
              </div>

              <footer className="flex items-center gap-2 border-t border-rs-gray-200 bg-rs-gray-50 px-5 py-3">
                <Button variante="contorno" tamanho="sm" onClick={() => abrir(p)}>
                  Editar
                </Button>
                <Button variante="fantasma" tamanho="sm" onClick={() => alternar(p)} disabled={salvar.isPending}>
                  {p.ativo ? 'Pausar' : 'Reativar'}
                </Button>
                <Link
                  to={`/alunos?plano=${p.id}`}
                  className="ml-auto text-xs font-semibold uppercase tracking-wider text-rs-blue-600 hover:underline"
                >
                  Ver alunos
                </Link>
              </footer>
            </Card>
          )
        })}
      </div>

      {/* Calendário de vencimentos */}
      <Card className="mt-4">
        <CardHeader
          titulo="Agenda de vencimentos"
          descricao="Distribuição das cobranças ao longo do mês — evita concentrar tudo num único dia"
        />
        {vencimentos.length === 0 ? (
          <EmptyState icone={<CalendarClock className="size-6" />} titulo="Sem vencimentos" mensagem="Cadastre alunos ativos para ver a distribuição." />
        ) : (
          <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {vencimentos.map(([dia, qtd]) => {
              const receita = alunos
                .filter((a) => a.status === 'ativo' && a.vencimentoDia === dia)
                .reduce((s, a) => {
                  const p = planos.find((x) => x.id === a.planoId)
                  if (!p) return s
                  return s + (p.periodicidade === 'anual' ? p.valor / 12 : p.valor)
                }, 0)
              return (
                <div key={dia} className="rounded-md border border-rs-gray-200 p-4">
                  <p className="rs-label">Dia {dia}</p>
                  <p className="rs-metric mt-2 text-rs-ink">{qtd}</p>
                  <p className="mt-1 text-xs text-rs-gray-500">alunos · {brl(receita)}</p>
                </div>
              )
            })}
          </CardBody>
        )}
      </Card>

      {/* Formulário de plano */}
      <Modal
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo={emEdicao ? 'Editar plano' : 'Criar plano'}
        descricao="Planos definem o valor cobrado e quantas aulas o aluno pode fazer por semana."
        rodape={
          <>
            <Button variante="fantasma" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button variante="primaria" onClick={submeter} disabled={salvar.isPending}>
              {salvar.isPending ? 'Salvando…' : emEdicao ? 'Salvar alterações' : 'Criar plano'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome do plano"
            value={dados.nome}
            onChange={(e) => setDados({ ...dados, nome: e.target.value })}
            placeholder="Ex.: Integral"
          />
          <Textarea
            label="Descrição"
            hint="Explique em uma frase o que o aluno ganha com este plano."
            value={dados.descricao}
            onChange={(e) => setDados({ ...dados, descricao: e.target.value })}
            rows={3}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Valor (R$)"
              type="number"
              min={0}
              step={0.01}
              value={dados.valor}
              onChange={(e) => setDados({ ...dados, valor: Number(e.target.value) })}
            />
            <Select
              label="Periodicidade"
              value={dados.periodicidade}
              onChange={(e) => setDados({ ...dados, periodicidade: e.target.value as Periodicidade })}
            >
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </Select>
            <Select
              label="Aulas por semana"
              value={String(dados.aulasPorSemana)}
              onChange={(e) =>
                setDados({
                  ...dados,
                  aulasPorSemana: e.target.value === 'ilimitado' ? 'ilimitado' : Number(e.target.value),
                })
              }
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value="ilimitado">Ilimitado</option>
            </Select>
          </div>

          <div className="border-t border-rs-gray-200 pt-2">
            <Switch
              checked={dados.ativo}
              onChange={(v) => setDados({ ...dados, ativo: v })}
              label="Plano disponível para novas matrículas"
              descricao="Planos pausados continuam valendo para quem já está matriculado."
            />
          </div>

          {erro && (
            <p role="alert" className="rounded-md border border-rs-red-100 bg-rs-red-50 px-3 py-2 text-sm font-medium text-rs-red-700">
              {erro}
            </p>
          )}
        </div>
      </Modal>
    </>
  )
}
