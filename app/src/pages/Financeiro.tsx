import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDownRight, ArrowUpRight, Plus, Trash2, Wallet } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Carregando, EmptyState, ErroCarga, PageHeader, Tabs } from '@/components/ui/Misc'
import { StatCard } from '@/components/ui/StatCard'
import { useAlunos } from '@/api/alunos'
import {
  useCategorias,
  useRemoverTransacao,
  useSalvarTransacao,
  useSerieFinanceira,
  useTransacoes,
} from '@/api/financeiro'
import { mensagemDeErro } from '@/lib/api'
import { brl, dataCurta, hojeISO } from '@/lib/format'
import type { TipoTransacao, Transacao } from '@/types'
import { cn } from '@/lib/cn'
import { Mensalidades } from './financeiro/Mensalidades'

const PALETA_DESPESA = [
  '#1764a8',
  '#246db1',
  '#7fabd8',
  '#667085',
  '#d40000',
  '#b30000',
  '#12805c',
  '#b25e09',
  '#d0d6de',
]

const METODO: Record<Transacao['metodo'], string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  boleto: 'Boleto',
  transferencia: 'Transferência',
}

const VAZIO = (): Transacao => ({
  id: '',
  tipo: 'receita',
  categoriaId: '',
  categoria: '',
  descricao: '',
  valor: 0,
  data: hojeISO(),
  metodo: 'pix',
  conciliada: false,
})

