/* Cliente HTTP da API (`/api/v1`).
   - Mesma origem: em produção a API serve o front; em desenvolvimento o Vite repassa `/api` (vite.config.ts).
   - A sessão é o cookie httpOnly `rs.sid`: o front nunca lê nem guarda token.
   - Toda resposta de erro vira `ErroApi`, com a mensagem pronta para mostrar ao usuário. */

const BASE = '/api/v1'

export class ErroApi extends Error {
  readonly status: number
  readonly codigo: string
  readonly campos?: Record<string, string>

  constructor(status: number, codigo: string, mensagem: string, campos?: Record<string, string>) {
    super(mensagem)
    this.name = 'ErroApi'
    this.status = status
    this.codigo = codigo
    this.campos = campos
  }
}

/** Avisados quando a API responde 401 (sessão expirada ou encerrada em outro lugar). */
const aoPerderSessao = new Set<() => void>()

export function quandoPerderSessao(fn: () => void) {
  aoPerderSessao.add(fn)
  return () => {
    aoPerderSessao.delete(fn)
  }
}

type Metodo = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

async function requisitar<T>(metodo: Metodo, caminho: string, corpo?: unknown): Promise<T> {
  let resp: Response
  try {
    resp = await fetch(BASE + caminho, {
      method: metodo,
      credentials: 'same-origin',
      headers: corpo === undefined ? { accept: 'application/json' } : { accept: 'application/json', 'content-type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    })
  } catch {
    throw new ErroApi(0, 'sem_conexao', 'Sem conexão com o servidor. Verifique a internet e tente de novo.')
  }

  if (resp.status === 204) return undefined as T

  const dados: unknown = await resp.json().catch(() => null)

  if (!resp.ok) {
    if (resp.status === 401) aoPerderSessao.forEach((fn) => fn())
    const erro = (dados as { erro?: { codigo?: string; mensagem?: string; campos?: Record<string, string> } } | null)?.erro
    throw new ErroApi(
      resp.status,
      erro?.codigo ?? 'erro_desconhecido',
      erro?.mensagem ?? 'Algo deu errado. Tente de novo em instantes.',
      erro?.campos,
    )
  }

  return dados as T
}

export const api = {
  get: <T>(caminho: string) => requisitar<T>('GET', caminho),
  post: <T>(caminho: string, corpo?: unknown) => requisitar<T>('POST', caminho, corpo ?? {}),
  patch: <T>(caminho: string, corpo: unknown) => requisitar<T>('PATCH', caminho, corpo),
  put: <T>(caminho: string, corpo: unknown) => requisitar<T>('PUT', caminho, corpo),
  delete: <T = void>(caminho: string) => requisitar<T>('DELETE', caminho),
}

/** Mensagem para a tela a partir de qualquer erro (de API ou inesperado). */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroApi) return erro.message
  return 'Algo deu errado. Tente de novo em instantes.'
}
