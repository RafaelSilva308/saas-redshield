import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, CalendarPlus, ClipboardCheck, TrendingUp, UserPlus, Users, Wallet } from 'lucide-react'
import { Carregando, EmptyState, ErroCarga, PageHeader, Progress, ProgressRing } from '@/components/ui/Misc'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge, FaixaBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Button, ButtonLink } from '@/components/ui/Button'
import { useAuth } from '@/app/auth'
import { useAlunos } from '@/api/alunos'
import { useAulas, useTurmas } from '@/api/turmas'
import { useSerieFinanceira } from '@/api/financeiro'
import { useFaixas, useOcupacao, usePainelEquipe, useSeriePresenca } from '@/api/metricas'
import { mensagemDeErro } from '@/lib/api'
import { brl, DIAS_SEMANA, FAIXAS, hojeISO, primeiroNome } from '@/lib/format'
import { PainelAluno } from './painel/PainelAluno'
import { BlocoProximaAula, DicaGrafico } from './painel/comum'

/* O Painel muda conforme o papel. O do aluno só tem dados dele (defeito 8);
   o da equipe vem das métricas do servidor e reage ao que acontece no sistema (defeito 9). */
export function Painel() {
  const { usuario } = useAuth()
  return usuario?.papel === 'aluno' ? <PainelAluno /> : <PainelEquipe />
}

const mesCurto = (m: string) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(`${m}-01T12:00:00`)).replace('.', '')

/** Soma dias a uma data ISO sem passar por UTC (evita virar o dia à noite). */
const somaDias = (iso: string, n: number) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d + n)
}

