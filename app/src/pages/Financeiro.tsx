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
import { EmptyState, PageHeader, Tabs } from '@/components/ui/Misc'
import { StatCard } from '@/components/ui/StatCard'
import { useStore } from '@/app/store'
import { serieFinanceira } from '@/data/selectors'
import { brl, dataCurta } from '@/lib/format'
import type { TipoTransacao, Transacao } from '@/types'
import { cn } from '@/lib/cn'

const CATEGORIAS = {
  receita: ['Mensalidade', 'Matrícula', 'Loja', 'Seminário', 'Exame de faixa', 'Outros'],
  despesa: ['Aluguel', 'Energia', 'Água', 'Materiais', 'Marketing', 'Equipe', 'Manutenção', 'Impostos', 'Outros'],
}

const PALETA_DESPESA = ['#1764a8', '#246db1', '#7fabd8', '#667085', '#d40000', '#b30000', '#12805c', '#b25e09', '#d0d6de']

const VAZIO = (): Transacao => ({
  id: '',
  tipo: 'receita',
  categoria: 'Mensalidade',
  descricao: '',
  valor: 0,
  data: new Date().toISOString().slice(0, 10),
  metodo: 'pix',
  conciliada: false,
})

export function Financeiro() {
  const { transacoes, alunos, salvarTransacao, removerTransacao } = useStore()
  const [aba, setAba] = useState<'todos' | TipoTransacao>('todos')
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const [aberto, setAberto] = useState(false)
  const [dados, setDados] = useState<Transacao>(VAZIO())
  const [erro, setErro] = useState('')

  const mesesDisponiveis = useMemo(() => {
    const set = new Set(transacoes.map((t) => t.data.slice(0, 7)))
    return [...set].sort((a, b) => b.localeCompare(a)).slice(0, 12)
  }, [transacoes])

  const doMes = useMemo(() => transacoes.filter((t) => t.data.slice(0, 7) === mes), [transacoes, mes])

  const receita = doMes.filter((t) => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
  const despesa = doMes.filter((t) => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
  const resultado = receita - despesa
  const margem = receita ? (resultado / receita) * 100 : 0

  const listadas = useMemo(
    () => (aba === 'todos' ? doMes : doMes.filter((t) => t.tipo === aba)),
    [doMes, aba],
  )

  const porCategoria = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of doMes.filter((x) => x.tipo === 'despesa')) {
      m.set(t.categoria, (m.get(t.categoria) ?? 0) + t.valor)
    }
    return [...m.entries()].map(([nome, valor]) => ({ nome, valor: Math.round(valor) })).sort((a, b) => b.valor - a.valor)
  }, [doMes])

  const submeter = () => {
    if (!dados.descricao.trim()) return setErro('Descreva o lançamento.')
    if (dados.valor <= 0) return setErro('Informe um valor maior que zero.')
    salvarTransacao(dados)
    setAberto(false)
  }

  const abrir = (tipo: TipoTransacao) => {
    setDados({ ...VAZIO(), tipo, categoria: CATEGORIAS[tipo][0] })
    setErro('')
    setAberto(true)
  }

  const rotuloMes = (m: string) => {
    const d = new Date(`${m}-01T12:00:00`)
    const s = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d)
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  return (
    <>
      <PageHeader
        titulo="Financeiro"
        subtitulo="Receitas, despesas e resultado da academia mês a mês."
        acoes={
          <>
            <Button variante="contorno" onClick={() => abrir('despesa')}>
              <ArrowDownRight className="size-4" />
              Nova despesa
            </Button>
            <Button variante="primaria" onClick={() => abrir('receita')}>
              <Plus className="size-4" />
              Nova receita
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={mes} onChange={(e) => setMes(e.target.value)} wrapClass="w-full sm:w-52" aria-label="Mês de referência">
          {mesesDisponiveis.map((m) => (
            <option key={m} value={m}>
              {rotuloMes(m)}
            </option>
          ))}
        </Select>
        <p className="text-sm text-rs-gray-500">{doMes.length} lançamentos no período</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
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
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={serieFinanceira()} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
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
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader titulo="Para onde vai o dinheiro" descricao="Despesas do mês por categoria" />
          <CardBody>
            {porCategoria.length === 0 ? (
              <EmptyState icone={<Wallet className="size-6" />} titulo="Sem despesas" mensagem="Nenhuma despesa registrada neste mês." />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={porCategoria} dataKey="valor" nameKey="nome" innerRadius={52} outerRadius={82} paddingAngle={2}>
                      {porCategoria.map((_, i) => (
                        <Cell key={i} fill={PALETA_DESPESA[i % PALETA_DESPESA.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => brl(Number(v))} contentStyle={{ borderRadius: 8, border: '1px solid #e4e8ed', fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="mt-3 space-y-1.5">
                  {porCategoria.slice(0, 6).map((c, i) => (
                    <li key={c.nome} className="flex items-center gap-2.5 text-sm">
                      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: PALETA_DESPESA[i % PALETA_DESPESA.length] }} />
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
            <table className="rs-tabela-cartoes w-full min-w-[760px] text-left">
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
                    <td data-principal className="px-5 py-3 text-sm text-rs-gray-700">{dataCurta(t.data)}</td>
                    <td data-label="Descrição" className="px-5 py-3">
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className={cn(
                            'grid size-6 shrink-0 place-items-center rounded-full',
                            t.tipo === 'receita' ? 'bg-rs-success-bg text-rs-success' : 'bg-rs-gray-100 text-rs-gray-700',
                          )}
                        >
                          {t.tipo === 'receita' ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                        </span>
                        <span className="min-w-0 truncate text-sm font-semibold text-rs-ink">{t.descricao}</span>
                      </span>
                    </td>
                    <td data-label="Categoria" className="px-5 py-3 text-sm text-rs-gray-700">{t.categoria}</td>
                    <td data-label="Método" className="px-5 py-3 text-sm capitalize text-rs-gray-700">{t.metodo}</td>
                    <td data-label="Valor" className={cn('px-5 py-3 text-sm font-bold', t.tipo === 'receita' ? 'text-rs-success' : 'text-rs-ink')}>
                      {t.tipo === 'receita' ? '+' : '−'} {brl(t.valor)}
                    </td>
                    <td data-label="Situação" className="px-5 py-3">
                      <Badge tom={t.conciliada ? 'ok' : 'alerta'}>{t.conciliada ? 'Conciliado' : 'A conferir'}</Badge>
                    </td>
                    <td data-acoes className="px-5 py-3 text-right">
                      <button
                        onClick={() => removerTransacao(t.id)}
                        aria-label={`Remover ${t.descricao}`}
                        className="cursor-pointer rounded-md p-2 text-rs-gray-500 opacity-0 transition-opacity hover:bg-rs-red-50 hover:text-rs-red-600 focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 className="size-4" />
                      </button>
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
        descricao="Todo lançamento entra no resultado do mês da data informada."
        largura="sm"
        rodape={
          <>
            <Button variante="fantasma" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button variante="primaria" onClick={submeter}>
              Registrar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Descrição"
            value={dados.descricao}
            onChange={(e) => setDados({ ...dados, descricao: e.target.value })}
            placeholder={dados.tipo === 'receita' ? 'Ex.: Mensalidade — Maria Santos' : 'Ex.: Conta de energia'}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Valor (R$)"
              type="number"
              min={0}
              step={10}
              value={dados.valor || ''}
              onChange={(e) => setDados({ ...dados, valor: Number(e.target.value) })}
            />
            <Input label="Data" type="date" value={dados.data} onChange={(e) => setDados({ ...dados, data: e.target.value })} />
            <Select label="Categoria" value={dados.categoria} onChange={(e) => setDados({ ...dados, categoria: e.target.value })}>
              {CATEGORIAS[dados.tipo].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select
              label="Método"
              value={dados.metodo}
              onChange={(e) => setDados({ ...dados, metodo: e.target.value as Transacao['metodo'] })}
            >
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão</option>
              <option value="boleto">Boleto</option>
              <option value="transferencia">Transferência</option>
            </Select>
          </div>

          {dados.tipo === 'receita' && (
            <Select
              label="Vincular a um aluno"
              hint="Opcional — vincular faz o lançamento aparecer na ficha do aluno."
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
            <p role="alert" className="rounded-md border border-rs-red-100 bg-rs-red-50 px-3 py-2 text-sm font-medium text-rs-red-700">
              {erro}
            </p>
          )}
        </div>
      </Modal>
    </>
  )
}
