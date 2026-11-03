import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useAuth } from '@/app/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Logo, LogoMark } from '@/components/Logo'
import { USUARIOS } from '@/data/mock'
import { ROTULO_PAPEL } from '@/app/auth'

export function Entrar() {
  const { usuario, entrar } = useAuth()
  const navigate = useNavigate()
  const local = useLocation() as { state?: { de?: string } }

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to="/painel" replace />

  const submeter = (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    // Latência simulada: a Fase 2 troca por uma chamada real de autenticação.
    setTimeout(() => {
      const r = entrar(email, senha)
      setEnviando(false)
      if (r.ok) navigate(local.state?.de ?? '/painel', { replace: true })
      else setErro(r.erro ?? 'Não foi possível entrar.')
    }, 450)
  }

  const preencher = (e: string) => {
    setEmail(e)
    setSenha('treino123')
    setErro('')
  }

  return (
    <div className="grid min-h-screen min-h-dvh grid-cols-[minmax(0,1fr)] lg:grid-cols-2">
      {/* Painel institucional — único lugar onde a geometria diagonal domina */}
      <div className="relative hidden overflow-hidden bg-rs-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice">
          <polygon points="380,0 600,0 600,340 240,900 0,900" fill="#1764a8" opacity="0.30" />
          <polygon points="520,0 600,0 600,220 300,900 140,900" fill="#d40000" opacity="0.22" />
          <polygon points="0,620 240,900 0,900" fill="#ffffff" opacity="0.04" />
        </svg>

        <div className="relative">
          <Logo tomEscuro />
        </div>

        <div className="relative max-w-lg">
          <h1 className="rs-title text-[3.25rem] leading-[0.95] text-white">
            Gestão que
            <br />
            fortalece o legado.
            <br />
            <span className="text-rs-red-500">Resultados que</span>
            <br />
            <span className="text-rs-red-500">transformam vidas.</span>
          </h1>
          <p className="mt-6 text-base leading-relaxed text-white/65">
            Alunos, aulas, presença e finanças da academia em um só lugar — para o professor passar mais
            tempo no tatame e menos na planilha.
          </p>
        </div>

        <dl className="relative grid grid-cols-3 gap-6 border-t border-white/12 pt-8">
          {[
            ['Centralize', 'Informações da academia'],
            ['Organize', 'Alunos, aulas e presença'],
            ['Acompanhe', 'Progresso e desenvolvimento'],
          ].map(([t, d]) => (
            <div key={t}>
              <dt className="rs-title text-sm tracking-wider text-white">{t}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-white/55">{d}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full min-w-0 max-w-sm">
          <div className="mb-8 lg:hidden">
            <LogoMark className="size-10 text-rs-red-600" />
          </div>

          <h2 className="rs-title text-3xl text-rs-ink">Entrar no sistema</h2>
          <p className="mt-1.5 text-sm text-rs-gray-500">
            Use o e-mail cadastrado na academia para acessar o painel.
          </p>

          <form onSubmit={submeter} className="mt-8 space-y-4" noValidate>
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="voce@redshield.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              iconeEsq={<Mail className="size-4" />}
              required
            />

            <div className="relative">
              <Input
                label="Senha"
                type={verSenha ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                iconeEsq={<Lock className="size-4" />}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-3 top-[34px] cursor-pointer text-rs-gray-500 hover:text-rs-ink"
              >
                {verSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {erro && (
              <p role="alert" className="rounded-md border border-rs-red-100 bg-rs-red-50 px-3 py-2.5 text-sm font-medium text-rs-red-700">
                {erro}
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-rs-gray-700">
                <input type="checkbox" defaultChecked className="size-4 cursor-pointer accent-rs-blue-600" />
                Manter conectado
              </label>
              <button type="button" className="cursor-pointer text-sm font-semibold text-rs-blue-600 hover:underline">
                Esqueci a senha
              </button>
            </div>

            <Button type="submit" variante="primaria" tamanho="lg" className="w-full" disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
              {!enviando && <ArrowRight className="size-4" />}
            </Button>
          </form>

          {/* Atalhos de demonstração — remover ao conectar o back-end real */}
          <div className="mt-8 rounded-md border border-rs-gray-200 bg-rs-gray-50 p-4">
            <p className="rs-label">Acessos de demonstração</p>
            <ul className="mt-2.5 space-y-1.5">
              {USUARIOS.map((u) => (
                <li key={u.id}>
                  <button
                    onClick={() => preencher(u.email)}
                    className="flex w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded px-2 py-2 text-left text-sm hover:bg-white"
                  >
                    <span className="min-w-0 truncate text-rs-gray-700">{u.email}</span>
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-rs-blue-600">
                      {ROTULO_PAPEL[u.papel]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 px-2 text-xs text-rs-gray-500">Senha para todos: treino123</p>
          </div>
        </div>
      </div>
    </div>
  )
}
