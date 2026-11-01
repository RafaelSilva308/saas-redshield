import { useState } from 'react'
import { Ban, CalendarDays, Check, Clock, MapPin, Undo2 } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Carregando, EmptyState, ErroCarga, PageHeader } from '@/components/ui/Misc'
import { useCheckin, useCheckinHoje, useMinhasPresencas } from '@/api/presenca'
import { usePainelAluno } from '@/api/metricas'
import { useTurmas } from '@/api/turmas'
import { mensagemDeErro } from '@/lib/api'
import { DIAS_SEMANA_LONGO, dataCurta, dataLonga } from '@/lib/format'

/* Check-in do aluno: ele mesmo registra presença na aula de hoje.
   Vale na hora, sem confirmação do professor (decisão de produto para a v1).
   O registro cai na chamada da turma e na ficha do aluno, marcado como "check-in do aluno".
   A data de "hoje" é a do servidor, no fuso da academia: o aparelho do aluno não decide o dia. */

const SITUACAO = {
  presente: { label: 'Presente', tom: 'ok' },
  justificado: { label: 'Justificado', tom: 'alerta' },
  ausente: { label: 'Falta', tom: 'neutro' },
  sem_checkin: { label: 'Falta · sem check-in', tom: 'neutro' },
} as const

const hora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''

export function Checkin() {
  const hoje = useCheckinHoje()
  const historico = useMinhasPresencas(30)
  const painel = usePainelAluno()
  const turmas = useTurmas().data ?? []
  const { fazer, desfazer } = useCheckin()
  const [erro, setErro] = useState('')

  if (hoje.isError) return <ErroCarga mensagem={mensagemDeErro(hoje.error)} aoTentarDeNovo={() => hoje.refetch()} />
  if (hoje.isPending) return <Carregando />

  const { data, itens: aulasDeHoje } = hoje.data
  const diaSemana = new Date(data + 'T12:00:00').getDay()
  const proxima = painel.data?.proximaAula
  const ocupado = fazer.isPending || desfazer.isPending

  const agir = (acao: typeof fazer, aulaId: string) => {
    setErro('')
    acao.mutate(aulaId, { onError: (e) => setErro(mensagemDeErro(e)) })
  }

  return (
    <>
      <PageHeader
        titulo="Check-in"
        subtitulo={`${DIAS_SEMANA_LONGO[diaSemana]}, ${dataLonga(data)}. Registre sua presença na aula de hoje.`}
      />

      {erro && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-rs-red-100 bg-rs-red-50 px-4 py-3 text-sm text-rs-red-700"
        >
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
                ? `Sua próxima aula é ${DIAS_SEMANA_LONGO[new Date(proxima.data + 'T12:00:00').getDay()].toLowerCase()}, às ${proxima.inicio} (${proxima.titulo}).`
                : 'Você ainda não está em nenhuma turma com aula no quadro. Fale com a academia.'
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {aulasDeHoje.map((aula) => {
            const registro = aula.registro
            const feitoPeloAluno = registro?.origem === 'aluno'

            return (
              <li key={aula.aulaId}>
                <Card className="h-full">
                  <div className="flex h-full flex-col gap-4 p-5">
                    <div>
                      <p className="rs-label">{turmas.find((t) => t.id === aula.turmaId)?.nome}</p>
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
                      {aula.cancelada ? (
                        <Badge tom="neutro">
                          <Ban className="size-3.5" /> Aula cancelada{aula.motivo ? ` · ${aula.motivo}` : ''}
                        </Badge>
                      ) : !registro ? (
                        <Button
                          variante="primaria"
                          tamanho="lg"
                          className="w-full"
                          disabled={ocupado}
                          onClick={() => agir(fazer, aula.aulaId)}
                        >
                          <Check className="size-5" />
                          {fazer.isPending && fazer.variables === aula.aulaId ? 'Registrando…' : 'Fazer check-in'}
                        </Button>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <Badge
                            tom={
                              registro.status === 'presente'
                                ? 'ok'
                                : registro.status === 'justificado'
                                  ? 'alerta'
                                  : 'neutro'
                            }
                          >
                            {registro.status === 'presente' && <Check className="size-3.5" />}
                            {registro.status === 'presente'
                              ? feitoPeloAluno
                                ? `Presença registrada${registro.registradoEm ? ` às ${hora(registro.registradoEm)}` : ''}`
                                : 'Presença registrada pelo professor'
                              : registro.status === 'justificado'
                                ? 'Falta justificada pelo professor'
                                : 'Falta registrada pelo professor'}
                          </Badge>
                          {feitoPeloAluno && (
                            <Button
                              variante="fantasma"
                              tamanho="sm"
                              disabled={ocupado}
                              onClick={() => agir(desfazer, aula.aulaId)}
                            >
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
        <CardHeader titulo="Meus últimos treinos" descricao="Aulas das suas turmas nos últimos 30 dias" />
        {historico.isError ? (
          <ErroCarga mensagem={mensagemDeErro(historico.error)} aoTentarDeNovo={() => historico.refetch()} />
        ) : historico.isPending ? (
          <Carregando />
        ) : historico.data.length === 0 ? (
          <EmptyState
            icone={<CalendarDays className="size-6" />}
            titulo="Nenhum treino registrado"
            mensagem="Faça o check-in na próxima aula e ela aparece aqui."
          />
        ) : (
          <ul className="divide-y divide-rs-gray-200">
            {historico.data.slice(0, 8).map((h) => (
              <li key={`${h.data}-${h.aulaId}`} className="flex items-center gap-4 px-5 py-3">
                <span className="w-16 shrink-0 text-xs font-semibold text-rs-gray-500">{dataCurta(h.data)}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-rs-ink">{h.titulo}</span>
                <Badge tom={SITUACAO[h.situacao].tom}>{SITUACAO[h.situacao].label}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
