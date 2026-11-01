/* =========================================================================
   Modelo de domínio do REDSHIELD, do jeito que as telas usam.
   A API fala em centavos e `null`; a conversão fica em `src/api/` (borda).
   ========================================================================= */

export type Papel = 'gestor' | 'professor' | 'aluno'

export interface Usuario {
  id: string
  nome: string
  email: string
  papel: Papel
  /** Só para papel 'aluno': a ficha de aluno que este login representa. */
  alunoId?: string
  avatar?: string
}

export type Faixa = 'branca' | 'cinza' | 'amarela' | 'laranja' | 'verde' | 'azul' | 'roxa' | 'marrom' | 'preta'

export type StatusAluno = 'ativo' | 'inativo' | 'experimental'

export type StatusPagamento = 'em_dia' | 'vence_em_breve' | 'atrasado'

export interface Aluno {
  id: string
  nome: string
  email: string // '' quando não informado
  telefone: string // '' quando não informado
  nascimento: string // ISO; '' quando não informado
  avatar?: string
  faixa: Faixa
  graus: number
  status: StatusAluno
  matriculaEm: string // ISO
  planoId: string // '' = sem plano
  vencimentoDia: number // dia do mês
  /** Calculado pelo servidor a partir das cobranças; não é editável. */
  statusPagamento: StatusPagamento
  frequencia30d: number // 0-100
  responsavel?: { nome: string; telefone: string }
  observacoes?: string
  /** Turmas em que o aluno está hoje (vínculo aluno ↔ turma, defeito 1). */
  turmaIds?: string[]
  /** Já tem login no sistema. */
  temAcesso?: boolean
  /** LGPD: quem consentiu e quando. */
  consentimento?: { em: string; por: string } | null
  usoImagemAutorizado?: boolean
}

export type Periodicidade = 'mensal' | 'trimestral' | 'semestral' | 'anual'

export interface Plano {
  id: string
  nome: string
  descricao: string
  valor: number
  periodicidade: Periodicidade
  aulasPorSemana: number | 'ilimitado'
  ativo: boolean
}

export interface Turma {
  id: string
  nome: string
  professor: string
  faixaEtaria: string
  nivel: string
  cor: string
  professorId?: string | null
  infantil?: boolean
  ativa?: boolean
}

export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Aula {
  id: string
  turmaId: string
  titulo: string
  diaSemana: DiaSemana
  inicio: string // "19:00"
  fim: string // "20:00"
  capacidade: number
  local: string
  ativa?: boolean
}

export type StatusPresenca = 'presente' | 'ausente' | 'justificado'

/** Quem registrou a presença: o professor na chamada, ou o próprio aluno pelo check-in. */
export type OrigemPresenca = 'professor' | 'aluno'

export interface RegistroPresenca {
  alunoId: string
  status: StatusPresenca
  origem?: OrigemPresenca // ausente nos registros antigos = professor
  horario?: string // "HH:MM" local, em que o registro foi feito
}

export interface ChamadaAula {
  id: string
  aulaId: string
  data: string // ISO date
  registros: RegistroPresenca[]
}

export type TipoTransacao = 'receita' | 'despesa'

export interface Transacao {
  id: string
  tipo: TipoTransacao
  categoria: string
  descricao: string
  valor: number
  data: string // ISO date
  alunoId?: string
  metodo: 'pix' | 'dinheiro' | 'cartao' | 'boleto' | 'transferencia'
  conciliada: boolean
}
