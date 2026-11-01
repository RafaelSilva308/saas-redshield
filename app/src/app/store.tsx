import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { ALUNOS, AULAS, CHAMADAS, PLANOS, TRANSACOES } from '@/data/mock'
import { hojeISO, horaAgora } from '@/lib/format'
import { alunoNaAula } from '@/data/selectors'
import type { Aluno, Aula, ChamadaAula, Plano, StatusPresenca, Transacao } from '@/types'

/* Store em memória.
   Cada função aqui corresponde a um endpoint planejado na Fase 2
   (ver seção "Contrato de API" do PLANO_DESENVOLVIMENTO.md).
   Trocar este arquivo por TanStack Query + fetch é o único ponto de costura. */

interface Store {
  alunos: Aluno[]
  planos: Plano[]
  aulas: Aula[]
  chamadas: ChamadaAula[]
  transacoes: Transacao[]

  salvarAluno: (a: Aluno) => void
  removerAluno: (id: string) => void

  salvarPlano: (p: Plano) => void
  alternarPlano: (id: string) => void

  salvarAula: (a: Aula) => void
  removerAula: (id: string) => void

  marcarPresenca: (aulaId: string, data: string, alunoId: string, status: StatusPresenca) => void
  chamadaDe: (aulaId: string, data: string) => ChamadaAula | undefined

  /** O próprio aluno registra presença na aula de hoje. Vale na hora, sem confirmação do professor. */
  fazerCheckin: (aulaId: string, alunoId: string) => ResultadoCheckin
  /** O aluno desfaz o próprio check-in (só o que ele mesmo registrou). */
  desfazerCheckin: (aulaId: string, alunoId: string) => ResultadoCheckin

  salvarTransacao: (t: Transacao) => void
  removerTransacao: (id: string) => void
}

export interface ResultadoCheckin {
  ok: boolean
  erro?: string
}

const StoreCtx = createContext<Store | null>(null)

const novoId = (prefixo: string) => `${prefixo}${Date.now().toString(36)}`

