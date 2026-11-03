import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCelular } from '@/lib/tela'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FaixaBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import {
  Carregando,
  EmptyState,
  ErroCarga,
  PageHeader,
  Progress as Barra,
  ProgressRing,
  Tabs,
} from '@/components/ui/Misc'
import { useAuth } from '@/app/auth'
import { useAlunos, useGraduar } from '@/api/alunos'
import { useElegiveis, useFaixas, type Elegivel } from '@/api/metricas'
import { mensagemDeErro } from '@/lib/api'
import { FAIXAS, hojeISO } from '@/lib/format'
import type { Faixa } from '@/types'
import { ProgressoAluno } from './progresso/ProgressoAluno'

const ORDEM: Faixa[] = ['branca', 'cinza', 'amarela', 'laranja', 'verde', 'azul', 'roxa', 'marrom', 'preta']

/* O aluno vê só o próprio progresso (defeito 8); a equipe vê a academia e os elegíveis. */
export function Progresso() {
  const { usuario } = useAuth()
  return usuario?.papel === 'aluno' ? <ProgressoAluno /> : <ProgressoEquipe />
}

const mesesDesde = (iso: string) => {
  const [a, m] = iso.split('-').map(Number)
  const [ha, hm] = hojeISO().split('-').map(Number)
  return (ha - a) * 12 + (hm - m)
}

