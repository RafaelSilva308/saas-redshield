import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCelular } from '@/lib/tela'
import { useAuth } from '@/app/auth'
import { ProgressoAluno } from './progresso/ProgressoAluno'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge, FaixaBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState, PageHeader, Progress as Barra, ProgressRing, Tabs } from '@/components/ui/Misc'
import { useStore } from '@/app/store'
import { FAIXAS, dataCurta } from '@/lib/format'
import type { Faixa } from '@/types'

const ORDEM: Faixa[] = ['branca', 'cinza', 'amarela', 'laranja', 'verde', 'azul', 'roxa', 'marrom', 'preta']

/* Critério de elegibilidade usado pela academia — simplificado no protótipo.
   Na Fase 2 isto vira uma regra configurável por academia. */
const MESES_MINIMOS = 12
const FREQUENCIA_MINIMA = 70

export function Progresso() {
  const { usuario } = useAuth()
  return usuario?.papel === 'aluno' ? <ProgressoAluno /> : <ProgressoEquipe />
}

function ProgressoEquipe() {
  const celular = useCelular()
  const { alunos } = useStore()
  const [aba, setAba] = useState<'panorama' | 'elegiveis'>('panorama')

  const ativos = useMemo(() => alunos.filter((a) => a.status === 'ativo'), [alunos])

  const distribuicao = useMemo(() => {
    const m = new Map<Faixa, number>()
    for (const a of ativos) m.set(a.faixa, (m.get(a.faixa) ?? 0) + 1)
    return ORDEM.filter((f) => m.has(f)).map((f) => ({
      faixa: f,
      label: FAIXAS[f].label,
      cor: FAIXAS[f].cor === '#e4e8ed' ? '#c4cbd4' : FAIXAS[f].cor,
      qtd: m.get(f)!,
      pct: Math.round((m.get(f)! / ativos.length) * 100),
    }))
  }, [ativos])

  const mesesNaAcademia = (matriculaEm: string) => {
    const d = new Date(matriculaEm + 'T12:00:00')
    const hoje = new Date()
    return (hoje.getFullYear() - d.getFullYear()) * 12 + (hoje.getMonth() - d.getMonth())
  }

  const elegiveis = useMemo(
    () =>
      ativos
        .filter((a) => mesesNaAcademia(a.matriculaEm) >= MESES_MINIMOS && a.frequencia30d >= FREQUENCIA_MINIMA)
        .sort((a, b) => b.frequencia30d - a.frequencia30d),
    [ativos],
  )

  const graduados = ativos.filter((a) => a.faixa !== 'branca').length
  const pctGraduados = ativos.length ? Math.round((graduados / ativos.length) * 100) : 0
  const tempoMedio = ativos.length
    ? Math.round(ativos.reduce((s, a) => s + mesesNaAcademia(a.matriculaEm), 0) / ativos.length)
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
            { id: 'elegiveis', label: 'Elegíveis à graduação', contagem: elegiveis.length },
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
                    <p className="rs-title text-2xl text-rs-ink">{ativos.length - graduados}</p>
                  </div>
                  <div>
                    <p className="rs-label">Tempo médio</p>
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
            <CardHeader titulo="Legenda das faixas" descricao="Cor, rótulo e participação — a cor nunca aparece sozinha" />
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
        <Card>
          <CardHeader
            titulo="Elegíveis à graduação"
            descricao={`Ao menos ${MESES_MINIMOS} meses de casa e ${FREQUENCIA_MINIMA}% de frequência nos últimos 30 dias`}
          />
          {elegiveis.length === 0 ? (
            <EmptyState
              icone={<Award className="size-6" />}
              titulo="Ninguém elegível no momento"
              mensagem="Os critérios consideram tempo de treino e frequência recente. Continue acompanhando a turma."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="rs-tabela-cartoes w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-rs-gray-200">
                    {['Aluno', 'Faixa atual', 'Tempo de treino', 'Frequência', 'Próxima faixa', ''].map((h) => (
                      <th key={h} className="rs-label px-5 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-rs-gray-200">
                  {elegiveis.map((a) => {
                    const idx = ORDEM.indexOf(a.faixa)
                    const proxima = idx < ORDEM.length - 1 ? ORDEM[idx + 1] : null
                    const meses = mesesNaAcademia(a.matriculaEm)
                    return (
                      <tr key={a.id} className="hover:bg-rs-gray-50">
                        <td data-principal className="px-5 py-3">
                          <Link to={`/alunos/${a.id}`} className="flex items-center gap-3">
                            <Avatar nome={a.nome} />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-rs-ink">{a.nome}</span>
                              <span className="block text-xs text-rs-gray-500">desde {dataCurta(a.matriculaEm)}</span>
                            </span>
                          </Link>
                        </td>
                        <td data-label="Faixa atual" className="px-5 py-3">
                          <FaixaBadge faixa={a.faixa} graus={a.graus} compacto />
                        </td>
                        <td data-label="Tempo de treino" className="px-5 py-3 text-sm text-rs-gray-700">
                          {meses} {meses === 1 ? 'mês' : 'meses'}
                        </td>
                        <td data-label="Frequência" className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rs-success">
                            <TrendingUp className="size-4" />
                            {a.frequencia30d}%
                          </span>
                        </td>
                        <td data-label="Próxima faixa" className="px-5 py-3">{proxima ? <FaixaBadge faixa={proxima} compacto /> : <span className="text-sm text-rs-gray-500">—</span>}</td>
                        <td data-acoes className="px-5 py-3 text-right">
                          <Badge tom="azul">
                            <Award className="size-3.5" />
                            Avaliar
                          </Badge>
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
    </>
  )
}
