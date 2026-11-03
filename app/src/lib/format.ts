import type { Faixa, StatusAluno, StatusPagamento } from '@/types'

export const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export const pct = (v: number, casas = 0) => `${v.toFixed(casas).replace('.', ',')}%`

export const dataCurta = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(
    new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')),
  )

export const dataLonga = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(
    new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')),
  )

/** Primeiro nome para cumprimentar, ignorando títulos ("Prof.", "Professora"). */
export const primeiroNome = (nome = '') =>
  nome.split(' ').filter((p) => !/^(prof|profa|professor|professora)\.?$/i.test(p))[0] ?? ''

export const iniciais = (nome: string) =>
  nome
    .split(' ')
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

export const idade = (nascimento: string) => {
  const n = new Date(nascimento + 'T12:00:00')
  const hoje = new Date()
  let a = hoje.getFullYear() - n.getFullYear()
  const m = hoje.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < n.getDate())) a--
  return a
}

export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const
export const DIAS_SEMANA_LONGO = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const

/* Cores das faixas — aplicadas com legenda explícita, nunca como único sinal */
export const FAIXAS: Record<Faixa, { label: string; cor: string; texto: string }> = {
  branca: { label: 'Branca', cor: '#e4e8ed', texto: '#111111' },
  cinza: { label: 'Cinza', cor: '#9aa3af', texto: '#ffffff' },
  amarela: { label: 'Amarela', cor: '#e8b708', texto: '#111111' },
  laranja: { label: 'Laranja', cor: '#e07a1f', texto: '#ffffff' },
  verde: { label: 'Verde', cor: '#1f8a4c', texto: '#ffffff' },
  azul: { label: 'Azul', cor: '#1764a8', texto: '#ffffff' },
  roxa: { label: 'Roxa', cor: '#6b3fa0', texto: '#ffffff' },
  marrom: { label: 'Marrom', cor: '#6b4429', texto: '#ffffff' },
  preta: { label: 'Preta', cor: '#111111', texto: '#ffffff' },
}

export const STATUS_ALUNO: Record<StatusAluno, { label: string; tom: 'neutro' | 'azul' | 'ok' | 'alerta' }> = {
  ativo: { label: 'Ativo', tom: 'ok' },
  experimental: { label: 'Experimental', tom: 'azul' },
  inativo: { label: 'Inativo', tom: 'neutro' },
}

export const STATUS_PAGAMENTO: Record<
  StatusPagamento,
  { label: string; tom: 'ok' | 'alerta' | 'urgente' }
> = {
  em_dia: { label: 'Em dia', tom: 'ok' },
  vence_em_breve: { label: 'Vence em breve', tom: 'alerta' },
  atrasado: { label: 'Atrasado', tom: 'urgente' },
}

/** Data de hoje (YYYY-MM-DD) no fuso do navegador. `toISOString()` usaria UTC e viraria o dia às 21h em Brasília. */
export const hojeISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Hora atual (HH:MM) no fuso do navegador. */
export const horaAgora = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