function ProgressoEquipe() {
  const [aba, setAba] = useState<'panorama' | 'elegiveis'>('panorama')
  const celular = useCelular()
  const faixas = useFaixas()
  const alunos = useAlunos().data
  const elegiveis = useElegiveis()

  const distribuicao = useMemo(() => {
    const itens = faixas.data?.itens ?? []
    return ORDEM.filter((f) => itens.some((i) => i.faixa === f)).map((f) => {
      const i = itens.find((x) => x.faixa === f)!
      return {
        faixa: f,
        label: FAIXAS[f].label,
        cor: FAIXAS[f].cor === '#e4e8ed' ? '#c4cbd4' : FAIXAS[f].cor,
        qtd: i.qtd,
        pct: i.pct,
      }
    })
  }, [faixas.data])

  const ativos = useMemo(() => (alunos ?? []).filter((a) => a.status === 'ativo'), [alunos])

  if (faixas.isError)
    return <ErroCarga mensagem={mensagemDeErro(faixas.error)} aoTentarDeNovo={() => faixas.refetch()} />
  if (faixas.isPending) return <Carregando />

  const total = faixas.data.total
  const graduados = distribuicao.filter((d) => d.faixa !== 'branca').reduce((s, d) => s + d.qtd, 0)
  const pctGraduados = total ? Math.round((graduados / total) * 100) : 0
  const tempoMedio = ativos.length
    ? Math.round(ativos.reduce((s, a) => s + mesesDesde(a.matriculaEm), 0) / ativos.length)
    : 0

  return (
    <>
      <PageHeader
        titulo="Progresso de faixas"
        subtitulo="Onde cada aluno está na jornada e quem já pode ser avaliado para o próximo grau."
      />

      <div className="mb-4">
        <Tabs
          valor={aba}
          aoMudar={setAba}
          itens={[
            { id: 'panorama', label: 'Panorama' },
            { id: 'elegiveis', label: 'Elegíveis à graduação', contagem: elegiveis.data?.itens.length },
          ]}
        />
      </div>

      {aba === 'panorama' ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader titulo="Alunos graduados" descricao="Acima da faixa branca" />
              <CardBody className="flex flex-wrap items-center justify-center gap-6 py-8">
                <ProgressRing
                  valor={pctGraduados}
                  tamanho={148}
                  centro={
                    <div>
                      <p className="rs-title text-4xl text-rs-ink">
                        {pctGraduados}
                        <span className="text-xl">%</span>
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-rs-gray-500">da base</p>
                    </div>
                  }
                />
                <div className="space-y-3">
                  <div>
                    <p className="rs-label">Graduados</p>
                    <p className="rs-title text-2xl text-rs-ink">{graduados}</p>
                  </div>
                  <div>
                    <p className="rs-label">Faixa branca</p>
                    <p className="rs-title text-2xl text-rs-ink">{total - graduados}</p>
                  </div>
                  <div>
                    <p className="rs-label">Tempo médio de casa</p>
                    <p className="rs-title text-2xl text-rs-ink">
                      {tempoMedio}
                      <span className="text-sm text-rs-gray-500"> meses</span>
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader titulo="Distribuição por faixa" descricao="Alunos ativos em cada graduação" />
              <CardBody className="pl-1">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={distribuicao} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                    <CartesianGrid stroke="#e4e8ed" vertical={false} />
                    <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: celular ? 11 : 12, fill: '#667085' }}
                    interval={0}
                    angle={celular ? -35 : 0}
                    textAnchor={celular ? 'end' : 'middle'}
                    height={celular ? 56 : 30}
                  />
                    <YAxis tickLine={false} axisLine={false} width={32} tick={{ fontSize: 12, fill: '#667085' }} />
                    <Tooltip
                      formatter={(v) => [`${Number(v)} alunos`, 'Total']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e4e8ed', fontSize: 13 }}
                      cursor={{ fill: '#f2f4f6' }}
                    />
                    <Bar dataKey="qtd" radius={[4, 4, 0, 0]} maxBarSize={52}>
                      {distribuicao.map((d) => (
                        <Cell key={d.faixa} fill={d.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader
              titulo="Legenda das faixas"
              descricao="Cor, rótulo e participação — a cor nunca aparece sozinha"
            />
            <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {distribuicao.map((d) => (
                <div key={d.faixa} className="rounded-md border border-rs-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <FaixaBadge faixa={d.faixa} />
                    <span className="rs-title text-xl text-rs-ink">{d.qtd}</span>
                  </div>
                  <Barra valor={d.pct} cor={d.cor} className="mt-3" />
                  <p className="mt-1.5 text-xs text-rs-gray-500">{d.pct}% dos alunos ativos</p>
                </div>
              ))}
            </CardBody>
          </Card>
        </>
      ) : (
        <ListaElegiveis consulta={elegiveis} />
      )}
    </>
  )
}

function ListaElegiveis({ consulta }: { consulta: ReturnType<typeof useElegiveis> }) {
  const graduar = useGraduar()
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null)

  if (consulta.isError)
    return <ErroCarga mensagem={mensagemDeErro(consulta.error)} aoTentarDeNovo={() => consulta.refetch()} />
  if (consulta.isPending) return <Carregando />

  const { regraProvisoria: regra, itens } = consulta.data

  const registrar = (e: Elegivel) => {
    setAviso(null)
    graduar.mutate(
      { id: e.alunoId, faixa: e.proxima.faixa, graus: e.proxima.graus },
      {
        onSuccess: () => {
          setConfirmando(null)
          setAviso({ tom: 'ok', texto: `Graduação de ${e.nome} registrada.` })
        },
        onError: (err) => setAviso({ tom: 'erro', texto: mensagemDeErro(err) }),
      },
    )
  }

  return (
    <Card>
      <CardHeader
        titulo="Elegíveis à graduação"
        descricao={`Regra provisória, até a academia definir o critério (E1): ao menos ${Math.round(regra.diasMinimos / 30)} meses desde a última graduação e ${regra.frequenciaMinima}% de frequência nos últimos 30 dias`}
      />
      {aviso && (
        <p
          role={aviso.tom === 'erro' ? 'alert' : 'status'}
          className={
            aviso.tom === 'erro'
              ? 'border-b border-rs-red-100 bg-rs-red-50 px-5 py-3 text-sm font-medium text-rs-red-700'
              : 'border-b border-rs-gray-200 bg-rs-gray-50 px-5 py-3 text-sm text-rs-gray-700'
          }
        >
          {aviso.texto}
        </p>
      )}
      {itens.length === 0 ? (
        <EmptyState
          icone={<Award className="size-6" />}
          titulo="Ninguém elegível no momento"
          mensagem="Os critérios consideram o tempo desde a última graduação e a frequência recente."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="rs-tabela-cartoes w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-rs-gray-200">
                {['Aluno', 'Faixa atual', 'Desde a última', 'Frequência', 'Próximo passo', ''].map((h) => (
                  <th key={h} className="rs-label px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-rs-gray-200">
              {itens.map((e) => {
                const meses = Math.floor(e.diasDesdeUltima / 30)
                return (
                  <tr key={e.alunoId} className="hover:bg-rs-gray-50">
                    <td data-principal className="px-5 py-3">
                      <Link to={`/alunos/${e.alunoId}`} className="flex items-center gap-3">
                        <Avatar nome={e.nome} />
                        <span className="truncate font-semibold text-rs-ink">{e.nome}</span>
                      </Link>
                    </td>
                    <td data-label="Faixa atual" className="px-5 py-3">
                      <FaixaBadge faixa={e.faixa} graus={e.graus} compacto />
                    </td>
                    <td data-label="Desde a última" className="px-5 py-3 text-sm text-rs-gray-700">
                      {meses} {meses === 1 ? 'mês' : 'meses'}
                    </td>
                    <td data-label="Frequência" className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rs-success">
                        <TrendingUp className="size-4" />
                        {Math.round(e.frequencia30d)}%
                      </span>
                    </td>
                    <td data-label="Próximo passo" className="px-5 py-3">
                      <FaixaBadge faixa={e.proxima.faixa} graus={e.proxima.graus} compacto />
                    </td>
                    <td data-acoes className="px-5 py-3 text-right">
                      {confirmando === e.alunoId ? (
                        <span className="inline-flex gap-1.5">
                          <Button
                            tamanho="sm"
                            variante="secundaria"
                            disabled={graduar.isPending}
                            onClick={() => registrar(e)}
                          >
                            {graduar.isPending ? 'Registrando…' : 'Confirmar'}
                          </Button>
                          <Button tamanho="sm" variante="fantasma" onClick={() => setConfirmando(null)}>
                            Voltar
                          </Button>
                        </span>
                      ) : (
                        <Button tamanho="sm" variante="contorno" onClick={() => setConfirmando(e.alunoId)}>
                          <Award className="size-4" />
                          Registrar graduação
                        </Button>
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
  )
}
