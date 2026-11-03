import { useMemo } from 'react'
import { Award, CalendarDays, Lock, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { FaixaBadge } from '@/components/ui/Badge'
import { EmptyState, PageHeader, Progress, ProgressRing } from '@/components/ui/Misc'
import { StatCard } from '@/components/ui/StatCard'
import { useAuth } from '@/app/auth'
import { useStore } from '@/app/store'
import { FAIXAS, hojeISO } from '@/lib/format'
import type { Faixa } from '@/types'

/* Progresso do próprio aluno. Nada da academia: só faixa, graus e frequência dele (defeito 8).
   Mesmo desenho do progresso do aluno do sistema real. */

const ORDEM_ADULTO: Faixa[] = ['branca', 'azul', 'roxa', 'marrom', 'preta']
const GRAUS_POR_FAIXA = 4

export function ProgressoAluno() {
  const { usuario } = useAuth()
  const { alunos, chamadas } = useStore()
  const aluno = alunos.find((a) => a.id === usuario?.alunoId)

  const registros = useMemo(
    () =>
      aluno
        ? chamadas.flatMap((c) => {
            const r = c.registros.find((x) => x.alunoId === aluno.id)
            return r ? [{ data: c.data, status: r.status }] : []
          })
        : [],
    [aluno, chamadas],
  )

  // Presenças por semana nas últimas 8 semanas, contadas para trás a partir de hoje.
  const porSemana = useMemo(() => {
    const diaFim = Date.parse(`${hojeISO()}T12:00:00`)
    return Array.from({ length: 8 }, (_, i) => {
      const semana = 7 - i
      const doIntervalo = registros.filter((p) => {
        const dias = Math.round((diaFim - Date.parse(`${p.data}T12:00:00`)) / 86_400_000)
        return dias >= 0 && Math.floor(dias / 7) === semana
      })
      const ini = new Date(diaFim - (semana * 7 + 6) * 86_400_000)
      return {
        semana: `${String(ini.getDate()).padStart(2, '0')}/${String(ini.getMonth() + 1).padStart(2, '0')}`,
        presencas: doIntervalo.filter((p) => p.status === 'presente').length,
        aulas: doIntervalo.length,
      }
    })
  }, [registros])

  if (!aluno) {
    return (
      <>
        <PageHeader titulo="Meu progresso" />
        <Card>
          <EmptyState
            icone={<Lock className="size-6" />}
            titulo="Seu acesso ainda não está ligado a um aluno"
            mensagem="Peça à academia para vincular o seu login à sua ficha de aluno."
          />
        </Card>
      </>
    )
  }

  const idx = ORDEM_ADULTO.indexOf(aluno.faixa)
  const proximaFaixa = idx >= 0 && idx < ORDEM_ADULTO.length - 1 ? ORDEM_ADULTO[idx + 1] : null
  const freq = Math.round(aluno.frequencia30d)
  const presencasTotal = registros.filter((r) => r.status === 'presente').length

  return (
    <>
      <PageHeader titulo="Meu progresso" subtitulo="Sua faixa, seus graus e sua frequência nos treinos." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader titulo="Sua graduação" descricao="Faixa atual e graus" />
          <CardBody className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="rs-label">Faixa atual</p>
                <p className="mt-1">
                  <FaixaBadge faixa={aluno.faixa} graus={aluno.graus} />
                </p>
              </div>
              {proximaFaixa && (
                <div className="text-right">
                  <p className="rs-label">Próxima faixa</p>
                  <p className="mt-1">
                    <FaixaBadge faixa={proximaFaixa} />
                  </p>
                </div>
              )}
            </div>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-rs-gray-700">Graus na faixa atual</span>
                <span className="text-sm text-rs-gray-500">
                  {aluno.graus} de {GRAUS_POR_FAIXA}
                </span>
              </div>
              <Progress
                valor={Math.min(100, (aluno.graus / GRAUS_POR_FAIXA) * 100)}
                cor={FAIXAS[aluno.faixa].cor === '#e4e8ed' ? '#667085' : FAIXAS[aluno.faixa].cor}
                altura="h-3"
              />
            </div>
            <p className="text-xs leading-relaxed text-rs-gray-500">
              A graduação é decidida pelo professor. Treinar com frequência é o que mais conta.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader titulo="Sua frequência" descricao="Presenças sobre as aulas das suas turmas, 30 dias" />
          <CardBody className="flex justify-center py-6">
            <ProgressRing
              valor={freq}
              tamanho={148}
              centro={
                <div>
                  <p className="rs-title text-4xl text-rs-ink">
                    {freq}
                    <span className="text-xl">%</span>
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-rs-gray-500">frequência</p>
                </div>
              }
            />
          </CardBody>
        </Card>

        <div className="grid gap-4">
          <StatCard
            label="Treinos registrados"
            valor={presencasTotal}
            icone={<CalendarDays className="size-5" />}
            nota="Presenças no histórico"
          />
          <StatCard
            label="Últimos 30 dias"
            valor={freq}
            sufixo="%"
            icone={freq >= 70 ? <Award className="size-5" /> : <TrendingUp className="size-5" />}
            nota={freq >= 70 ? 'Ótimo ritmo de treino' : 'Mais treinos aceleram sua próxima graduação'}
          />
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader titulo="Seus treinos por semana" descricao="Presenças nas últimas oito semanas" />
        <CardBody className="pl-1">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={porSemana} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
              <CartesianGrid stroke="#e4e8ed" vertical={false} />
              <XAxis dataKey="semana" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#667085' }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} tick={{ fontSize: 12, fill: '#667085' }} />
              <Tooltip
                formatter={(v, nome) => [Number(v), nome === 'presencas' ? 'Presenças' : 'Aulas']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e4e8ed', fontSize: 13 }}
                cursor={{ fill: '#f2f4f6' }}
              />
              <Bar dataKey="aulas" name="aulas" fill="#d0d6de" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="presencas" name="presencas" fill="#246db1" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>
    </>
  )
}
