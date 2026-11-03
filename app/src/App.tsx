import { Suspense, lazy } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/app/auth'
import { AppLayout, ExigePapel } from '@/components/layout/AppLayout'
import { Entrar } from '@/pages/Entrar'
import { RedefinirSenha } from '@/pages/RedefinirSenha'
import { NaoEncontrado, SemAcesso } from '@/pages/Erros'
import { LogoMark } from '@/components/Logo'

/* Cada página vira um chunk próprio: o celular baixa só a tela que abriu.
   As páginas com gráficos (Painel, Financeiro, Progresso) carregam o Recharts
   sob demanda, em vez de pesar no primeiro acesso. */
const Painel = lazy(() => import('@/pages/Painel').then((m) => ({ default: m.Painel })))
const Alunos = lazy(() => import('@/pages/Alunos').then((m) => ({ default: m.Alunos })))
const AlunoDetalhe = lazy(() => import('@/pages/AlunoDetalhe').then((m) => ({ default: m.AlunoDetalhe })))
const Agenda = lazy(() => import('@/pages/Agenda').then((m) => ({ default: m.Agenda })))
const Presenca = lazy(() => import('@/pages/Presenca').then((m) => ({ default: m.Presenca })))
const Planos = lazy(() => import('@/pages/Planos').then((m) => ({ default: m.Planos })))
const Financeiro = lazy(() => import('@/pages/Financeiro').then((m) => ({ default: m.Financeiro })))
const Checkin = lazy(() => import('@/pages/Checkin').then((m) => ({ default: m.Checkin })))
const Progresso = lazy(() => import('@/pages/Progresso').then((m) => ({ default: m.Progresso })))
const Configuracoes = lazy(() => import('@/pages/Configuracoes').then((m) => ({ default: m.Configuracoes })))

function Carregando() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <LogoMark className="size-10 animate-pulse text-rs-red-600" />
      <p className="text-sm text-rs-gray-500">Carregando…</p>
    </div>
  )
}

/* HashRouter: a API serve o front como arquivos estáticos, sem reescrever rotas profundas,
   e os links dos e-mails usam o formato #/rota (ex.: #/redefinir-senha?token=). */
export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Suspense fallback={<Carregando />}>
          <Routes>
            <Route path="/entrar" element={<Entrar />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />

            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/painel" replace />} />
              <Route path="/painel" element={<Painel />} />

              <Route
                path="/alunos"
                element={
                  <ExigePapel papeis={['gestor', 'professor']}>
                    <Alunos />
                  </ExigePapel>
                }
              />
              <Route
                path="/alunos/:id"
                element={
                  <ExigePapel papeis={['gestor', 'professor']}>
                    <AlunoDetalhe />
                  </ExigePapel>
                }
              />

              <Route path="/agenda" element={<Agenda />} />
              <Route
                path="/checkin"
                element={
                  <ExigePapel papeis={['aluno']}>
                    <Checkin />
                  </ExigePapel>
                }
              />

              <Route
                path="/presenca"
                element={
                  <ExigePapel papeis={['gestor', 'professor']}>
                    <Presenca />
                  </ExigePapel>
                }
              />
              <Route
                path="/planos"
                element={
                  <ExigePapel papeis={['gestor']}>
                    <Planos />
                  </ExigePapel>
                }
              />
              <Route
                path="/financeiro"
                element={
                  <ExigePapel papeis={['gestor']}>
                    <Financeiro />
                  </ExigePapel>
                }
              />

              <Route path="/progresso" element={<Progresso />} />
              <Route path="/configuracoes" element={<Configuracoes />} />

              <Route path="/sem-acesso" element={<SemAcesso />} />
              <Route path="*" element={<NaoEncontrado />} />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    </AuthProvider>
  )
}
