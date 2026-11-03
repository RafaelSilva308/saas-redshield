import { NavLink } from 'react-router-dom'
import {
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  Settings,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/app/auth'
import type { Papel } from '@/types'

interface Item {
  para: string
  rotulo: string
  Icone: typeof LayoutDashboard
  papeis: Papel[]
}

const ITENS: Item[] = [
  { para: '/painel', rotulo: 'Painel', Icone: LayoutDashboard, papeis: ['gestor', 'professor', 'aluno'] },
  { para: '/checkin', rotulo: 'Check-in', Icone: CalendarCheck, papeis: ['aluno'] },
  { para: '/alunos', rotulo: 'Alunos', Icone: Users, papeis: ['gestor', 'professor'] },
  { para: '/agenda', rotulo: 'Agenda', Icone: CalendarDays, papeis: ['gestor', 'professor', 'aluno'] },
  { para: '/presenca', rotulo: 'Presença', Icone: ClipboardCheck, papeis: ['gestor', 'professor'] },
  { para: '/planos', rotulo: 'Planos', Icone: CreditCard, papeis: ['gestor'] },
  { para: '/financeiro', rotulo: 'Financeiro', Icone: Wallet, papeis: ['gestor'] },
  { para: '/progresso', rotulo: 'Progresso', Icone: TrendingUp, papeis: ['gestor', 'professor', 'aluno'] },
]

export function Sidebar({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const { usuario } = useAuth()
  const visiveis = ITENS.filter((i) => usuario && i.papeis.includes(usuario.papel))

  const link = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold lg:py-2.5 transition-colors',
      isActive ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/8 hover:text-white',
    )

  const conteudo = (
    <>
      <div className="flex h-16 items-center justify-between px-5">
        <Logo tomEscuro />
        <button
          onClick={aoFechar}
          aria-label="Fechar menu"
          className="-mr-2 grid size-10 cursor-pointer place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X className="size-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visiveis.map(({ para, rotulo, Icone }) => (
          <NavLink key={para} to={para} className={link} onClick={aoFechar}>
            {({ isActive }) => (
              <>
                {/* item ativo recebe realce vermelho na borda esquerda */}
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-rs-red-500 transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <Icone className="size-[18px] shrink-0" strokeWidth={1.9} />
                <span className="truncate">{rotulo}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        <NavLink to="/configuracoes" className={link} onClick={aoFechar}>
          <Settings className="size-[18px] shrink-0" strokeWidth={1.9} />
          <span>Configurações</span>
        </NavLink>
      </div>
    </>
  )

  return (
    <>
      {/* overlay mobile */}
      {aberta && <div className="fixed inset-0 z-30 bg-rs-ink/45 lg:hidden" onClick={aoFechar} aria-hidden />}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 max-w-[85vw] flex-col bg-rs-blue-600 pb-[env(safe-area-inset-bottom)] lg:max-w-none transition-transform duration-200 lg:translate-x-0',
          aberta ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {conteudo}
      </aside>
    </>
  )
}
