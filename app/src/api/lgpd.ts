import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

/* Importação de alunos por CSV e direitos do titular (LGPD). Tudo só do gestor, auditado no servidor. */

export interface ResultadoImportacao {
  simulacao: boolean
  colunasReconhecidas: string[]
  totais: { linhas: number; validas: number; rejeitadas: number }
  rejeitadas: { linha: number; motivo: string }[]
  criados: number
}

/** Por padrão a API só simula: devolve totais e linhas rejeitadas sem gravar nada. */
export function useImportarAlunos() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (d: { csv: string; simular: boolean; consentimentoPor?: string }) =>
      api.post<ResultadoImportacao>('/alunos/importar', {
        csv: d.csv,
        simular: d.simular,
        ...(d.consentimentoPor?.trim() ? { consentimentoPor: d.consentimentoPor.trim() } : {}),
      }),
    onSuccess: (r) => {
      if (!r.simulacao && r.criados > 0) return cliente.invalidateQueries()
    },
  })
}

/** Baixa a cópia dos dados do aluno (art. 18) como arquivo JSON. */
export function useExportarDados() {
  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const dados = await api.get<unknown>(`/alunos/${id}/exportacao`)
      const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `dados-${nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}.json`
      link.click()
      URL.revokeObjectURL(url)
    },
  })
}

/** Irreversível: apaga os dados pessoais e encerra o acesso. A API exige a palavra ANONIMIZAR. */
export function useAnonimizar() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/alunos/${id}/anonimizar`, { confirmacao: 'ANONIMIZAR' }),
    onSuccess: () => cliente.invalidateQueries(),
  })
}
