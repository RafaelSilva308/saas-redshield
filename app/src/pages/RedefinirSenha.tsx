import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { LogoMark } from '@/components/Logo'
import { useRedefinirSenha } from '@/api/conta'
import { mensagemDeErro } from '@/lib/api'

/* Aberta pelo link dos e-mails de convite e de recuperação: #/redefinir-senha?token=...
   Funciona sem login. Definir a senha encerra as sessões abertas da pessoa. */
export function RedefinirSenha() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const redefinir = useRedefinirSenha()
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')

  const submeter = (e: FormEvent) => {
    e.preventDefault()
    setErro('')
    if (senha.length < 8) return setErro('A senha precisa ter ao menos 8 caracteres.')
    if (senha !== confirmacao) return setErro('A confirmação não confere com a senha.')
    redefinir.mutate({ token, senha }, { onError: (err) => setErro(mensagemDeErro(err)) })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-rs-gray-50 px-6 py-12">
      <div className="w-full max-w-sm rounded-lg border border-rs-gray-200 bg-white p-8 shadow-[var(--shadow-card)]">
        <LogoMark className="size-10 text-rs-red-600" />

        {redefinir.isSuccess ? (
          <>
            <h1 className="rs-title mt-6 text-3xl text-rs-ink">Senha definida</h1>
            <p className="mt-1.5 text-sm text-rs-gray-500">Agora é só entrar com o seu e-mail e a nova senha.</p>
            <ButtonLink to="/entrar" variante="primaria" tamanho="lg" className="mt-8 w-full">
              Entrar
            </ButtonLink>
          </>
        ) : !token ? (
          <>
            <h1 className="rs-title mt-6 text-3xl text-rs-ink">Link incompleto</h1>
            <p className="mt-1.5 text-sm text-rs-gray-500">
              Abra o link exatamente como veio no e-mail, ou peça um novo em “Esqueci a senha”.
            </p>
            <Link to="/entrar" className="mt-8 inline-block text-sm font-semibold text-rs-blue-600 hover:underline">
              Voltar para a entrada
            </Link>
          </>
        ) : (
          <>
            <h1 className="rs-title mt-6 text-3xl text-rs-ink">Criar senha</h1>
            <p className="mt-1.5 text-sm text-rs-gray-500">Escolha a senha que você vai usar para entrar no sistema.</p>
            <form onSubmit={submeter} className="mt-8 space-y-4" noValidate>
              <Input
                label="Nova senha"
                type="password"
                autoComplete="new-password"
                hint="Ao menos 8 caracteres."
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                iconeEsq={<Lock className="size-4" />}
              />
              <Input
                label="Confirme a senha"
                type="password"
                autoComplete="new-password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                iconeEsq={<Lock className="size-4" />}
              />
              {erro && (
                <p
                  role="alert"
                  className="rounded-md border border-rs-red-100 bg-rs-red-50 px-3 py-2.5 text-sm font-medium text-rs-red-700"
                >
                  {erro}
                </p>
              )}
              <Button type="submit" variante="primaria" tamanho="lg" className="w-full" disabled={redefinir.isPending}>
                {redefinir.isPending ? 'Salvando…' : 'Salvar senha'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
