import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, Menu, Search, UserCog } from 'lucide-react'
import { ROTULO_PAPEL, useAuth } from '@/app/auth'
import { ALUNOS } from '@/data/mock'
import { inadimplentes } from '@/data/selectors'
import { Avatar } from '@/components/ui/Avatar'
import { FaixaBadge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

export function Topbar({ aoAbrirMenu }: { aoAbrirMenu: () => void }) {
  const { usuario, sair } = useAuth()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [menuAberto, setMenuAberto] = useState(false)
  const [notifAberta, setNotifAberta] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)

  const resultados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (q.length < 2) return []
    return ALUNOS.filter((a) => a.nome.toLowerCase().includes(q)).slice(0, 6)
  }, [busca])

  const pendencias = inadimplentes().length

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) {
        setMenuAberto(false)
        setNotifAberta(false)
      }
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [])

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-rs-blue-700/40 bg-rs-blue-600 px-4 sm:px-6">
      <button
        onClick={aoAbrirMenu}
        aria-label="Abrir menu"
        className="-ml-2 grid size-10 cursor-pointer place-items-center rounded-md text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {/* Busca de aluno */}
      <div className="relative min-w-0 flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/60" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar aluno"
          aria-label="Buscar aluno"
          className="h-10 w-full rounded-md border border-white/20 bg-white/10 pl-9 pr-3 text-sm text-white placeholder:text-white/55 focus:border-white/40 focus:bg-white/15 focus:outline-none"
        />
        {resultados.length > 0 && (
          <ul className="absolute left-0 right-0 top-11 z-30 overflow-hidden rounded-md border border-rs-gray-200 bg-white py-1 shadow-[var(--shadow-pop)]">
            {resultados.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/alunos/${a.id}`}
                  onClick={() => setBusca('')}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-rs-gray-50"
                >
                  <Avatar nome={a.nome} tamanho="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-rs-ink">{a.nome}</span>
                    <FaixaBadge faixa={a.faixa} compacto />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div ref={wrapper} className="ml-auto flex items-center gap-1">
        {/* Notificações */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifAberta((v) => !v)
              setMenuAberto(false)
            }}
            aria-label={`Notificações: ${pendencias} pendências`}
            className="relative grid size-10 cursor-pointer place-items-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
          >
            <Bell className="size-5" />
            {pendencias > 0 && (
              <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-rs-red-500 px-1 text-[10px] font-bold leading-4 text-white">
                {pendencias}
              </span>
            )}
          </button>

          {notifAberta && (
            <div className="absolute right-0 top-12 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-rs-gray-200 bg-white shadow-[var(--shadow-pop)]">
              <p className="rs-label border-b border-rs-gray-200 px-4 py-3">Pendências</p>
              <ul className="max-h-72 divide-y divide-rs-gray-200 overflow-y-auto">
                {inadimplentes().slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <Link
                      to={`/alunos/${a.id}`}
                      onClick={() => setNotifAberta(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-rs-gray-50"
                    >
                      <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-rs-red-600" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-rs-ink">{a.nome}</span>
                        <span className="block text-xs text-rs-gray-500">
                          Mensalidade em aberto — vencimento dia {a.vencimentoDia}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                to="/financeiro"
                onClick={() => setNotifAberta(false)}
                className="block border-t border-rs-gray-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-rs-blue-600 hover:bg-rs-gray-50"
              >
                Ver financeiro
              </Link>
            </div>
          )}
        </div>

        {/* Conta */}
        <div className="relative">
          <button
            onClick={() => {
              setMenuAberto((v) => !v)
              setNotifAberta(false)
            }}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-white/90 hover:bg-white/10"
          >
            <Avatar nome={usuario?.nome ?? '?'} tamanho="sm" className="border-white/30 bg-white/15 text-white" />
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-semibold">{usuario?.nome.split(' ')[0]}</span>
              <span className="block text-[10px] uppercase tracking-wider text-white/60">
                {usuario ? ROTULO_PAPEL[usuario.papel] : ''}
              </span>
            </span>
            <ChevronDown className={cn('size-4 transition-transform', menuAberto && 'rotate-180')} />
          </button>

          {menuAberto && (
            <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-md border border-rs-gray-200 bg-white py-1 shadow-[var(--shadow-pop)]">
              <div className="border-b border-rs-gray-200 px-4 py-3">
                <p className="truncate text-sm font-semibold text-rs-ink">{usuario?.nome}</p>
                <p className="truncate text-xs text-rs-gray-500">{usuario?.email}</p>
              </div>
              <Link
                to="/configuracoes"
                onClick={() => setMenuAberto(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-rs-gray-700 hover:bg-rs-gray-50"
              >
                <UserCog className="size-4" /> Configurações
              </Link>
              <button
                onClick={() => {
                  sair()
                  navigate('/entrar')
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm text-rs-red-600 hover:bg-rs-red-50"
              >
                <LogOut className="size-4" /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
