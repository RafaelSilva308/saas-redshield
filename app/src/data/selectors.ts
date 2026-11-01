import { ALUNOS, AULAS, CHAMADAS, PLANOS, TRANSACOES, TURMAS } from './mock'
import type { Aluno, Aula, Faixa } from '@/types'
import { FAIXAS } from '@/lib/format'

/* Cálculos derivados. Na Fase 2 a maioria vira endpoint /metrics no back-end,
   mas a assinatura de cada função permanece a mesma para o front. */

const hoje = new Date()
const mesDe = (iso: string) => iso.slice(0, 7)
const mesAtual = hoje.toISOString().slice(0, 7)
const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().slice(0, 7)

export const alunosAtivos = () => ALUNOS.filter((a) => a.status === 'ativo')

export const inadimplentes = () => ALUNOS.filter((a) => a.statusPagamento === 'atrasado')

export const vencendoEmBreve = () => ALUNOS.filter((a) => a.statusPagamento === 'vence_em_breve')

/** Novas matrículas no mês corrente. */
export const novasMatriculas = (mes = mesAtual) => ALUNOS.filter((a) => mesDe(a.matriculaEm) === mes).length

/** Média de presença (%) sobre as chamadas dos últimos N dias. */
export function taxaPresenca(dias = 30) {
  const limite = new Date(hoje)
  limite.setDate(limite.getDate() - dias)
  const janela = CHAMADAS.filter((c) => new Date(c.data + 'T12:00:00') >= limite)
  if (!janela.length) return 0
  const total = janela.reduce((s, c) => s + c.registros.length, 0)
  const presentes = janela.reduce((s, c) => s + c.registros.filter((r) => r.status === 'presente').length, 0)
  return total ? (presentes / total) * 100 : 0
}

/** Receita, despesa e resultado de um mês (YYYY-MM). */
export function fluxoDoMes(mes = mesAtual) {
  const doMes = TRANSACOES.filter((t) => mesDe(t.data) === mes)
  const receita = doMes.filter((t) => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
  const despesa = doMes.filter((t) => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
  return { receita, despesa, resultado: receita - despesa }
}

/** Variação percentual do mês corrente contra o anterior. */
export function variacaoReceita() {
  const atual = fluxoDoMes().receita
  const anterior = fluxoDoMes(mesAnterior).receita
  if (!anterior) return 0
  return ((atual - anterior) / anterior) * 100
}

/** Série dos últimos 6 meses para o gráfico de fluxo de caixa. */
export function serieFinanceira() {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1)
    const mes = d.toISOString().slice(0, 7)
    const { receita, despesa, resultado } = fluxoDoMes(mes)
    return {
      mes: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d).replace('.', ''),
      receita: Math.round(receita),
      despesa: Math.round(despesa),
      resultado: Math.round(resultado),
    }
  })
}

/** Série de presença por semana (últimas 8 semanas). */
export function seriePresenca() {
  return Array.from({ length: 8 }, (_, i) => {
    const fim = new Date(hoje)
    fim.setDate(fim.getDate() - (7 - i) * 7)
    const ini = new Date(fim)
    ini.setDate(ini.getDate() - 7)
    const janela = CHAMADAS.filter((c) => {
      const d = new Date(c.data + 'T12:00:00')
      return d > ini && d <= fim
    })
    const total = janela.reduce((s, c) => s + c.registros.length, 0)
    const presentes = janela.reduce((s, c) => s + c.registros.filter((r) => r.status === 'presente').length, 0)
    return {
      semana: `${String(ini.getDate()).padStart(2, '0')}/${String(ini.getMonth() + 1).padStart(2, '0')}`,
      presencas: presentes,
      taxa: total ? Math.round((presentes / total) * 100) : 0,
    }
  })
}

/** Distribuição de faixas entre alunos ativos. */
export function distribuicaoFaixas() {
  const ativos = alunosAtivos()
  const contagem = new Map<Faixa, number>()
  for (const a of ativos) contagem.set(a.faixa, (contagem.get(a.faixa) ?? 0) + 1)
  return [...contagem.entries()]
    .map(([faixa, qtd]) => ({
      faixa,
      label: FAIXAS[faixa].label,
      cor: FAIXAS[faixa].cor,
      qtd,
      pct: Math.round((qtd / ativos.length) * 100),
    }))
    .sort((a, b) => b.qtd - a.qtd)
}

