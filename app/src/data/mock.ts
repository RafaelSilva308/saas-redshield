import type {
  Aluno,
  Aula,
  ChamadaAula,
  Faixa,
  Plano,
  RegistroPresenca,
  StatusAluno,
  StatusPagamento,
  Transacao,
  Turma,
  Usuario,
} from '@/types'

/* =========================================================================
   Camada de dados MOCK.
   Tudo aqui é substituído por chamadas HTTP na Fase 2 (ver PLANO_DESENVOLVIMENTO.md).
   O formato de cada objeto já espelha o contrato da API planejada.
   ========================================================================= */

/** PRNG determinístico — os dados são sempre os mesmos entre recarregamentos. */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}
const rand = rng(20260822)
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min

const hoje = new Date()
const isoDia = (d: Date) => d.toISOString().slice(0, 10)
const somaDias = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

// ---------------------------------------------------------------- usuários

export const USUARIOS: Usuario[] = [
  { id: 'u1', nome: 'Professor Carlos Vasques', email: 'professor@redshield.com.br', papel: 'professor' },
  { id: 'u2', nome: 'Renata Moura', email: 'gestor@redshield.com.br', papel: 'gestor' },
  { id: 'u3', nome: 'Pedro Almeida', email: 'aluno@redshield.com.br', papel: 'aluno', alunoId: 'al1' },
]

// ------------------------------------------------------------------ planos

export const PLANOS: Plano[] = [
  {
    id: 'p1',
    nome: 'Fundamentos',
    descricao: 'Duas aulas por semana na turma de fundamentos. Ideal para quem está começando.',
    valor: 180,
    periodicidade: 'mensal',
    aulasPorSemana: 2,
    ativo: true,
  },
  {
    id: 'p2',
    nome: 'Integral',
    descricao: 'Acesso a todas as turmas do quadro de horários, sem limite de aulas.',
    valor: 260,
    periodicidade: 'mensal',
    aulasPorSemana: 'ilimitado',
    ativo: true,
  },
  {
    id: 'p3',
    nome: 'Kids',
    descricao: 'Turmas infantis e juvenis, três vezes por semana, com acompanhamento pedagógico.',
    valor: 160,
    periodicidade: 'mensal',
    aulasPorSemana: 3,
    ativo: true,
  },
  {
    id: 'p4',
    nome: 'Integral Anual',
    descricao: 'Plano integral com pagamento anual e desconto equivalente a dois meses.',
    valor: 2600,
    periodicidade: 'anual',
    aulasPorSemana: 'ilimitado',
    ativo: true,
  },
  {
    id: 'p5',
    nome: 'Competição',
    descricao: 'Treino integral mais sessões de preparação para campeonatos.',
    valor: 340,
    periodicidade: 'mensal',
    aulasPorSemana: 'ilimitado',
    ativo: false,
  },
]

// ------------------------------------------------------------------ turmas

export const TURMAS: Turma[] = [
  { id: 't1', nome: 'Fundamentos', professor: 'Prof. Carlos', faixaEtaria: 'Adulto', nivel: 'Iniciante', cor: '#1764a8' },
  { id: 't2', nome: 'Avançada', professor: 'Prof. Carlos', faixaEtaria: 'Adulto', nivel: 'Azul+', cor: '#12507f' },
  { id: 't3', nome: 'Kids 7–11', professor: 'Profa. Renata', faixaEtaria: '7 a 11 anos', nivel: 'Infantil', cor: '#246db1' },
  { id: 't4', nome: 'Juvenil 12–15', professor: 'Profa. Renata', faixaEtaria: '12 a 15 anos', nivel: 'Juvenil', cor: '#7fabd8' },
  { id: 't5', nome: 'No-Gi', professor: 'Prof. Léo', faixaEtaria: 'Adulto', nivel: 'Livre', cor: '#667085' },
]

// ------------------------------------------------------------------- aulas

