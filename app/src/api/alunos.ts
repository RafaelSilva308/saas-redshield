import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { paraReais } from '@/lib/dinheiro'
import type { Aluno, Faixa, StatusAluno, StatusPagamento, StatusPresenca } from '@/types'

/* Alunos: /alunos e /alunos/:id/... (gestor e professor). Excluir é só do gestor. */

export interface AlunoDto {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  nascimento: string | null
  faixa: Faixa
  graus: number
  status: StatusAluno
  matriculaEm: string
  planoId: string | null
  vencimentoDia: number
  statusPagamento: StatusPagamento
  frequencia30d: number
  responsavel: { nome: string; telefone: string } | null
  observacoes: string | null
  consentimento: { em: string; por: string } | null
  usoImagemAutorizado: boolean
  turmaIds: string[]
  temAcesso: boolean
}

export const deAlunoDto = (a: AlunoDto): Aluno => ({
  id: a.id,
  nome: a.nome,
  email: a.email ?? '',
  telefone: a.telefone ?? '',
  nascimento: a.nascimento ?? '',
  faixa: a.faixa,
  graus: a.graus,
  status: a.status,
  matriculaEm: a.matriculaEm,
  planoId: a.planoId ?? '',
  vencimentoDia: a.vencimentoDia,
  statusPagamento: a.statusPagamento,
  frequencia30d: Math.round(a.frequencia30d),
  responsavel: a.responsavel ?? undefined,
  observacoes: a.observacoes ?? undefined,
  turmaIds: a.turmaIds,
  temAcesso: a.temAcesso,
  consentimento: a.consentimento,
  usoImagemAutorizado: a.usoImagemAutorizado,
})

/** O que o formulário envia. Situação de pagamento e frequência são calculadas pelo servidor e não vão. */
export interface AlunoEdicao {
  aluno: Aluno
  /** Preenchido só quando o consentimento é registrado agora (o servidor grava a data). */
  consentimentoPor?: string
}

export const paraAlunoDto = ({ aluno: a, consentimentoPor }: AlunoEdicao) => ({
  nome: a.nome.trim(),
  email: a.email.trim() || null,
  telefone: a.telefone.trim() || null,
  nascimento: a.nascimento || null,
  faixa: a.faixa,
  graus: a.graus,
  status: a.status,
  matriculaEm: a.matriculaEm,
  planoId: a.planoId || null,
  vencimentoDia: a.vencimentoDia,
  responsavel: a.responsavel ? { nome: a.responsavel.nome.trim(), telefone: a.responsavel.telefone.trim() } : null,
  observacoes: a.observacoes?.trim() || null,
  usoImagemAutorizado: a.usoImagemAutorizado ?? false,
  turmaIds: a.turmaIds ?? [],
  ...(consentimentoPor?.trim() ? { consentimento: { por: consentimentoPor.trim() } } : {}),
})

export const CHAVE_ALUNOS = ['alunos'] as const

/** A API pagina em até 200; a tela de alunos precisa da lista inteira para filtrar e contar. */
async function buscarTodos(): Promise<Aluno[]> {
  const todos: AlunoDto[] = []
  for (let pagina = 1; ; pagina++) {
    const r = await api.get<{ itens: AlunoDto[]; total: number }>(`/alunos?limite=200&pagina=${pagina}`)
    todos.push(...r.itens)
    if (todos.length >= r.total || r.itens.length === 0) break
  }
  return todos.map(deAlunoDto)
}

export function useAlunos(habilitado = true) {
  return useQuery({ queryKey: CHAVE_ALUNOS, queryFn: buscarTodos, enabled: habilitado })
}

export function useAluno(id: string | undefined) {
  return useQuery({
    queryKey: [...CHAVE_ALUNOS, id],
    queryFn: async () => deAlunoDto(await api.get<AlunoDto>(`/alunos/${id}`)),
    enabled: !!id,
  })
}

export function useSalvarAluno() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: async (e: AlunoEdicao) => {
      const corpo = paraAlunoDto(e)
      const r = e.aluno.id
        ? await api.patch<AlunoDto>(`/alunos/${e.aluno.id}`, corpo)
        : await api.post<AlunoDto>('/alunos', corpo)
      return deAlunoDto(r)
    },
    // Presença, cobrança e métricas dependem do cadastro (turmas, plano, status).
    onSuccess: () => cliente.invalidateQueries(),
  })
}

export function useRemoverAluno() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/alunos/${id}`),
    onSuccess: (_, id) => {
      // Sem isso a ficha apagada seria buscada de novo (404) antes de a tela sair dela.
      cliente.removeQueries({ queryKey: [...CHAVE_ALUNOS, id] })
      return cliente.invalidateQueries()
    },
  })
}

/** Cria o login do aluno e envia o convite por e-mail (D5). */
export function useConvidarAluno() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ id, email }: { id: string; email?: string }) =>
      api.post(`/alunos/${id}/acesso`, email ? { email } : {}),
    onSuccess: () => cliente.invalidateQueries({ queryKey: CHAVE_ALUNOS }),
  })
}

// ------------------------------------------------------------- histórico

export interface PresencaAluno {
  data: string
  aulaId: string
  titulo: string
  inicio: string
  /** `sem_checkin` = aula realizada sem registro: é falta (D2). */
  situacao: StatusPresenca | 'sem_checkin'
  origem: 'aluno' | 'professor' | null
  registradoEm: string | null
  observacao: string | null
}

export function usePresencasAluno(id: string | undefined, dias = 90) {
  return useQuery({
    queryKey: [...CHAVE_ALUNOS, id, 'presencas', dias],
    queryFn: async () => (await api.get<{ itens: PresencaAluno[] }>(`/alunos/${id}/presencas?dias=${dias}`)).itens,
    enabled: !!id,
  })
}

export type SituacaoCobranca = 'aberta' | 'atrasada' | 'paga' | 'cancelada'

export interface CobrancaDto {
  id: string
  alunoId: string
  alunoNome: string | null
  planoId: string | null
  competencia: string
  vencimento: string
  valorCentavos: number
  status: 'aberta' | 'paga' | 'cancelada'
  situacao: SituacaoCobranca
  pagoEm: string | null
  diasAtraso: number
}

export interface Cobranca extends Omit<CobrancaDto, 'valorCentavos'> {
  valor: number
}

export const deCobrancaDto = ({ valorCentavos, ...c }: CobrancaDto): Cobranca => ({
  ...c,
  valor: paraReais(valorCentavos),
})

/** Cobranças do aluno (só o gestor). */
export function useCobrancasAluno(id: string | undefined, habilitado: boolean) {
  return useQuery({
    queryKey: ['cobrancas', 'aluno', id],
    queryFn: async () => (await api.get<{ itens: CobrancaDto[] }>(`/alunos/${id}/cobrancas`)).itens.map(deCobrancaDto),
    enabled: !!id && habilitado,
  })
}

/** Registra uma graduação; o banco atualiza faixa e graus do aluno na mesma transação. */
export function useGraduar() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ id, faixa, graus }: { id: string; faixa: Faixa; graus: number }) =>
      api.post(`/alunos/${id}/graduacoes`, { faixa, graus }),
    onSuccess: () =>
      Promise.all([
        cliente.invalidateQueries({ queryKey: CHAVE_ALUNOS }),
        cliente.invalidateQueries({ queryKey: ['metricas'] }),
      ]),
  })
}