/** Ocupação média por turma nos últimos 30 dias. */
export function ocupacaoTurmas() {
  const limite = new Date(hoje)
  limite.setDate(limite.getDate() - 30)
  return TURMAS.map((turma) => {
    const aulasDaTurma = AULAS.filter((a) => a.turmaId === turma.id)
    const ids = new Set(aulasDaTurma.map((a) => a.id))
    const chamadas = CHAMADAS.filter((c) => ids.has(c.aulaId) && new Date(c.data + 'T12:00:00') >= limite)
    const capacidadeMedia = aulasDaTurma.reduce((s, a) => s + a.capacidade, 0) / (aulasDaTurma.length || 1)
    const mediaPresentes = chamadas.length
      ? chamadas.reduce((s, c) => s + c.registros.filter((r) => r.status === 'presente').length, 0) / chamadas.length
      : 0
    return {
      turma: turma.nome,
      cor: turma.cor,
      mediaPresentes: Math.round(mediaPresentes),
      capacidade: Math.round(capacidadeMedia),
      ocupacao: capacidadeMedia ? Math.round((mediaPresentes / capacidadeMedia) * 100) : 0,
    }
  })
}

/** Próxima aula a partir de agora, considerando o quadro semanal. */
export function proximaAula() {
  const agora = new Date()
  for (let d = 0; d < 8; d++) {
    const alvo = new Date(agora)
    alvo.setDate(alvo.getDate() + d)
    const doDia = AULAS.filter((a) => a.diaSemana === alvo.getDay()).sort((a, b) => a.inicio.localeCompare(b.inicio))
    for (const aula of doDia) {
      const [h, m] = aula.inicio.split(':').map(Number)
      const quando = new Date(alvo)
      quando.setHours(h, m, 0, 0)
      if (quando > agora) return { aula, quando, hoje: d === 0 }
    }
  }
  return null
}

/** Aulas de um dia da semana, ordenadas por horário. */
export const aulasDoDia = (diaSemana: number) =>
  AULAS.filter((a) => a.diaSemana === diaSemana).sort((a, b) => a.inicio.localeCompare(b.inicio))

/** Receita recorrente mensal contratada (MRR). */
export function mrr() {
  return alunosAtivos().reduce((s, a) => {
    const p = PLANOS.find((x) => x.id === a.planoId)
    if (!p) return s
    const fator = { mensal: 1, trimestral: 1 / 3, semestral: 1 / 6, anual: 1 / 12 }[p.periodicidade]
    return s + p.valor * fator
  }, 0)
}

/** Valor total em aberto (mensalidades atrasadas). */
export function valorEmAberto() {
  return inadimplentes().reduce((s, a) => {
    const p = PLANOS.find((x) => x.id === a.planoId)
    if (!p) return s
    return s + (p.periodicidade === 'anual' ? p.valor / 12 : p.valor)
  }, 0)
}

/** Alunos sem presença registrada nos últimos N dias — risco de evasão. */
export function emRiscoDeEvasao(dias = 14) {
  const limite = new Date(hoje)
  limite.setDate(limite.getDate() - dias)
  const recentes = new Set(
    CHAMADAS.filter((c) => new Date(c.data + 'T12:00:00') >= limite)
      .flatMap((c) => c.registros.filter((r) => r.status === 'presente').map((r) => r.alunoId)),
  )
  return alunosAtivos().filter((a) => !recentes.has(a.id))
}

/** O aluno pode estar na chamada desta aula? Ativo ou experimental, e turma infantil só com responsável.
    Regra provisória do protótipo: na Fase 2 vem do vínculo aluno × turma (tabela `aluno_turma`). */
export function alunoNaAula(aluno: Aluno, aula: Aula) {
  if (aluno.status === 'inativo') return false
  const infantil = ['t3', 't4'].includes(aula.turmaId)
  return infantil ? !!aluno.responsavel : !aluno.responsavel
}
