import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { paraReais } from '@/lib/dinheiro'
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

interface PainelBase {
  alunosAtivos: number
  taxaPresenca30d: number
  emRiscoDeEvasao: { total: number; itens: { alunoId: string; nome: string; ultimaPresenca: string | null }[] }
  proximaAula: ProximaAula | null
}

export interface PainelProfessor extends PainelBase {
  papel: 'professor'
}

export interface PainelGestor extends PainelBase {
  papel: 'gestor'
  novasMatriculasMes: number
  mrr: number
  inadimplentes: { alunos: number; valorEmAberto: number }
  vencendoEmBreve: number
  fluxoDoMes: { receita: number; despesa: number; resultado: number }
  variacaoReceitaPct: number | null
}

type PainelGestorDto = Omit<PainelGestor, 'mrr' | 'inadimplentes' | 'fluxoDoMes'> & {
  mrrCentavos: number
  inadimplentes: { alunos: number; valorEmAbertoCentavos: number }
  fluxoDoMes: { receitaCentavos: number; despesaCentavos: number; resultadoCentavos: number }
}

/** Painel da equipe. O gestor recebe também os números financeiros (convertidos para reais aqui). */
export function usePainelEquipe(habilitado = true) {
  return useQuery({
    queryKey: [...CHAVE_METRICAS, 'painel', 'equipe'],
    queryFn: async (): Promise<PainelGestor | PainelProfessor> => {
      const r = await api.get<PainelGestorDto | PainelProfessor>('/metricas/painel')
      if (r.papel !== 'gestor') return r
      const { mrrCentavos, inadimplentes, fluxoDoMes, ...resto } = r
      return {
        ...resto,
        mrr: paraReais(mrrCentavos),
        inadimplentes: { alunos: inadimplentes.alunos, valorEmAberto: paraReais(inadimplentes.valorEmAbertoCentavos) },
        fluxoDoMes: {
          receita: paraReais(fluxoDoMes.receitaCentavos),
          despesa: paraReais(fluxoDoMes.despesaCentavos),
          resultado: paraReais(fluxoDoMes.resultadoCentavos),
        },
      }
    },
    enabled: habilitado,
  })
}

/** Distribuição de faixas dos alunos ativos (só contagens, qualquer papel). */
export function useFaixas() {
  return useQuery({
    queryKey: [...CHAVE_METRICAS, 'faixas'],
    queryFn: () => api.get<{ total: number; itens: { faixa: Faixa; qtd: number; pct: number }[] }>('/metricas/faixas'),
  })
}

export function useOcupacao(habilitado = true) {
  return useQuery({
    queryKey: [...CHAVE_METRICAS, 'ocupacao'],
    queryFn: async () =>
      (
        await api.get<{
          itens: {
            turmaId: string
            turma: string
            cor: string
            mediaPresentes: number
            capacidade: number
            ocupacaoPct: number
          }[]
        }>('/metricas/ocupacao')
      ).itens,
    enabled: habilitado,
  })
}

export function useSeriePresenca(semanas = 8, habilitado = true) {
  return useQuery({
    queryKey: [...CHAVE_METRICAS, 'presenca', semanas],
    queryFn: async () =>
      (
        await api.get<{ itens: { inicio: string; presencas: number; taxa: number }[] }>(
          `/metricas/presenca?semanas=${semanas}`,
        )
      ).itens,
    enabled: habilitado,
  })
}

export interface Elegivel {
  alunoId: string
  nome: string
  faixa: Faixa
  graus: number
  proxima: { faixa: Faixa; graus: number }
  diasDesdeUltima: number
  frequencia30d: number
}

/** Elegíveis à graduação. A regra ainda é provisória (pendência E1) e vem junto para a tela dizer isso. */
export function useElegiveis(habilitado = true) {
  return useQuery({
    queryKey: [...CHAVE_METRICAS, 'elegiveis'],
    queryFn: () =>
      api.get<{
        regraProvisoria: { diasMinimos: number; frequenciaMinima: number; grausPorFaixa: number }
        itens: Elegivel[]
      }>('/graduacoes/elegiveis'),
    enabled: habilitado,
  })
}
