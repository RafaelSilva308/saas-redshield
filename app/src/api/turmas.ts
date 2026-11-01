import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Aula, DiaSemana, Turma } from '@/types'

/* Turmas: GET /turmas (qualquer papel logado). */

export interface TurmaDto {
  id: string
  nome: string
  professorId: string | null
  professor: string | null
  faixaEtaria: string
  nivel: string
  infantil: boolean
  cor: string
  ativa: boolean
}

export const deTurmaDto = (t: TurmaDto): Turma => ({
  id: t.id,
  nome: t.nome,
  professor: t.professor ?? '',
  professorId: t.professorId,
  faixaEtaria: t.faixaEtaria,
  nivel: t.nivel,
  infantil: t.infantil,
  cor: t.cor,
  ativa: t.ativa,
})

export const CHAVE_TURMAS = ['turmas'] as const

export function useTurmas() {
  return useQuery({
    queryKey: CHAVE_TURMAS,
    queryFn: async () => (await api.get<{ itens: TurmaDto[] }>('/turmas')).itens.map(deTurmaDto),
  })
}

// ------------------------------------------------------------------ aulas

export interface AulaDto {
  id: string
  turmaId: string
  titulo: string
  diaSemana: number
  inicio: string
  fim: string
  capacidade: number
  local: string
  ativa: boolean
}

export const deAulaDto = (a: AulaDto): Aula => ({ ...a, diaSemana: a.diaSemana as DiaSemana })

export const CHAVE_AULAS = ['aulas'] as const

/** Quadro semanal de aulas ativas (qualquer papel logado). */
export function useAulas() {
  return useQuery({
    queryKey: CHAVE_AULAS,
    queryFn: async () => (await api.get<{ itens: AulaDto[] }>('/aulas')).itens.map(deAulaDto),
  })
}

/** Criar ou editar aula do quadro (gestor e professor). */
export function useSalvarAula() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...a }: Aula) => {
      const corpo = {
        turmaId: a.turmaId,
        titulo: a.titulo.trim(),
        diaSemana: a.diaSemana,
        inicio: a.inicio,
        fim: a.fim,
        capacidade: a.capacidade,
        local: a.local.trim() || undefined,
      }
      return id ? api.patch<AulaDto>(`/aulas/${id}`, corpo) : api.post<AulaDto>('/aulas', corpo)
    },
    onSuccess: () => cliente.invalidateQueries({ queryKey: CHAVE_AULAS }),
  })
}

/** Aula com histórico não some: a API a desativa e a frequência passada continua valendo. */
export function useRemoverAula() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/aulas/${id}`),
    onSuccess: () => cliente.invalidateQueries({ queryKey: CHAVE_AULAS }),
  })
}