export const AULAS: Aula[] = [
  { id: 'a1', turmaId: 't1', titulo: 'Fundamentos de Guarda', diaSemana: 1, inicio: '19:00', fim: '20:00', capacidade: 30, local: 'Tatame 1' },
  { id: 'a2', turmaId: 't5', titulo: 'Treino Livre', diaSemana: 1, inicio: '06:30', fim: '07:30', capacidade: 20, local: 'Tatame 1' },
  { id: 'a3', turmaId: 't3', titulo: 'Kids — Base e Quedas', diaSemana: 1, inicio: '17:00', fim: '17:50', capacidade: 24, local: 'Tatame 2' },
  { id: 'a4', turmaId: 't2', titulo: 'Condicionamento', diaSemana: 2, inicio: '07:00', fim: '08:00', capacidade: 24, local: 'Tatame 1' },
  { id: 'a5', turmaId: 't1', titulo: 'Posicionamento', diaSemana: 2, inicio: '19:00', fim: '20:00', capacidade: 30, local: 'Tatame 1' },
  { id: 'a6', turmaId: 't4', titulo: 'Juvenil — Passagem', diaSemana: 2, inicio: '18:00', fim: '19:00', capacidade: 20, local: 'Tatame 2' },
  { id: 'a7', turmaId: 't1', titulo: 'Raspagens', diaSemana: 3, inicio: '19:00', fim: '20:00', capacidade: 30, local: 'Tatame 1' },
  { id: 'a8', turmaId: 't2', titulo: 'Sparring', diaSemana: 3, inicio: '20:00', fim: '21:00', capacidade: 30, local: 'Tatame 1' },
  { id: 'a9', turmaId: 't3', titulo: 'Kids — Jogos de Guarda', diaSemana: 3, inicio: '17:00', fim: '17:50', capacidade: 24, local: 'Tatame 2' },
  { id: 'a10', turmaId: 't5', titulo: 'No-Gi — Controle', diaSemana: 4, inicio: '06:30', fim: '07:30', capacidade: 20, local: 'Tatame 1' },
  { id: 'a11', turmaId: 't1', titulo: 'Finalizações', diaSemana: 4, inicio: '19:00', fim: '20:00', capacidade: 30, local: 'Tatame 1' },
  { id: 'a12', turmaId: 't4', titulo: 'Juvenil — Sparring', diaSemana: 4, inicio: '18:00', fim: '19:00', capacidade: 20, local: 'Tatame 2' },
  { id: 'a13', turmaId: 't2', titulo: 'Avançada — Guarda Aberta', diaSemana: 5, inicio: '19:00', fim: '20:30', capacidade: 30, local: 'Tatame 1' },
  { id: 'a14', turmaId: 't3', titulo: 'Kids — Recreativo', diaSemana: 5, inicio: '17:00', fim: '17:50', capacidade: 24, local: 'Tatame 2' },
  { id: 'a15', turmaId: 't5', titulo: 'Open Mat', diaSemana: 6, inicio: '10:00', fim: '11:30', capacidade: 40, local: 'Tatame 1' },
]

// ------------------------------------------------------------------ alunos

const NOMES = [
  'Pedro Almeida', 'Maria Santos', 'João Ferreira', 'Lucas Mendes', 'Beatriz Lima',
  'Rafael Costa', 'Camila Rocha', 'Thiago Barbosa', 'Juliana Prado', 'Gustavo Nunes',
  'Larissa Teixeira', 'Bruno Carvalho', 'Amanda Ribeiro', 'Felipe Andrade', 'Isabela Cardoso',
  'Marcelo Pires', 'Fernanda Duarte', 'Vitor Machado', 'Carolina Souza', 'Diego Ramos',
  'Patrícia Alves', 'Henrique Moreira', 'Natália Freitas', 'Eduardo Campos', 'Sofia Martins',
  'André Batista', 'Letícia Gomes', 'Rodrigo Pinto', 'Mariana Vieira', 'Caio Monteiro',
  'Helena Braga', 'Otávio Lopes', 'Clara Fonseca', 'Igor Salgado', 'Débora Antunes',
]

const FAIXAS_ADULTO: Faixa[] = ['branca', 'branca', 'branca', 'azul', 'azul', 'roxa', 'marrom', 'preta']
const FAIXAS_KIDS: Faixa[] = ['branca', 'cinza', 'amarela', 'laranja', 'verde']

