import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { paraCentavos, paraReais } from '@/lib/dinheiro'
import type { Periodicidade, Plano } from '@/types'

/* Planos: GET/POST/PATCH /planos. O professor lê; só o gestor altera. */

export interface PlanoDto {
  id: string
  nome: string
  descricao: string
  valorCentavos: number
  periodicidade: Periodicidade
  /** null = ilimitado */
  aulasPorSemana: number | null
  ativo: boolean
}

export const dePlanoDto = (p: PlanoDto): Plano => ({
  id: p.id,
  nome: p.nome,
  descricao: p.descricao,
  valor: paraReais(p.valorCentavos),
  periodicidade: p.periodicidade,
  aulasPorSemana: p.aulasPorSemana ?? 'ilimitado',
  ativo: p.ativo,
})

export const paraPlanoDto = (p: Plano) => ({
  nome: p.nome.trim(),
  descricao: p.descricao.trim(),
  valorCentavos: paraCentavos(p.valor),
  periodicidade: p.periodicidade,
  aulasPorSemana: p.aulasPorSemana === 'ilimitado' ? null : p.aulasPorSemana,
  ativo: p.ativo,
})

export const CHAVE_PLANOS = ['planos'] as const

export function usePlanos() {
  return useQuery({
    queryKey: CHAVE_PLANOS,
    queryFn: async () => (await api.get<{ itens: PlanoDto[] }>('/planos')).itens.map(dePlanoDto),
  })
}

export function useSalvarPlano() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (p: Plano) =>
      p.id ? api.patch<PlanoDto>(`/planos/${p.id}`, paraPlanoDto(p)) : api.post<PlanoDto>('/planos', paraPlanoDto(p)),
    onSuccess: () => cliente.invalidateQueries({ queryKey: CHAVE_PLANOS }),
  })
}
