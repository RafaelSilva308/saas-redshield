import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PresencaAluno } from '@/api/alunos'
import type { OrigemPresenca, StatusPresenca } from '@/types'

/* Presença (D1–D7): o aluno faz check-in na aula de hoje; quem não fez tem falta (ausência de registro);
   o professor corrige livremente. Não existe "fechar chamada" (defeito 10). */

export interface Registro {
  status: StatusPresenca
  origem: OrigemPresenca
  registradoEm: string | null
  observacao: string | null
}

// ------------------------------------------------------------ lado do aluno

export interface AulaDeHoje {
  aulaId: string
  turmaId: string
  titulo: string
  inicio: string
  fim: string
  local: string
  cancelada: boolean
  motivo: string | null
  registro: Registro | null
}

const CHAVE_CHECKIN = ['checkin'] as const
const CHAVE_EU = ['eu'] as const

/** Aulas de hoje das turmas do aluno. A data é a do servidor, no fuso da academia. */
export function useCheckinHoje() {
  return useQuery({
    queryKey: CHAVE_CHECKIN,
    queryFn: () => api.get<{ data: string; itens: AulaDeHoje[] }>('/checkin/hoje'),
  })
}

export function useCheckin() {
  const cliente = useQueryClient()
  const aoMudar = () =>
    Promise.all([
      cliente.invalidateQueries({ queryKey: CHAVE_CHECKIN }),
      cliente.invalidateQueries({ queryKey: CHAVE_EU }),
      cliente.invalidateQueries({ queryKey: ['metricas'] }),
    ])
  const fazer = useMutation({
    mutationFn: (aulaId: string) => api.post(`/aulas/${aulaId}/checkin`),
    onSettled: aoMudar,
  })
  const desfazer = useMutation({
    mutationFn: (aulaId: string) => api.delete(`/aulas/${aulaId}/checkin`),
    onSettled: aoMudar,
  })
  return { fazer, desfazer }
}

/** Histórico do próprio aluno (a API usa o aluno da sessão). */
export function useMinhasPresencas(dias = 90) {
  return useQuery({
    queryKey: [...CHAVE_EU, 'presencas', dias],
    queryFn: async () => (await api.get<{ itens: PresencaAluno[] }>(`/eu/presencas?dias=${dias}`)).itens,
  })
}

// --------------------------------------------------------- lado da equipe

export type Situacao = StatusPresenca | 'sem_checkin'

export interface RegistroChamada {
  alunoId: string
  nome: string
  situacao: Situacao
  origem: OrigemPresenca | null
  registradoEm: string | null
  observacao: string | null
}

export interface Chamada {
  aulaId: string
  data: string
  cancelada: boolean
  motivo: string | null
  realizada: boolean
  registros: RegistroChamada[]
}

const chaveChamada = (aulaId: string, data: string) => ['chamadas', aulaId, data] as const

/** Quem deveria estar na aula naquela data e o que cada um fez. */
export function useChamada(aulaId: string | undefined, data: string) {
  return useQuery({
    queryKey: chaveChamada(aulaId ?? '', data),
    queryFn: () => api.get<Chamada>(`/chamadas?aulaId=${aulaId}&data=${data}`),
    enabled: !!aulaId,
  })
}

/** Correção do professor: prevalece sobre o check-in e é auditada. */
export function useCorrigirPresenca(aulaId: string, data: string) {
  const cliente = useQueryClient()
  const chave = chaveChamada(aulaId, data)
  return useMutation({
    mutationFn: ({ alunoId, status }: { alunoId: string; status: StatusPresenca }) =>
      api.put(`/chamadas/${aulaId}/${data}/presencas/${alunoId}`, { status }),
    // Otimista: no tatame, o botão precisa responder na hora.
    onMutate: async ({ alunoId, status }) => {
      await cliente.cancelQueries({ queryKey: chave })
      const antes = cliente.getQueryData<Chamada>(chave)
      if (antes)
        cliente.setQueryData<Chamada>(chave, {
          ...antes,
          registros: antes.registros.map((r) =>
            r.alunoId === alunoId
              ? { ...r, situacao: status, origem: 'professor', registradoEm: new Date().toISOString() }
              : r,
          ),
        })
      return { antes }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.antes) cliente.setQueryData(chave, ctx.antes)
    },
    onSettled: () => {
      cliente.invalidateQueries({ queryKey: chave })
      cliente.invalidateQueries({ queryKey: ['alunos'] })
    },
  })
}

export function useCancelamentoAula(aulaId: string, data: string) {
  const cliente = useQueryClient()
  // Aula cancelada sai do cálculo de frequência: ficha, lista de alunos e métricas mudam junto.
  const aoMudar = () =>
    Promise.all([
      cliente.invalidateQueries({ queryKey: chaveChamada(aulaId, data) }),
      cliente.invalidateQueries({ queryKey: ['alunos'] }),
      cliente.invalidateQueries({ queryKey: ['metricas'] }),
    ])
  const cancelar = useMutation({
    mutationFn: (motivo: string) => api.post(`/chamadas/${aulaId}/${data}/cancelar`, { motivo }),
    onSuccess: aoMudar,
  })
  const reativar = useMutation({
    mutationFn: () => api.post(`/chamadas/${aulaId}/${data}/reativar`),
    onSuccess: aoMudar,
  })
  return { cancelar, reativar }
}
