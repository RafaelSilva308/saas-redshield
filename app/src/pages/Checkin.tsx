import { useMemo, useState } from 'react'
import { CalendarDays, Check, Clock, Lock, MapPin, Undo2 } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, PageHeader } from '@/components/ui/Misc'
import { useAuth } from '@/app/auth'
import { useStore } from '@/app/store'
import { turmaPorId } from '@/data/mock'
import { alunoNaAula, proximaAula } from '@/data/selectors'
import { DIAS_SEMANA_LONGO, dataCurta, dataLonga, hojeISO } from '@/lib/format'

/* Check-in do aluno: ele mesmo registra presença na aula de hoje.
   Vale na hora, sem confirmação do professor (decisão de produto para a v1).
   O registro cai na chamada da turma e na ficha do aluno, marcado como "check-in do aluno". */

export function Checkin() {
  const { usuario } = useAuth()
  const { alunos, aulas, chamadas, chamadaDe, fazerCheckin, desfazerCheckin } = useStore()
  const [erro, setErro] = useState('')

  const aluno = alunos.find((a) => a.id === usuario?.alunoId)
  const hoje = hojeISO()
  const diaSemana = new Date().getDay()

  const aulasDeHoje = useMemo(
    () =>
      aluno
        ? aulas
            .filter((a) => a.diaSemana === diaSemana && alunoNaAula(aluno, a))
            .sort((a, b) => a.inicio.localeCompare(b.inicio))
        : [],
    [aluno, aulas, diaSemana],
  )

  const historico = useMemo(() => {
    if (!aluno) return []
    return chamadas
      .flatMap((c) => {
        const r = c.registros.find((x) => x.alunoId === aluno.id)
        return r ? [{ data: c.data, aulaId: c.aulaId, registro: r }] : []
      })
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 6)
  }, [aluno, chamadas])

  if (!aluno) {
    return (
      <>
        <PageHeader titulo="Check-in" subtitulo="Registre sua presença na aula de hoje." />
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

  const proxima = proximaAula((a) => alunoNaAula(aluno, a))

  const agir = (resultado: { ok: boolean; erro?: string }) => setErro(resultado.ok ? '' : (resultado.erro ?? 'Não foi possível concluir.'))

  return (
    <>
      <PageHeader
        titulo="Check-in"
        subtitulo={`${DIAS_SEMANA_LONGO[diaSemana]}, ${dataLonga(hoje)}. Registre sua presença na aula de hoje.`}
      />

      {erro && (
        <div role="alert" className="mb-4 rounded-lg border border-rs-red-100 bg-rs-red-50 px-4 py-3 text-sm text-rs-red-700">
          {erro}
        </div>
      )}

      {aulasDeHoje.length === 0 ? (
        <Card>
          <EmptyState
            icone={<CalendarDays className="size-6" />}
            titulo="Sem aula hoje"
            mensagem={
              proxima
                ? `Sua próxima aula é ${DIAS_SEMANA_LONGO[proxima.aula.diaSemana].toLowerCase()}, às ${proxima.aula.inicio} (${proxima.aula.titulo}).`
                : 'Não há aulas no quadro de horários.'
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {aulasDeHoje.map((aula) => {
            const chamada = chamadaDe(aula.id, hoje)
            const registro = chamada?.registros.find((r) => r.alunoId === aluno.id)
            const encerrada = chamada?.fechada ?? false
            const feitoPeloAluno = registro?.origem === 'aluno'

            return (
              <li key={aula.id}>
                <Card className="h-full">
                  <div className="flex h-full flex-col gap-4 p-5">
                    <div>
                      <p className="rs-label">{turmaPorId(aula.turmaId)?.nome}</p>
                      <h2 className="rs-title mt-1 text-xl text-rs-ink">{aula.titulo}</h2>
                      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-rs-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="size-4" /> {aula.inicio} – {aula.fim}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="size-4" /> {aula.local}
                        </span>
                      </p>
                    </div>

                    <div className="mt-auto">
                      {!registro && !encerrada && (
                        <Button
                          variante="primaria"
                          tamanho="lg"
                          className="w-full"
                          onClick={() => agir(fazerCheckin(aula.id, aluno.id))}
                        >
                          <Check className="size-5" />
                          Fazer check-in
                        </Button>
                      )}

                      {!registro && encerrada && (
                        <Badge tom="neutro">
                          <Lock className="size-3.5" /> Chamada encerrada
                        </Badge>
                      )}

                      {registro && (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <Badge tom={registro.status === 'presente' ? 'ok' : registro.status === 'justificado' ? 'alerta' : 'neutro'}>
                            {registro.status === 'presente' && <Check className="size-3.5" />}
                            {registro.status === 'presente'
                              ? feitoPeloAluno
                                ? `Presença registrada${registro.horario ? ` às ${registro.horario}` : ''}`
                                : 'Presença registrada pelo professor'
                              : registro.status === 'justificado'
                                ? 'Falta justificada pelo professor'
                                : 'Falta registrada pelo professor'}
                          </Badge>
                          {feitoPeloAluno && !encerrada && (
                            <Button variante="fantasma" tamanho="sm" onClick={() => agir(desfazerCheckin(aula.id, aluno.id))}>
                              <Undo2 className="size-4" />
                              Desfazer
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <Card className="mt-6">
        <CardHeader titulo="Meus últimos treinos" descricao="Presenças registradas nas suas aulas" />
        {historico.length === 0 ? (
          <EmptyState
            icone={<CalendarDays className="size-6" />}
            titulo="Nenhum treino registrado"
            mensagem="Faça o check-in na próxima aula e ela aparece aqui."
          />
        ) : (
          <ul className="divide-y divide-rs-gray-200">
            {historico.map((h) => {
              const aula = aulas.find((a) => a.id === h.aulaId)
              return (
                <li key={`${h.data}-${h.aulaId}`} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-16 shrink-0 text-xs font-semibold text-rs-gray-500">{dataCurta(h.data)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-rs-ink">{aula?.titulo}</span>
                  <Badge tom={h.registro.status === 'presente' ? 'ok' : h.registro.status === 'justificado' ? 'alerta' : 'neutro'}>
                    {h.registro.status === 'presente' ? 'Presente' : h.registro.status === 'justificado' ? 'Justificado' : 'Falta'}
                  </Badge>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </>
  )
}
