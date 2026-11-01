import { QueryClient } from '@tanstack/react-query'
import { ErroApi } from '@/lib/api'

/* Cache das leituras da API (TanStack Query).
   Erro 4xx não se resolve tentando de novo (permissão, validação, não encontrado): falha na hora.
   Falha de rede ou 5xx: até 2 novas tentativas. */
export const clienteConsulta = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (tentativas, erro) => {
        if (erro instanceof ErroApi && erro.status >= 400 && erro.status < 500) return false
        return tentativas < 2
      },
    },
    mutations: { retry: false },
  },
})