/** Os 12 meses até o atual (YYYY-MM), do mais recente para o mais antigo. */
const ultimosMeses = () => {
  const [a, m] = hojeISO().split('-').map(Number)
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(a, m - 1 - i, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

const rotuloMes = (m: string) => {
  const s = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(`${m}-01T12:00:00`))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const mesCurto = (m: string) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(`${m}-01T12:00:00`)).replace('.', '')

export function Financeiro() {
  const [secao, setSecao] = useState<'lancamentos' | 'mensalidades'>('lancamentos')
  const [meses] = useState(ultimosMeses)
  const [mes, setMes] = useState(meses[0])

  return (
    <>
      <PageHeader titulo="Financeiro" subtitulo="Mensalidades, receitas, despesas e resultado da academia mês a mês." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          valor={secao}
          aoMudar={setSecao}
          itens={[
            { id: 'lancamentos', label: 'Lançamentos' },
            { id: 'mensalidades', label: 'Mensalidades' },
          ]}
        />
        <Select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          wrapClass="w-full sm:ml-auto sm:w-52"
          aria-label="Mês de referência"
        >
          {meses.map((m) => (
            <option key={m} value={m}>
              {rotuloMes(m)}
            </option>
          ))}
        </Select>
      </div>

      {secao === 'lancamentos' ? <Lancamentos mes={mes} /> : <Mensalidades competencia={mes} />}
    </>
  )
}

function Lancamentos({ mes }: { mes: string }) {
  const consulta = useTransacoes(mes)
  const serie = useSerieFinanceira(6)
  const categorias = useCategorias().data ?? []
  const alunos = useAlunos().data ?? []
  const salvar = useSalvarTransacao()
  const remover = useRemoverTransacao()

  const [aba, setAba] = useState<'todos' | TipoTransacao>('todos')
  const [aberto, setAberto] = useState(false)
  const [dados, setDados] = useState<Transacao>(VAZIO())
  const [erro, setErro] = useState('')
  const [erroLista, setErroLista] = useState('')

  const doMes = useMemo(() => consulta.data?.itens ?? [], [consulta.data])
  const listadas = useMemo(() => (aba === 'todos' ? doMes : doMes.filter((t) => t.tipo === aba)), [doMes, aba])

  const porCategoria = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of doMes.filter((x) => x.tipo === 'despesa')) m.set(t.categoria, (m.get(t.categoria) ?? 0) + t.valor)
    return [...m.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor)
  }, [doMes])

  const categoriasDo = (tipo: TipoTransacao) => categorias.filter((c) => c.tipo === tipo && c.ativa)

  const abrir = (tipo: TipoTransacao) => {
    setDados({ ...VAZIO(), tipo, categoriaId: categoriasDo(tipo)[0]?.id ?? '' })
    setErro('')
    setAberto(true)
  }

  const submeter = () => {
    if (dados.descricao.trim().length < 2) return setErro('Descreva o lançamento.')
    if (!(dados.valor > 0)) return setErro('Informe um valor maior que zero.')
    if (!dados.categoriaId) return setErro('Escolha a categoria. Se não houver, cadastre uma em Configurações.')
    salvar.mutate(dados, { onSuccess: () => setAberto(false), onError: (e) => setErro(mensagemDeErro(e)) })
  }

  const removerLancamento = (t: Transacao) => {
    setErroLista('')
    remover.mutate(t.id, { onError: (e) => setErroLista(mensagemDeErro(e)) })
  }

  if (consulta.isError)
    return <ErroCarga mensagem={mensagemDeErro(consulta.error)} aoTentarDeNovo={() => consulta.refetch()} />
  if (consulta.isPending) return <Carregando />

  const { receita, despesa } = consulta.data
  const resultado = receita - despesa
  const margem = receita ? (resultado / receita) * 100 : 0
  const dadosGrafico = (serie.data ?? []).map((m) => ({ ...m, mes: mesCurto(m.mes) }))

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-rs-gray-500">{doMes.length} lançamentos no período</p>
        <div className="flex flex-wrap gap-2">
          <Button variante="contorno" onClick={() => abrir('despesa')}>
            <ArrowDownRight className="size-4" />
            Nova despesa
          </Button>
          <Button variante="primaria" onClick={() => abrir('receita')}>
            <Plus className="size-4" />
            Nova receita
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Receita do mês" valor={brl(receita)} icone={<ArrowUpRight className="size-5" />} />
        <StatCard label="Despesas do mês" valor={brl(despesa)} icone={<ArrowDownRight className="size-5" />} />
        <StatCard
          label="Resultado"
          valor={brl(resultado)}
          icone={<Wallet className="size-5" />}
          nota={resultado >= 0 ? 'Mês positivo' : 'Mês no vermelho'}
        />
        <StatCard label="Margem" valor={Math.round(margem)} sufixo="%" nota="Resultado sobre receita" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader titulo="Receita x despesa" descricao="Últimos seis meses" />
          <CardBody className="pl-1">
            {serie.isError ? (
              <ErroCarga mensagem={mensagemDeErro(serie.error)} aoTentarDeNovo={() => serie.refetch()} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dadosGrafico} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                  <CartesianGrid stroke="#e4e8ed" vertical={false} />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#667085' }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    tick={{ fontSize: 12, fill: '#667085' }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v) => brl(Number(v))}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e4e8ed', fontSize: 13 }}
                    cursor={{ fill: '#f2f4f6' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="receita" name="Receita" fill="#1764a8" radius={[4, 4, 0, 0]} maxBarSize={38} />
                  <Bar dataKey="despesa" name="Despesa" fill="#d0d6de" radius={[4, 4, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader titulo="Para onde vai o dinheiro" descricao="Despesas do mês por categoria" />
          <CardBody>
            {porCategoria.length === 0 ? (
              <EmptyState
                icone={<Wallet className="size-6" />}
                titulo="Sem despesas"
                mensagem="Nenhuma despesa registrada neste mês."
              />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={porCategoria}
                      dataKey="valor"
                      nameKey="nome"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={2}
                    >
                      {porCategoria.map((_, i) => (
                        <Cell key={i} fill={PALETA_DESPESA[i % PALETA_DESPESA.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => brl(Number(v))}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e4e8ed', fontSize: 13 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="mt-3 space-y-1.5">
                  {porCategoria.slice(0, 6).map((c, i) => (
                    <li key={c.nome} className="flex items-center gap-2.5 text-sm">
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: PALETA_DESPESA[i % PALETA_DESPESA.length] }}
                      />
                      <span className="min-w-0 flex-1 truncate text-rs-gray-700">{c.nome}</span>
                      <span className="shrink-0 font-semibold text-rs-ink">{brl(c.valor)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="px-2 pt-1">
          <Tabs
            valor={aba}
            aoMudar={setAba}
            itens={[
              { id: 'todos', label: 'Todos', contagem: doMes.length },
              { id: 'receita', label: 'Receitas', contagem: doMes.filter((t) => t.tipo === 'receita').length },
              { id: 'despesa', label: 'Despesas', contagem: doMes.filter((t) => t.tipo === 'despesa').length },
            ]}
          />
        </div>

        {erroLista && (
          <p
            role="alert"
            className="border-b border-rs-red-100 bg-rs-red-50 px-5 py-3 text-sm font-medium text-rs-red-700"
          >
            {erroLista}
          </p>
        )}

        {listadas.length === 0 ? (
          <EmptyState
            icone={<Wallet className="size-6" />}
            titulo="Nenhum lançamento"
            mensagem="Registre a primeira movimentação deste mês."
            acao={
              <Button variante="secundaria" onClick={() => abrir('receita')}>
                <Plus className="size-4" />
                Nova receita
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-rs-gray-200">
                  {['Data', 'Descrição', 'Categoria', 'Método', 'Valor', 'Situação', ''].map((h) => (
                    <th key={h} className="rs-label px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rs-gray-200">
                {listadas.map((t) => (
                  <tr key={t.id} className="group hover:bg-rs-gray-50">
                    <td className="px-5 py-3 text-sm text-rs-gray-700">{dataCurta(t.data)}</td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className={cn(
                            'grid size-6 shrink-0 place-items-center rounded-full',
                            t.tipo === 'receita'
                              ? 'bg-rs-success-bg text-rs-success'
                              : 'bg-rs-gray-100 text-rs-gray-700',
                          )}
                        >
                          {t.tipo === 'receita' ? (
                            <ArrowUpRight className="size-3.5" />
                          ) : (
                            <ArrowDownRight className="size-3.5" />
                          )}
                        </span>
                        <span className="min-w-0 truncate text-sm font-semibold text-rs-ink">{t.descricao}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-rs-gray-700">{t.categoria}</td>
                    <td className="px-5 py-3 text-sm text-rs-gray-700">{METODO[t.metodo]}</td>
                    <td
                      className={cn(
                        'px-5 py-3 text-sm font-bold',
                        t.tipo === 'receita' ? 'text-rs-success' : 'text-rs-ink',
                      )}
                    >
                      {t.tipo === 'receita' ? '+' : '−'} {brl(t.valor)}
                    </td>
                    <td className="px-5 py-3">
                      {t.cobrancaId ? (
                        <Badge tom="azul">Mensalidade</Badge>
                      ) : (
                        <Badge tom={t.conciliada ? 'ok' : 'alerta'}>{t.conciliada ? 'Conciliado' : 'A conferir'}</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {/* Lançamento de mensalidade só sai desfazendo a baixa, na aba Mensalidades. */}
                      {!t.cobrancaId && (
                        <button
                          onClick={() => removerLancamento(t)}
                          disabled={remover.isPending}
                          aria-label={`Remover ${t.descricao}`}
                          className="cursor-pointer rounded-md p-2 text-rs-gray-500 opacity-0 transition-opacity hover:bg-rs-red-50 hover:text-rs-red-600 focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo={dados.tipo === 'receita' ? 'Registrar receita' : 'Registrar despesa'}
        descricao="Todo lançamento entra no resultado do mês da data informada. Para mensalidade, use a aba Mensalidades."
        largura="sm"
        rodape={
          <>
            <Button variante="fantasma" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button variante="primaria" onClick={submeter} disabled={salvar.isPending}>
              {salvar.isPending ? 'Registrando…' : 'Registrar'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Descrição"
            value={dados.descricao}
            onChange={(e) => setDados({ ...dados, descricao: e.target.value })}
            placeholder={dados.tipo === 'receita' ? 'Ex.: Venda de quimono' : 'Ex.: Conta de energia'}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Valor (R$)"
              type="number"
              min={0}
              step={0.01}
              value={dados.valor || ''}
              onChange={(e) => setDados({ ...dados, valor: Number(e.target.value) })}
            />
            <Input
              label="Data"
              type="date"
              value={dados.data}
              onChange={(e) => setDados({ ...dados, data: e.target.value })}
            />
            <Select
              label="Categoria"
              value={dados.categoriaId}
              onChange={(e) => setDados({ ...dados, categoriaId: e.target.value })}
            >
              {categoriasDo(dados.tipo).length === 0 && <option value="">Nenhuma categoria cadastrada</option>}
              {categoriasDo(dados.tipo).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
            <Select
              label="Método"
              value={dados.metodo}
              onChange={(e) => setDados({ ...dados, metodo: e.target.value as Transacao['metodo'] })}
            >
              {Object.entries(METODO).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          {dados.tipo === 'receita' && (
            <Select
              label="Vincular a um aluno"
              hint="Opcional: vincula o lançamento ao cadastro do aluno."
              value={dados.alunoId ?? ''}
              onChange={(e) => setDados({ ...dados, alunoId: e.target.value || undefined })}
            >
              <option value="">Sem vínculo</option>
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </Select>
          )}

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
