import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

/* Configurações: dados da academia (todos leem, o gestor altera), avisos por e-mail (gestor)
   e troca da própria senha (qualquer papel). */

export interface Academia {
  id: string
  nome: string
  cnpj: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  fuso: string
}

export type TipoAviso = 'vencimento' | 'inadimplencia' | 'aniversario' | 'ausencia' | 'resumo_semanal'

const CHAVE_ACADEMIA = ['academia'] as const
const CHAVE_AVISOS = ['avisos'] as const

export function useAcademia() {
  return useQuery({ queryKey: CHAVE_ACADEMIA, queryFn: () => api.get<Academia>('/academia') })
}

export function useSalvarAcademia() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ nome, cnpj, telefone, email, endereco, fuso }: Academia) =>
      api.patch<Academia>('/academia', {
        nome: nome.trim(),
        cnpj: cnpj?.trim() || null,
        telefone: telefone?.trim() || null,
        email: email?.trim() || null,
        endereco: endereco?.trim() || null,
        fuso,
      }),
    // O fuso muda o "hoje" de check-in, presença e métricas.
    onSuccess: (a) => {
      cliente.setQueryData(CHAVE_ACADEMIA, a)
      return cliente.invalidateQueries()
    },
  })
}

/** Sem configuração gravada o aviso fica desligado: nenhum e-mail sai sem o gestor ligar (E9). */
export function useAvisos(habilitado = true) {
  return useQuery({
    queryKey: CHAVE_AVISOS,
    queryFn: async () => (await api.get<{ itens: { tipo: TipoAviso; ativo: boolean }[] }>('/avisos')).itens,
    enabled: habilitado,
  })
}

export function useAlternarAviso() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ tipo, ativo }: { tipo: TipoAviso; ativo: boolean }) => api.put(`/avisos/${tipo}`, { ativo }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: CHAVE_AVISOS }),
  })
}

/** Troca a própria senha; as outras sessões do usuário são encerradas pelo servidor. */
export function useTrocarSenha() {
  return useMutation({
    mutationFn: (d: { senhaAtual: string; novaSenha: string }) => api.post('/auth/trocar-senha', d),
  })
}