export function StoreProvider({ children }: { children: ReactNode }) {
  const [alunos, setAlunos] = useState<Aluno[]>(ALUNOS)
  const [planos, setPlanos] = useState<Plano[]>(PLANOS)
  const [aulas, setAulas] = useState<Aula[]>(AULAS)
  const [chamadas, setChamadas] = useState<ChamadaAula[]>(CHAMADAS)
  const [transacoes, setTransacoes] = useState<Transacao[]>(TRANSACOES)

  const upsert = <T extends { id: string }>(lista: T[], item: T) =>
    lista.some((x) => x.id === item.id) ? lista.map((x) => (x.id === item.id ? item : x)) : [item, ...lista]

  const salvarAluno = useCallback((a: Aluno) => {
    setAlunos((atual) => upsert(atual, a.id ? a : { ...a, id: novoId('al') }))
  }, [])

  const removerAluno = useCallback((id: string) => {
    setAlunos((atual) => atual.filter((a) => a.id !== id))
  }, [])

  const salvarPlano = useCallback((p: Plano) => {
    setPlanos((atual) => upsert(atual, p.id ? p : { ...p, id: novoId('p') }))
  }, [])

  const alternarPlano = useCallback((id: string) => {
    setPlanos((atual) => atual.map((p) => (p.id === id ? { ...p, ativo: !p.ativo } : p)))
  }, [])

  const salvarAula = useCallback((a: Aula) => {
    setAulas((atual) => upsert(atual, a.id ? a : { ...a, id: novoId('a') }))
  }, [])

  const removerAula = useCallback((id: string) => {
    setAulas((atual) => atual.filter((a) => a.id !== id))
  }, [])

  /** Grava (ou troca) o registro de um aluno em uma chamada. `origem` diz quem fez. */
  const gravarRegistro = useCallback(
    (aulaId: string, data: string, alunoId: string, status: StatusPresenca, origem: 'professor' | 'aluno') => {
      const registro = { alunoId, status, origem, horario: horaAgora() }
      setChamadas((atual) => {
        const idx = atual.findIndex((c) => c.aulaId === aulaId && c.data === data)
        if (idx === -1) {
          return [...atual, { id: `ch-${data}-${aulaId}`, aulaId, data, registros: [registro] }]
        }
        const alvo = atual[idx]
        const existe = alvo.registros.some((r) => r.alunoId === alunoId)
        const registros = existe
          ? alvo.registros.map((r) => (r.alunoId === alunoId ? registro : r))
          : [...alvo.registros, registro]
        const copia = [...atual]
        copia[idx] = { ...alvo, registros }
        return copia
      })
    },
    [],
  )

  const marcarPresenca = useCallback(
    (aulaId: string, data: string, alunoId: string, status: StatusPresenca) =>
      gravarRegistro(aulaId, data, alunoId, status, 'professor'),
    [gravarRegistro],
  )

  const salvarTransacao = useCallback((t: Transacao) => {
    setTransacoes((atual) => {
      const lista = upsert(atual, t.id ? t : { ...t, id: novoId('tr') })
      return [...lista].sort((a, b) => b.data.localeCompare(a.data))
    })
  }, [])

  const removerTransacao = useCallback((id: string) => {
    setTransacoes((atual) => atual.filter((t) => t.id !== id))
  }, [])

  const fazerCheckin = useCallback(
    (aulaId: string, alunoId: string): ResultadoCheckin => {
      const aula = aulas.find((a) => a.id === aulaId)
      const aluno = alunos.find((a) => a.id === alunoId)
      if (!aula || !aluno) return { ok: false, erro: 'Aula ou aluno não encontrado.' }

      const data = hojeISO()
      if (aula.diaSemana !== new Date().getDay()) return { ok: false, erro: 'Essa aula não acontece hoje.' }
      if (!alunoNaAula(aluno, aula)) return { ok: false, erro: 'Você não está matriculado nessa turma.' }

      const chamada = chamadas.find((c) => c.aulaId === aulaId && c.data === data)

      const existente = chamada?.registros.find((r) => r.alunoId === alunoId)
      if (existente?.status === 'presente') return { ok: true } // já registrado: repetir é inofensivo
      if (existente) return { ok: false, erro: 'O professor já registrou sua situação nesta aula.' }

      gravarRegistro(aulaId, data, alunoId, 'presente', 'aluno')
      return { ok: true }
    },
    [aulas, alunos, chamadas, gravarRegistro],
  )

  const desfazerCheckin = useCallback(
    (aulaId: string, alunoId: string): ResultadoCheckin => {
      const data = hojeISO()
      const chamada = chamadas.find((c) => c.aulaId === aulaId && c.data === data)
      const registro = chamada?.registros.find((r) => r.alunoId === alunoId)
      if (!chamada || !registro) return { ok: false, erro: 'Não há check-in para desfazer.' }
      if (registro.origem !== 'aluno') return { ok: false, erro: 'Esse registro foi feito pelo professor.' }

      setChamadas((atual) =>
        atual.map((c) =>
          c.id === chamada.id ? { ...c, registros: c.registros.filter((r) => r.alunoId !== alunoId) } : c,
        ),
      )
      return { ok: true }
    },
    [chamadas],
  )

  const chamadaDe = useCallback(
    (aulaId: string, data: string) => chamadas.find((c) => c.aulaId === aulaId && c.data === data),
    [chamadas],
  )

  const valor = useMemo<Store>(
    () => ({
      alunos, planos, aulas, chamadas, transacoes,
      salvarAluno, removerAluno, salvarPlano, alternarPlano, salvarAula, removerAula,
      marcarPresenca, chamadaDe, fazerCheckin, desfazerCheckin, salvarTransacao, removerTransacao,
    }),
    [
      alunos, planos, aulas, chamadas, transacoes,
      salvarAluno, removerAluno, salvarPlano, alternarPlano, salvarAula, removerAula,
      marcarPresenca, chamadaDe, fazerCheckin, desfazerCheckin, salvarTransacao, removerTransacao,
    ],
  )

  return <StoreCtx.Provider value={valor}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore precisa estar dentro de <StoreProvider>')
  return ctx
}
