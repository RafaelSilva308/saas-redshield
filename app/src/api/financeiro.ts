import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { paraCentavos, paraReais } from '@/lib/dinheiro'
import { deCobrancaDto, type CobrancaDto, type SituacaoCobranca } from '@/api/alunos'
import type { TipoTransacao, Transacao } from '@/types'

/* Financeiro (só o gestor): lançamentos, categorias e mensalidades.
   A baixa de uma mensalidade cria o lançamento de receita na mesma transação do banco (V6: baixa manual). */

export type Metodo = Transacao['metodo']

export interface TransacaoDto {
  id: string
  tipo: TipoTransacao
  categoriaId: string
  categoria: string | null
  descricao: string
  valorCentavos: number
  data: string
  metodo: Metodo
  alunoId: string | null
  cobrancaId: string | null
  conciliada: boolean
}

export const deTransacaoDto = (t: TransacaoDto): Transacao => ({
  id: t.id,
  tipo: t.tipo,
  categoriaId: t.categoriaId,
  categoria: t.categoria ?? '',
  descricao: t.descricao,
  valor: paraReais(t.valorCentavos),
  data: t.data,
  metodo: t.metodo,
  alunoId: t.alunoId ?? undefined,
  cobrancaId: t.cobrancaId,
  conciliada: t.conciliada,
})

export interface Categoria {
  id: string
  tipo: TipoTransacao
  nome: string
  ativa: boolean
}

const CHAVE = ['financeiro'] as const

/** Tudo que muda com dinheiro: lançamentos, mensalidades, situação dos alunos e métricas. */
function useInvalidarFinanceiro() {
  const cliente = useQueryClient()
  return () =>
    Promise.all([
      cliente.invalidateQueries({ queryKey: CHAVE }),
      cliente.invalidateQueries({ queryKey: ['cobrancas'] }),
      cliente.invalidateQueries({ queryKey: ['alunos'] }),
      cliente.invalidateQueries({ queryKey: ['metricas'] }),
    ])
}

// ------------------------------------------------------------- lançamentos

export function useTransacoes(mes: string) {
  return useQuery({
    queryKey: [...CHAVE, 'transacoes', mes],
    queryFn: async () => {
      const r = await api.get<{
        itens: TransacaoDto[]
        total: number
        resumo: { receitaCentavos: number; despesaCentavos: number; saldoCentavos: number }
      }>(`/transacoes?mes=${mes}&limite=500`)
      return {
        itens: r.itens.map(deTransacaoDto),
        total: r.total,
        receita: paraReais(r.resumo.receitaCentavos),
        despesa: paraReais(r.resumo.despesaCentavos),
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function useCategorias() {
  return useQuery({
    queryKey: [...CHAVE, 'categorias'],
    queryFn: async () => (await api.get<{ itens: Categoria[] }>('/categorias-financeiras')).itens,
  })
}

export function useSalvarTransacao() {
  const invalidar = useInvalidarFinanceiro()
  return useMutation({
    mutationFn: (t: Transacao) => {
      const corpo = {
        tipo: t.tipo,
        categoriaId: t.categoriaId,
        descricao: t.descricao.trim(),
        valorCentavos: paraCentavos(t.valor),
        data: t.data,
        metodo: t.metodo,
        alunoId: t.alunoId ?? null,
        conciliada: t.conciliada,
      }
      return t.id ? api.patch<TransacaoDto>(`/transacoes/${t.id}`, corpo) : api.post<TransacaoDto>('/transacoes', corpo)
    },
    onSuccess: invalidar,
  })
}

export function useRemoverTransacao() {
  const invalidar = useInvalidarFinanceiro()
  return useMutation({ mutationFn: (id: string) => api.delete(`/transacoes/${id}`), onSuccess: invalidar })
}

// ------------------------------------------------------------ mensalidades

export interface ResumoCobrancas {
  pago: number
  aVencer: number
  atrasado: number
}

export function useCobrancas(competencia: string, situacao: SituacaoCobranca | 'todas') {
  return useQuery({
    queryKey: ['cobrancas', competencia, situacao],
    queryFn: async () => {
      const filtro = situacao === 'todas' ? '' : `&status=${situacao}`
      const r = await api.get<{
        itens: CobrancaDto[]
        total: number
        resumo: { pagoCentavos: number; aVencerCentavos: number; atrasadoCentavos: number }
      }>(`/cobrancas?competencia=${competencia}${filtro}&limite=200`)
      return {
        itens: r.itens.map(deCobrancaDto),
        total: r.total,
        resumo: {
          pago: paraReais(r.resumo.pagoCentavos),
          aVencer: paraReais(r.resumo.aVencerCentavos),
          atrasado: paraReais(r.resumo.atrasadoCentavos),
        } satisfies ResumoCobrancas,
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function useAcoesCobranca() {
  const invalidar = useInvalidarFinanceiro()
  const gerar = useMutation({
    mutationFn: (competencia: string) =>
      api.post<{ competencia: string; criadas: number }>('/cobrancas/gerar', { competencia }),
    onSuccess: invalidar,
  })
  const pagar = useMutation({
    mutationFn: ({ id, metodo, data }: { id: string; metodo: Metodo; data: string }) =>
      api.post(`/cobrancas/${id}/pagar`, { metodo, data }),
    onSuccess: invalidar,
  })
  const estornar = useMutation({
    mutationFn: (id: string) => api.post(`/cobrancas/${id}/estornar`),
    onSuccess: invalidar,
  })
  const cancelar = useMutation({
    mutationFn: (id: string) => api.post(`/cobrancas/${id}/cancelar`),
    onSuccess: invalidar,
  })
  return { gerar, pagar, estornar, cancelar }
}

// ---------------------------------------------------------------- gráfico

export function useSerieFinanceira(meses = 6) {
  return useQuery({
    queryKey: ['metricas', 'financeiro', meses],
    queryFn: async () =>
      (
        await api.get<{
          itens: { mes: string; receitaCentavos: number; despesaCentavos: number; resultadoCentavos: number }[]
        }>(`/metricas/financeiro?meses=${meses}`)
      ).itens.map((m) => ({
        mes: m.mes,
        receita: paraReais(m.receitaCentavos),
        despesa: paraReais(m.despesaCentavos),
        resultado: paraReais(m.resultadoCentavos),
      })),
  })
}
