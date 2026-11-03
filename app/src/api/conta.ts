import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

/* Senha sem estar logado: pedir o link de recuperação e definir a senha pelo link
   (o mesmo link serve para o aluno convidado criar a primeira senha). */

/** A resposta é a mesma exista ou não a conta: a tela nunca diz se o e-mail é cliente. */
export function useEsqueciSenha() {
  return useMutation({ mutationFn: (email: string) => api.post('/auth/esqueci-senha', { email: email.trim() }) })
}

export function useRedefinirSenha() {
  return useMutation({
    mutationFn: (d: { token: string; senha: string }) => api.post('/auth/redefinir-senha', d),
  })
}