export const ALUNOS: Aluno[] = NOMES.map((nome, i) => {
  const kids = i % 5 === 2 // ~1 em cada 5 é aluno infantil
  const faixa = kids ? pick(FAIXAS_KIDS) : pick(FAIXAS_ADULTO)
  const status: StatusAluno = i % 11 === 4 ? 'inativo' : i % 9 === 7 ? 'experimental' : 'ativo'
  const pagRoll = rand()
  const statusPagamento: StatusPagamento =
    status === 'inativo' ? 'atrasado' : pagRoll > 0.86 ? 'atrasado' : pagRoll > 0.74 ? 'vence_em_breve' : 'em_dia'
  const nascAno = kids ? int(2012, 2018) : int(1978, 2006)

  return {
    id: `al${i + 1}`,
    nome,
    email: nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ /g, '.') + '@email.com',
    telefone: `(11) 9${int(4000, 9999)}-${int(1000, 9999)}`,
    nascimento: `${nascAno}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
    faixa,
    graus: faixa === 'preta' ? int(0, 2) : int(0, 4),
    status,
    // Um em cada oito é matrícula recente, para o painel mostrar entradas do mês.
    matriculaEm: isoDia(somaDias(hoje, i % 8 === 3 ? -int(1, 26) : -int(60, 1400))),
    planoId: kids ? 'p3' : pick(['p1', 'p2', 'p2', 'p4']),
    vencimentoDia: pick([5, 5, 10, 10, 15, 20, 25]),
    statusPagamento,
    frequencia30d: status === 'inativo' ? int(0, 15) : int(48, 98),
    responsavel: kids ? { nome: `Responsável de ${nome.split(' ')[0]}`, telefone: `(11) 9${int(4000, 9999)}-${int(1000, 9999)}` } : undefined,
    observacoes: i % 7 === 0 ? 'Recuperando lesão no joelho direito. Evitar quedas por 30 dias.' : undefined,
  }
})

// --------------------------------------------------------------- chamadas

/** Chamadas dos últimos 45 dias, geradas a partir do quadro de horários. */
export const CHAMADAS: ChamadaAula[] = (() => {
  const out: ChamadaAula[] = []
  const ativos = ALUNOS.filter((a) => a.status !== 'inativo')
  for (let d = 45; d >= 0; d--) {
    const data = somaDias(hoje, -d)
    const dow = data.getDay()
    for (const aula of AULAS.filter((x) => x.diaSemana === dow)) {
      const elegiveis = ativos.filter((a) => {
        const kids = ['t3', 't4'].includes(aula.turmaId)
        return kids ? !!a.responsavel : !a.responsavel
      })
      const registros = elegiveis
        .filter(() => rand() < 0.45)
        .map<RegistroPresenca>((a) => ({
          alunoId: a.id,
          status: rand() < 0.93 ? 'presente' : rand() < 0.5 ? 'justificado' : 'ausente',
        }))
      out.push({
        id: `ch-${isoDia(data)}-${aula.id}`,
        aulaId: aula.id,
        data: isoDia(data),
        registros,
      })
    }
  }
  return out
})()

// ------------------------------------------------------------- transações

const CATEGORIAS_DESPESA = ['Aluguel', 'Energia', 'Água', 'Materiais', 'Marketing', 'Equipe', 'Manutenção', 'Impostos']

export const TRANSACOES: Transacao[] = (() => {
  const out: Transacao[] = []
  let n = 1
  for (let m = 5; m >= 0; m--) {
    const base = new Date(hoje.getFullYear(), hoje.getMonth() - m, 1)

    // Receitas: mensalidades dos alunos ativos
    for (const aluno of ALUNOS.filter((a) => a.status === 'ativo')) {
      const plano = PLANOS.find((p) => p.id === aluno.planoId)!
      if (plano.periodicidade === 'anual' && base.getMonth() !== 0 && m !== 5) continue
      const dia = Math.min(aluno.vencimentoDia, 28)
      const data = new Date(base.getFullYear(), base.getMonth(), dia)
      if (data > hoje) continue
      if (m === 0 && aluno.statusPagamento === 'atrasado') continue
      out.push({
        id: `tr${n++}`,
        tipo: 'receita',
        categoria: 'Mensalidade',
        descricao: `Mensalidade ${plano.nome} — ${aluno.nome}`,
        valor: plano.periodicidade === 'anual' ? plano.valor / 12 : plano.valor,
        data: isoDia(data),
        alunoId: aluno.id,
        metodo: pick(['pix', 'pix', 'pix', 'cartao', 'dinheiro', 'boleto'] as const),
        conciliada: m > 0,
      })
    }

    // Receitas avulsas
    for (let k = 0; k < int(1, 3); k++) {
      const data = new Date(base.getFullYear(), base.getMonth(), int(2, 27))
      if (data > hoje) continue
      out.push({
        id: `tr${n++}`,
        tipo: 'receita',
        categoria: pick(['Loja', 'Matrícula', 'Seminário', 'Exame de faixa']),
        descricao: pick(['Venda de kimono', 'Taxa de matrícula', 'Seminário de guarda', 'Exame de graduação']),
        valor: int(120, 900),
        data: isoDia(data),
        metodo: pick(['pix', 'cartao', 'dinheiro'] as const),
        conciliada: m > 0,
      })
    }

    // Despesas
    for (const cat of CATEGORIAS_DESPESA) {
      const data = new Date(base.getFullYear(), base.getMonth(), int(2, 27))
      if (data > hoje) continue
      // Escala compatível com uma academia de bairro (~30 alunos ativos):
      // o total mensal fica em torno de 70% da receita, deixando resultado positivo.
      const valores: Record<string, [number, number]> = {
        Aluguel: [2600, 2600], Energia: [320, 520], Água: [90, 170],
        Materiais: [120, 620], Marketing: [150, 480], Equipe: [1400, 1900],
        Manutenção: [80, 380], Impostos: [340, 620],
      }
      const [lo, hi] = valores[cat]
      out.push({
        id: `tr${n++}`,
        tipo: 'despesa',
        categoria: cat,
        descricao: `${cat} — ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(base)}`,
        valor: int(lo, hi),
        data: isoDia(data),
        metodo: pick(['transferencia', 'boleto', 'pix'] as const),
        conciliada: m > 0,
      })
    }
  }
  return out.sort((a, b) => b.data.localeCompare(a.data))
})()

// ---------------------------------------------------------- consultas úteis

export const alunoPorId = (id: string) => ALUNOS.find((a) => a.id === id)
export const planoPorId = (id: string) => PLANOS.find((p) => p.id === id)
export const turmaPorId = (id: string) => TURMAS.find((t) => t.id === id)
export const aulaPorId = (id: string) => AULAS.find((a) => a.id === id)
