import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, CheckCircle2, Clock, Receipt, TriangleAlert } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Field'
import { Badge } from '@/components/ui/Badge'
import { Carregando, EmptyState, ErroCarga, Tabs } from '@/components/ui/Misc'
import { StatCard } from '@/components/ui/StatCard'
import { useAcoesCobranca, useCobrancas, type Metodo } from '@/api/financeiro'
import type { Cobranca, SituacaoCobranca } from '@/api/alunos'
import { mensagemDeErro } from '@/lib/api'
import { brl, dataCurta, hojeISO } from '@/lib/format'

/* Mensalidades do mês (competência). A v1 não tem cobrança automática (V6):
   o gestor gera as cobranças do mês e dá baixa quando o aluno paga. A baixa cria o lançamento de receita. */

const SITUACAO: Record<SituacaoCobranca, { label: string; tom: 'ok' | 'alerta' | 'urgente' | 'neutro' }> = {
  paga: { label: 'Paga', tom: 'ok' },
  aberta: { label: 'A vencer', tom: 'alerta' },
  atrasada: { label: 'Atrasada', tom: 'urgente' },
  cancelada: { label: 'Cancelada', tom: 'neutro' },
}

const METODOS: [Metodo, string][] = [
  ['pix', 'PIX'],
  ['dinheiro', 'Dinheiro'],
  ['cartao', 'Cartão'],
  ['boleto', 'Boleto'],
  ['transferencia', 'Transferência'],
]

type Filtro = SituacaoCobranca | 'todas'

export function Mensalidades({ competencia }: { competencia: string }) {
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const consulta = useCobrancas(competencia, filtro)
  const { gerar, pagar, estornar, cancelar } = useAcoesCobranca()
  const [metodo, setMetodo] = useState<Metodo>('pix')
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null)

  // O servidor só gera até o mês seguinte; meses passados também podem ser gerados (idempotente).
  const mesAtual = hojeISO().slice(0, 7)

  const agir = (promessa: Promise<unknown>, sucesso?: string) => {
    setAviso(null)
    promessa.then(
      () => sucesso && setAviso({ tom: 'ok', texto: sucesso }),
      (e) => setAviso({ tom: 'erro', texto: mensagemDeErro(e) }),
    )
  }

  const gerarDoMes = () =>
    agir(
      gerar.mutateAsync(competencia).then((r) => {
        setAviso({
          tom: 'ok',
          texto: r.criadas
            ? `${r.criadas} cobrança${r.criadas > 1 ? 's' : ''} gerada${r.criadas > 1 ? 's' : ''}.`
            : 'Nenhuma cobrança nova: todos os alunos ativos com plano já têm a deste mês.',
        })
      }),
    )

  const darBaixa = (c: Cobranca) =>
    agir(pagar.mutateAsync({ id: c.id, metodo, data: hojeISO() }), `Pagamento de ${c.alunoNome} registrado.`)

  if (consulta.isError)
    return <ErroCarga mensagem={mensagemDeErro(consulta.error)} aoTentarDeNovo={() => consulta.refetch()} />
  if (consulta.isPending) return <Carregando />

  const { itens, resumo } = consulta.data
  const ocupado = gerar.isPending || pagar.isPending || estornar.isPending || cancelar.isPending

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-sm text-rs-gray-500">
          Gere as cobranças do mês a partir do plano e do dia de vencimento de cada aluno ativo, e dê baixa quando ele
          pagar. Gerar de novo não duplica.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Select
            label="Método da baixa"
            value={metodo}
            onChange={(e) => setMetodo(e.target.value as Metodo)}
            wrapClass="w-40"
          >
            {METODOS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </Select>
          <Button variante="primaria" onClick={gerarDoMes} disabled={ocupado || competencia > mesAtual}>
            <Receipt className="size-4" />
            {gerar.isPending ? 'Gerando…' : 'Gerar cobranças do mês'}
          </Button>
        </div>
      </div>

      {aviso && (
        <p
          role={aviso.tom === 'erro' ? 'alert' : 'status'}
          className={
            aviso.tom === 'erro'
              ? 'mb-4 rounded-md border border-rs-red-100 bg-rs-red-50 px-3 py-2 text-sm font-medium text-rs-red-700'
              : 'mb-4 rounded-md border border-rs-gray-200 bg-rs-gray-50 px-3 py-2 text-sm text-rs-gray-700'
          }
        >
          {aviso.texto}
        </p>
      )}

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Recebido" valor={brl(resumo.pago)} icone={<CheckCircle2 className="size-5" />} />
        <StatCard label="A vencer" valor={brl(resumo.aVencer)} icone={<Clock className="size-5" />} />
        <StatCard label="Atrasado" valor={brl(resumo.atrasado)} icone={<TriangleAlert className="size-5" />} />
      </div>

      <Card>
        <div className="px-2 pt-1">
          <Tabs<Filtro>
            valor={filtro}
            aoMudar={setFiltro}
            itens={[
              { id: 'todas', label: 'Todas' },
              { id: 'atrasada', label: 'Atrasadas' },
              { id: 'aberta', label: 'A vencer' },
              { id: 'paga', label: 'Pagas' },
              { id: 'cancelada', label: 'Canceladas' },
            ]}
          />
        </div>

        {itens.length === 0 ? (
          <EmptyState
            icone={<CalendarClock className="size-6" />}
            titulo="Nenhuma cobrança"
            mensagem={
              filtro === 'todas'
                ? 'Ainda não há cobranças neste mês. Use "Gerar cobranças do mês".'
                : 'Nenhuma cobrança nesta situação.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-rs-gray-200">
                  {['Aluno', 'Vencimento', 'Valor', 'Situação', 'Pago em', ''].map((h) => (
                    <th key={h} className="rs-label px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rs-gray-200">
                {itens.map((c) => (
                  <tr key={c.id} className="hover:bg-rs-gray-50">
                    <td className="px-5 py-3">
                      <Link
                        to={`/alunos/${c.alunoId}`}
                        className="text-sm font-semibold text-rs-ink hover:text-rs-blue-600"
                      >
                        {c.alunoNome}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm text-rs-gray-700">{dataCurta(c.vencimento)}</td>
                    <td className="px-5 py-3 text-sm font-bold text-rs-ink">{brl(c.valor)}</td>
                    <td className="px-5 py-3">
                      <Badge tom={SITUACAO[c.situacao].tom}>
                        {SITUACAO[c.situacao].label}
                        {c.diasAtraso > 0 && ` · ${c.diasAtraso} dia${c.diasAtraso > 1 ? 's' : ''}`}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-rs-gray-700">{c.pagoEm ? dataCurta(c.pagoEm) : '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        {c.status === 'aberta' && (
                          <>
                            <Button tamanho="sm" variante="secundaria" disabled={ocupado} onClick={() => darBaixa(c)}>
                              Registrar pagamento
                            </Button>
                            <Button
                              tamanho="sm"
                              variante="fantasma"
                              disabled={ocupado}
                              onClick={() => agir(cancelar.mutateAsync(c.id))}
                            >
                              Cancelar
                            </Button>
                          </>
                        )}
                        {c.status === 'paga' && (
                          <Button
                            tamanho="sm"
                            variante="fantasma"
                            disabled={ocupado}
                            onClick={() => agir(estornar.mutateAsync(c.id))}
                          >
                            Desfazer baixa
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