function PainelEquipe() {
  const { usuario } = useAuth()
  const ehGestor = usuario?.papel === 'gestor'

  const painel = usePainelEquipe()
  const alunos = useAlunos().data
  const aulas = useAulas().data
  const turmas = useTurmas().data ?? []
  const faixas = useFaixas().data
  const ocupacao = useOcupacao().data ?? []
  const seriePresenca = useSeriePresenca(8).data ?? []
  const serieFinanceira = useSerieFinanceira(6, ehGestor).data ?? []

  // Alunos com maior frequência nos últimos 30 dias
  const destaques = useMemo(
    () =>
      (alunos ?? [])
        .filter((a) => a.status === 'ativo')
        .sort((a, b) => b.frequencia30d - a.frequencia30d)
        .slice(0, 5),
    [alunos],
  )

  // Agenda dos próximos 3 dias
  const proximosDias = useMemo(() => {
    const hoje = hojeISO()
    return Array.from({ length: 3 }, (_, i) => {
      const data = somaDias(hoje, i)
      return {
        data,
        aulas: (aulas ?? [])
          .filter((a) => a.diaSemana === data.getDay())
          .sort((a, b) => a.inicio.localeCompare(b.inicio)),
      }
    })
  }, [aulas])

  if (painel.isError)
    return <ErroCarga mensagem={mensagemDeErro(painel.error)} aoTentarDeNovo={() => painel.refetch()} />
  if (painel.isPending) return <Carregando />

  const p = painel.data
  const gestor = p.papel === 'gestor' ? p : null
  const proxima = p.proximaAula
  const pctGraduados = (faixas?.itens ?? []).filter((f) => f.faixa !== 'branca').reduce((s, f) => s + f.pct, 0)
  const dadosFinanceiros = serieFinanceira.map((m) => ({ ...m, mes: mesCurto(m.mes) }))
  const dadosPresenca = seriePresenca.map((s) => ({ ...s, semana: `${s.inicio.slice(8, 10)}/${s.inicio.slice(5, 7)}` }))

  return (
    <>
      <PageHeader
        titulo="Painel"
        subtitulo={`Bom treino, ${primeiroNome(usuario?.nome)}. Aqui está o resumo da academia hoje.`}
        acoes={
          <>
            <ButtonLink to="/presenca" variante="secundaria">
              <ClipboardCheck className="size-4" />
              Ver presenças
            </ButtonLink>
            <ButtonLink to="/alunos?novo=1" variante="primaria">
              <UserPlus className="size-4" />
              Adicionar aluno
            </ButtonLink>
          </>
        }
      />

      {/* Indicadores principais */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Alunos ativos"
          valor={p.alunosAtivos}
          icone={<Users className="size-5" />}
          nota={gestor ? `${gestor.novasMatriculasMes} novas matrículas no mês` : 'Com status ativo'}
          para="/alunos"
        />
        <StatCard
          label="Presença (30 dias)"
          valor={p.taxaPresenca30d}
          sufixo="%"
          icone={<TrendingUp className="size-5" />}
          nota="Presentes sobre aulas previstas"
          para="/presenca"
        />
        {gestor ? (
          <StatCard
            label="Receita do mês"
            valor={brl(gestor.fluxoDoMes.receita).replace('R$', '').trim()}
            icone={<Wallet className="size-5" />}
            nota={`Mês em curso · recorrência ${brl(gestor.mrr)}/mês`}
            para="/financeiro"
          />
        ) : (
          <StatCard
            label="Sem treinar há 14 dias"
            valor={p.emRiscoDeEvasao.total}
            icone={<AlertTriangle className="size-5" />}
            nota="Alunos ativos sem presença"
            para="/alunos"
          />
        )}

        <BlocoProximaAula proxima={proxima} />
      </div>

      {/* Alertas operacionais — só aparecem quando existe algo a resolver */}
      {((gestor && gestor.inadimplentes.alunos > 0) || p.emRiscoDeEvasao.total > 0) && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {gestor && gestor.inadimplentes.alunos > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-rs-red-100 bg-rs-red-50 p-4">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rs-red-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-rs-red-700">
                  {gestor.inadimplentes.alunos} aluno{gestor.inadimplentes.alunos > 1 ? 's' : ''} com mensalidade
                  atrasada — {brl(gestor.inadimplentes.valorEmAberto)}
                </p>
                <p className="mt-0.5 text-sm text-rs-gray-700">
                  Combine uma nova data com esses alunos antes que o atraso vire evasão.
                </p>
              </div>
              <ButtonLink to="/financeiro" variante="perigo" tamanho="sm" className="shrink-0">
                Resolver
              </ButtonLink>
            </div>
          )}

          {p.emRiscoDeEvasao.total > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-rs-blue-100 bg-rs-blue-50 p-4">
              <Users className="mt-0.5 size-5 shrink-0 text-rs-blue-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-rs-blue-700">
                  {p.emRiscoDeEvasao.total} alunos sem treinar há 14 dias
                </p>
                <p className="mt-0.5 text-sm text-rs-gray-700">
                  {p.emRiscoDeEvasao.itens
                    .slice(0, 3)
                    .map((r) => r.nome.split(' ')[0])
                    .join(', ')}
                  {p.emRiscoDeEvasao.total > 3 ? ' e outros' : ''}. Um convite pessoal costuma trazer o aluno de volta.
                </p>
              </div>
              <ButtonLink to="/alunos" variante="secundaria" tamanho="sm" className="shrink-0">
                Ver alunos
              </ButtonLink>
            </div>
          )}
        </div>
      )}

      {/* Linha 2: alunos em destaque · agenda · progresso de faixas */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader titulo="Alunos" descricao="Maior frequência em 30 dias" linkPara="/alunos" />
          {destaques.length === 0 ? (
            <EmptyState
              icone={<Users className="size-6" />}
              titulo="Sem alunos ativos"
              mensagem="Cadastre alunos para acompanhar."
            />
          ) : (
            <ul className="divide-y divide-rs-gray-200">
              {destaques.map((a) => (
                <li key={a.id}>
                  <Link to={`/alunos/${a.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-rs-gray-50">
                    <Avatar nome={a.nome} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-rs-ink">{a.nome}</span>
                      <FaixaBadge faixa={a.faixa} compacto />
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="rs-title block text-lg text-rs-ink">{a.frequencia30d}%</span>
                      <span className="block text-[10px] uppercase tracking-wider text-rs-gray-500">presença</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader titulo="Agenda" descricao="Próximos três dias" linkPara="/agenda" />
          <div className="divide-y divide-rs-gray-200">
            {proximosDias.map(({ data, aulas: doDia }, i) => (
              <div key={i} className="flex gap-4 px-5 py-3">
                <div className="w-10 shrink-0 pt-0.5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rs-gray-500">
                    {DIAS_SEMANA[data.getDay()]}
                  </p>
                  <p className="rs-title text-xl text-rs-ink">{String(data.getDate()).padStart(2, '0')}</p>
                </div>
                <ul className="min-w-0 flex-1 space-y-1">
                  {doDia.length === 0 && <li className="py-2 text-sm text-rs-gray-500">Sem aulas neste dia.</li>}
                  {doDia.map((aula) => {
                    const ehProxima =
                      proxima?.aulaId === aula.id && Number(proxima.data.slice(8, 10)) === data.getDate()
                    return (
                      <li
                        key={aula.id}
                        className={
                          'flex items-center gap-3 rounded px-2 py-1.5 ' +
                          (ehProxima ? 'bg-rs-blue-50 ring-1 ring-rs-blue-100' : '')
                        }
                      >
                        <span className="w-11 shrink-0 font-mono text-xs font-semibold text-rs-gray-700">
                          {aula.inicio}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-rs-ink">{aula.titulo}</span>
                        {ehProxima && (
                          <Badge tom="azul" className="shrink-0">
                            Próxima
                          </Badge>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader titulo="Progresso de faixas" descricao="Distribuição dos alunos ativos" linkPara="/progresso" />
          <CardBody className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
            <ProgressRing
              valor={pctGraduados}
              centro={
                <div>
                  <p className="rs-title text-3xl text-rs-ink">
                    {pctGraduados}
                    <span className="text-lg">%</span>
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-rs-gray-500">graduados</p>
                </div>
              }
            />
            <ul className="w-full min-w-0 flex-1 space-y-2">
              {(faixas?.itens ?? []).slice(0, 6).map((f) => (
                <li key={f.faixa} className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-full border border-black/15"
                    style={{ background: FAIXAS[f.faixa].cor }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-rs-gray-700">{FAIXAS[f.faixa].label}</span>
                  <span className="shrink-0 text-sm font-bold text-rs-ink">{f.pct}%</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* Linha 3: gráficos */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {ehGestor && (
          <Card>
            <CardHeader titulo="Fluxo de caixa" descricao="Últimos seis meses" linkPara="/financeiro" />
            <CardBody className="pl-1">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dadosFinanceiros} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1764a8" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#1764a8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e4e8ed" vertical={false} />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#667085' }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    tick={{ fontSize: 12, fill: '#667085' }}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                  />
                  <Tooltip content={<DicaGrafico formatador={brl} />} cursor={{ stroke: '#d0d6de' }} />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    name="Receita"
                    stroke="#1764a8"
                    strokeWidth={2.5}
                    fill="url(#gradReceita)"
                  />
                  <Area
                    type="monotone"
                    dataKey="despesa"
                    name="Despesa"
                    stroke="#d40000"
                    strokeWidth={2}
                    fill="none"
                    strokeDasharray="5 4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        )}

        <Card className={ehGestor ? '' : 'lg:col-span-2'}>
          <CardHeader
            titulo="Ocupação das turmas"
            descricao="Média de presentes por aula, 30 dias"
            linkPara="/presenca"
          />
          <CardBody className="pl-1">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ocupacao} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                <CartesianGrid stroke="#e4e8ed" vertical={false} />
                <XAxis dataKey="turma" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#667085' }} />
                <YAxis tickLine={false} axisLine={false} width={32} tick={{ fontSize: 12, fill: '#667085' }} />
                <Tooltip content={<DicaGrafico />} cursor={{ fill: '#f2f4f6' }} />
                <Bar dataKey="mediaPresentes" name="Média de presentes" radius={[4, 4, 0, 0]} maxBarSize={54}>
                  {ocupacao.map((t) => (
                    <Cell key={t.turmaId} fill={t.cor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Linha 4: presença semanal + ocupação detalhada */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader titulo="Presenças por semana" descricao="Total de presenças nas últimas oito semanas" />
          <CardBody className="pl-1">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dadosPresenca} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                <CartesianGrid stroke="#e4e8ed" vertical={false} />
                <XAxis dataKey="semana" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#667085' }} />
                <YAxis tickLine={false} axisLine={false} width={32} tick={{ fontSize: 12, fill: '#667085' }} />
                <Tooltip content={<DicaGrafico />} cursor={{ fill: '#f2f4f6' }} />
                <Bar dataKey="presencas" name="Presenças" fill="#246db1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader titulo="Capacidade" descricao="Quanto cada turma está cheia" />
          <CardBody className="space-y-4">
            {ocupacao.map((t) => (
              <div key={t.turmaId}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-rs-ink">{t.turma}</span>
                  <span className="shrink-0 text-xs text-rs-gray-500">
                    {t.mediaPresentes}/{t.capacidade} · {t.ocupacaoPct}%
                  </span>
                </div>
                <Progress valor={t.ocupacaoPct} cor={t.cor} />
              </div>
            ))}
            <p className="pt-1 text-xs leading-relaxed text-rs-gray-500">
              Turmas acima de 85% pedem uma segunda sessão no horário. Abaixo de 35%, vale rever o horário ou reforçar o
              convite.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Ações rápidas */}
      <Card className="mt-4">
        <CardHeader titulo="Ações rápidas" descricao="Os caminhos mais curtos do dia a dia" />
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { to: '/presenca', label: 'Ver presenças', desc: 'Conferir quem treinou hoje', Icone: ClipboardCheck },
            { to: '/alunos?novo=1', label: 'Adicionar aluno', desc: 'Cadastrar nova matrícula', Icone: UserPlus },
            { to: '/agenda', label: 'Agendar aula', desc: 'Incluir no quadro de horários', Icone: CalendarPlus },
          ].map(({ to, label, desc, Icone }) => (
            <Link
              key={to + label}
              to={to}
              className="group flex items-start gap-3 rounded-md border border-rs-gray-200 p-4 transition-colors hover:border-rs-blue-300 hover:bg-rs-blue-50"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-rs-blue-50 text-rs-blue-600 group-hover:bg-white">
                <Icone className="size-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-rs-ink">{label}</span>
                <span className="block text-xs text-rs-gray-500">{desc}</span>
              </span>
            </Link>
          ))}
        </CardBody>
      </Card>

      {/* Turmas ativas — contexto de rodapé */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-rs-gray-500">
        <span className="rs-label">Turmas ativas</span>
        {turmas
          .filter((t) => t.ativa)
          .map((t) => (
            <Badge key={t.id} tom="neutro">
              <span aria-hidden className="size-2 rounded-full" style={{ background: t.cor }} />
              {t.nome}
            </Badge>
          ))}
        <Button variante="fantasma" tamanho="sm" className="ml-auto" onClick={() => window.print()}>
          Exportar resumo
        </Button>
      </div>
    </>
  )
}
