import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Faixa, StatusAluno, StatusPagamento } from '@/types'

/* Métricas calculadas no servidor (defeito 9: os números reagem ao que acontece no sistema).
   GET /metricas/painel responde conforme o papel: o aluno só recebe os próprios dados (defeito 8). */

export interface ProximaAula {
  aulaId: string
  titulo: string
  turma: string
  data: string
  inicio: string
  fim: string
  local: string
  hoje: boolean
}

export interface PainelAluno {
  papel: 'aluno'
  aluno: { id: string; nome: string; faixa: Faixa; graus: number; status: StatusAluno }
  frequencia30d: number
  statusPagamento: StatusPagamento
  presencasTotal: number
  proximaAula: ProximaAula | null
}

export const CHAVE_METRICAS = ['metricas'] as const

export function usePainelAluno(habilitado = true) {
  return useQuery({
    queryKey: [...CHAVE_METRICAS, 'painel', 'aluno'],
    queryFn: () => api.get<PainelAluno>('/metricas/painel'),
    enabled: habilitado,
  })
}
