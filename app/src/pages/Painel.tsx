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
import { useCelular } from '@/lib/tela'
import { AlertTriangle, CalendarCheck, CalendarPlus, ClipboardCheck, TrendingUp, UserPlus, Users, Wallet } from 'lucide-react'
import { PageHeader, Progress, ProgressRing } from '@/components/ui/Misc'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge, FaixaBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Button, ButtonLink } from '@/components/ui/Button'
import { useAuth } from '@/app/auth'
import { AULAS, TURMAS, turmaPorId } from '@/data/mock'
import {
  alunosAtivos,
  distribuicaoFaixas,
  emRiscoDeEvasao,
  fluxoDoMes,
  inadimplentes,
  mrr,
  novasMatriculas,
  ocupacaoTurmas,
  proximaAula,
  serieFinanceira,
  seriePresenca,
  taxaPresenca,
  valorEmAberto,

} from '@/data/selectors'
import { brl, DIAS_SEMANA } from '@/lib/format'

/* Tooltip próprio — o padrão do Recharts não segue a tipografia do sistema. */
function DicaGrafico({ active, payload, label, formatador }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-rs-gray-200 bg-white px-3 py-2 shadow-[var(--shadow-pop)]">
      <p className="rs-label mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-sm">
          <span aria-hidden className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-rs-gray-500">{p.name}</span>
          <span className="ml-auto font-semibold text-rs-ink">
            {formatador ? formatador(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  )
}

export function Painel() {
  const celular = useCelular()
  const { usuario } = useAuth()
  const ativos = alunosAtivos()
  const proxima = proximaAula()
  const presenca = taxaPresenca(30)
  const fluxo = fluxoDoMes()
  const faixas = distribuicaoFaixas()
  const risco = emRiscoDeEvasao(14)
  const atrasados = inadimplentes()
  const ehGestor = usuario?.papel === 'gestor'
  const ehAluno = usuario?.papel === 'aluno'

  // Ignora títulos ("Prof.", "Professora") ao cumprimentar pelo primeiro nome.
  const primeiroNome = (usuario?.nome ?? '')
    .split(' ')
    .filter((p) => !/^(prof|profa|professor|professora)\.?$/i.test(p))[0] ?? ''

  // Alunos com maior frequência nos últimos 30 dias
  const destaques = [...ativos].sort((a, b) => b.frequencia30d - a.frequencia30d).slice(0, 5)

  // Agenda dos próximos 3 dias
  const proximosDias = Array.from({ length: 3 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return {
      data: d,
      aulas: AULAS.filter((a) => a.diaSemana === d.getDay()).sort((a, b) => a.inicio.localeCompare(b.inicio)),
    }
  })

  return (
    <>
      <PageHeader
        titulo="Painel"
        subtitulo={`Bom treino, ${primeiroNome}. Aqui está o resumo da academia hoje.`}
        acoes={
          ehAluno ? (
            <ButtonLink to="/checkin" variante="primaria">
              <CalendarCheck className="size-4" />
              Fazer check-in
            </ButtonLink>
          ) : (
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
          )
        }
      />

      {/* Indicadores principais */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Alunos ativos"
          valor={ativos.length}
          icone={<Users className="size-5" />}
          nota={`${novasMatriculas()} novas matrículas no mês`}
          para="/alunos"
        />
        <StatCard
          label="Presença (30 dias)"
          valor={Math.round(presenca)}
          sufixo="%"
          icone={<TrendingUp className="size-5" />}
          nota="Média de comparecimento"
          para="/presenca"
        />
        {ehGestor ? (
          <StatCard
            label="Receita do mês"
            valor={brl(fluxo.receita).replace('R$', '').trim()}
            icone={<Wallet className="size-5" />}
            nota={`Mês em curso · recorrência ${brl(mrr())}/mês`}
            para="/financeiro"
            className="col-span-2 sm:col-span-1"
          />
        ) : (
          <StatCard
            label="Novas matrículas"
            valor={novasMatriculas()}
            icone={<UserPlus className="size-5" />}
            nota="Neste mês"
            para="/alunos"
            className="col-span-2 sm:col-span-1"
          />
        )}

        {/* Único bloco vermelho do painel: a ação de conversão do dia */}
        <div className="rs-diagonal relative col-span-2 flex flex-col justify-between overflow-hidden rounded-lg bg-rs-red-600 p-4 text-white sm:col-span-1 sm:p-5">
          <div className="relative">
            <p className="rs-label text-white/75">Próxima aula</p>
            {proxima ? (
              <>
                <p className="rs-title mt-3 text-2xl">
                  {proxima.hoje ? 'Hoje' : DIAS_SEMANA[proxima.quando.getDay()]}, {proxima.aula.inicio}
                </p>
                <p className="mt-1 text-sm text-white/85">{proxima.aula.titulo}</p>
                <p className="text-xs text-white/70">
                  {turmaPorId(proxima.aula.turmaId)?.nome} · {proxima.aula.local}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-white/85">Nenhuma aula programada.</p>
            )}
          </div>
          <Link
            to="/agenda"
            className="relative mt-4 inline-flex h-11 items-center sm:h-10 justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-rs-red-600 transition-colors hover:bg-white/90"
          >
            <CalendarPlus className="size-4" />
            Ver agenda
          </Link>
        </div>
      </div>

      {/* Alertas operacionais — só aparecem quando existe algo a resolver */}
      {(atrasados.length > 0 || risco.length > 0) && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {atrasados.length > 0 && ehGestor && (
            <div className="flex items-start gap-3 rounded-lg border border-rs-red-100 bg-rs-red-50 p-4">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rs-red-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-rs-red-700">
                  {atrasados.length} mensalidades em aberto — {brl(valorEmAberto())}
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

          {risco.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-rs-blue-100 bg-rs-blue-50 p-4">
              <Users className="mt-0.5 size-5 shrink-0 text-rs-blue-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-rs-blue-700">
                  {risco.length} alunos sem treinar há 14 dias
                </p>
                <p className="mt-0.5 text-sm text-rs-gray-700">
                  Um convite pessoal costuma trazer o aluno de volta ao tatame.
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
        </Card>

        <Card>
          <CardHeader titulo="Agenda" descricao="Próximos três dias" linkPara="/agenda" />
          <div className="divide-y divide-rs-gray-200">
            {proximosDias.map(({ data, aulas }) => (
              <div key={data.toISOString()} className="flex gap-4 px-5 py-3">
                <div className="w-10 shrink-0 pt-0.5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rs-gray-500">
                    {DIAS_SEMANA[data.getDay()]}
                  </p>
                  <p className="rs-title text-xl text-rs-ink">{String(data.getDate()).padStart(2, '0')}</p>
                </div>
                <ul className="min-w-0 flex-1 space-y-1">
                  {aulas.length === 0 && <li className="py-2 text-sm text-rs-gray-500">Sem aulas neste dia.</li>}
                  {aulas.map((aula) => {
                    const ehProxima = proxima?.aula.id === aula.id && proxima.quando.getDate() === data.getDate()
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
              valor={faixas.filter((f) => f.faixa !== 'branca').reduce((s, f) => s + f.pct, 0)}
              centro={
                <div>
                  <p className="rs-title text-3xl text-rs-ink">
                    {faixas.filter((f) => f.faixa !== 'branca').reduce((s, f) => s + f.pct, 0)}
                    <span className="text-lg">%</span>
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-rs-gray-500">graduados</p>
                </div>
              }
            />
            <ul className="w-full min-w-0 flex-1 space-y-2">
              {faixas.slice(0, 6).map((f) => (
                <li key={f.faixa} className="flex items-center gap-2.5">
                  <span aria-hidden className="size-3 shrink-0 rounded-full border border-black/15" style={{ background: f.cor }} />
                  <span className="min-w-0 flex-1 truncate text-sm text-rs-gray-700">{f.label}</span>
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
                <AreaChart data={serieFinanceira()} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
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
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<DicaGrafico formatador={brl} />} cursor={{ stroke: '#d0d6de' }} />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke="#1764a8" strokeWidth={2.5} fill="url(#gradReceita)" />
                  <Area type="monotone" dataKey="despesa" name="Despesa" stroke="#d40000" strokeWidth={2} fill="none" strokeDasharray="5 4" />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        )}

        <Card className={ehGestor ? '' : 'lg:col-span-2'}>
          <CardHeader titulo="Ocupação das turmas" descricao="Média de presentes por aula, 30 dias" linkPara="/presenca" />
          <CardBody className="pl-1">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ocupacaoTurmas()} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
                <CartesianGrid stroke="#e4e8ed" vertical={false} />
                <XAxis
                  dataKey="turma"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: celular ? 11 : 12, fill: '#667085' }}
                  interval={0}
                  angle={celular ? -35 : 0}
                  textAnchor={celular ? 'end' : 'middle'}
                  height={celular ? 56 : 30}
                />
                <YAxis tickLine={false} axisLine={false} width={32} tick={{ fontSize: 12, fill: '#667085' }} />
                <Tooltip content={<DicaGrafico />} cursor={{ fill: '#f2f4f6' }} />
                <Bar dataKey="mediaPresentes" name="Média de presentes" radius={[4, 4, 0, 0]} maxBarSize={54}>
                  {ocupacaoTurmas().map((t) => (
                    <Cell key={t.turma} fill={t.cor} />
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
          <CardHeader titulo="Presenças por semana" descricao="Total de check-ins nas últimas oito semanas" />
          <CardBody className="pl-1">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={seriePresenca()} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
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
            {ocupacaoTurmas().map((t) => (
              <div key={t.turma}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-rs-ink">{t.turma}</span>
                  <span className="shrink-0 text-xs text-rs-gray-500">
                    {t.mediaPresentes}/{t.capacidade} · {t.ocupacao}%
                  </span>
                </div>
                <Progress valor={t.ocupacao} cor={t.cor} />
              </div>
            ))}
            <p className="pt-1 text-xs leading-relaxed text-rs-gray-500">
              Turmas acima de 85% pedem uma segunda sessão no horário. Abaixo de 35%, vale rever o horário
              ou reforçar o convite.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Ações rápidas — levam a telas que o aluno não acessa */}
      {!ehAluno && (
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
      )}

      {/* Turmas ativas — contexto de rodapé */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-rs-gray-500">
        <span className="rs-label">Turmas ativas</span>
        {TURMAS.map((t) => (
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
