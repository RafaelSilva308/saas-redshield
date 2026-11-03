import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ErroApi, mensagemDeErro, quandoPerderSessao } from '@/lib/api'
import { Carregando, ErroCarga } from '@/components/ui/Misc'
import type { Papel, Usuario } from '@/types'

/* Sessão real: POST /auth/login grava o cookie httpOnly `rs.sid`; GET /auth/eu diz quem está logado.
   O front não guarda token nem usuário no navegador. A autorização de verdade é da API;
   `podeVer` só decide navegação. */

const CHAVE_EU = ['auth', 'eu'] as const
/** Chave do login simulado do protótipo. Apagada para não deixar usuário antigo no navegador. */
const CHAVE_ANTIGA = 'redshield.sessao'

interface Ctx {
  usuario: Usuario | null
  entrar: (email: string, senha: string) => Promise<{ ok: boolean; erro?: string }>
  sair: () => Promise<void>
  podeVer: (papeis: Papel[]) => boolean
}

const AuthCtx = createContext<Ctx | null>(null)

async function buscarEu(): Promise<Usuario | null> {
  try {
    const { usuario } = await api.get<{ usuario: Usuario }>('/auth/eu')
    return usuario
  } catch (e) {
    if (e instanceof ErroApi && e.status === 401) return null
    throw e
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const cliente = useQueryClient()
  const eu = useQuery({ queryKey: CHAVE_EU, queryFn: buscarEu, staleTime: Infinity, retry: false })
  const usuario = eu.data ?? null

  /** Troca de usuário: nada do cache do anterior pode aparecer para o próximo. */
  const definirUsuario = useCallback(
    (u: Usuario | null) => {
      cliente.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' })
      cliente.setQueryData(CHAVE_EU, u)
    },
    [cliente],
  )

  useEffect(() => {
    try {
      localStorage.removeItem(CHAVE_ANTIGA)
    } catch {
      /* ambiente sem storage */
    }
  }, [])

  // Sessão expirada ou encerrada em outro aparelho: qualquer 401 devolve para a tela de entrada.
  useEffect(() => quandoPerderSessao(() => definirUsuario(null)), [definirUsuario])

  const entrar = useCallback(
    async (email: string, senha: string) => {
      try {
        const { usuario: u } = await api.post<{ usuario: Usuario }>('/auth/login', { email: email.trim(), senha })
        definirUsuario(u)
        return { ok: true }
      } catch (e) {
        return { ok: false, erro: mensagemDeErro(e) }
      }
    },
    [definirUsuario],
  )

  const sair = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      /* sem conexão: sai daqui mesmo assim; a sessão no servidor expira sozinha */
    }
    definirUsuario(null)
  }, [definirUsuario])

  const podeVer = useCallback((papeis: Papel[]) => !!usuario && papeis.includes(usuario.papel), [usuario])

  const valor = useMemo(() => ({ usuario, entrar, sair, podeVer }), [usuario, entrar, sair, podeVer])

  if (eu.isPending) return <Carregando texto="Conferindo sua sessão…" />
  if (eu.isError) return <ErroCarga mensagem={mensagemDeErro(eu.error)} aoTentarDeNovo={() => eu.refetch()} />

  return <AuthCtx.Provider value={valor}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}

export const ROTULO_PAPEL: Record<Papel, string> = {
  gestor: 'Gestor',
  professor: 'Professor',
  aluno: 'Aluno',
}
