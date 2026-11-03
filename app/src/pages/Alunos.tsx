import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, Pencil, Search, SlidersHorizontal, UserPlus, Users } from 'lucide-react'
import { PageHeader, EmptyState, Tabs } from '@/components/ui/Misc'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { Badge, FaixaBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { useStore } from '@/app/store'
import { FormularioAluno } from './alunos/FormularioAluno'
import { FAIXAS, STATUS_ALUNO, STATUS_PAGAMENTO, dataCurta, idade } from '@/lib/format'
import type { Aluno, Faixa, StatusAluno } from '@/types'
import { cn } from '@/lib/cn'

type Aba = 'todos' | StatusAluno | 'inadimplentes'

export function Alunos() {
  const { alunos, planos } = useStore()
  const [params, setParams] = useSearchParams()

  const [aba, setAba] = useState<Aba>('todos')
  const [busca, setBusca] = useState('')
  const [faixa, setFaixa] = useState<'todas' | Faixa>('todas')
  const [plano, setPlano] = useState('todos')
  const [ordem, setOrdem] = useState<'nome' | 'frequencia' | 'matricula'>('nome')
  const [emEdicao, setEmEdicao] = useState<Aluno | null>(null)
  const [formAberto, setFormAberto] = useState(false)

  // ?novo=1 abre o formulário direto (usado pelos atalhos do painel)
  useEffect(() => {
    if (params.get('novo') === '1') {
      setEmEdicao(null)
      setFormAberto(true)
      params.delete('novo')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    let lista = alunos.filter((a) => {
      if (q && !a.nome.toLowerCase().includes(q) && !a.email.toLowerCase().includes(q)) return false
      if (faixa !== 'todas' && a.faixa !== faixa) return false
      if (plano !== 'todos' && a.planoId !== plano) return false
      if (aba === 'inadimplentes') return a.statusPagamento === 'atrasado'
      if (aba !== 'todos') return a.status === aba
      return true
    })
    lista = [...lista].sort((a, b) => {
      if (ordem === 'frequencia') return b.frequencia30d - a.frequencia30d
      if (ordem === 'matricula') return b.matriculaEm.localeCompare(a.matriculaEm)
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
    return lista
  }, [alunos, busca, faixa, plano, aba, ordem])

  const contagem = (a: Aba) =>
    a === 'todos'
      ? alunos.length
      : a === 'inadimplentes'
        ? alunos.filter((x) => x.statusPagamento === 'atrasado').length
        : alunos.filter((x) => x.status === a).length

  const exportarCsv = () => {
    const linhas = [
      ['Nome', 'E-mail', 'Telefone', 'Faixa', 'Status', 'Plano', 'Vencimento', 'Pagamento', 'Frequência 30d'],
      ...filtrados.map((a) => [
        a.nome,
        a.email,
        a.telefone,
        FAIXAS[a.faixa].label,
        STATUS_ALUNO[a.status].label,
        planos.find((p) => p.id === a.planoId)?.nome ?? '',
        `dia ${a.vencimentoDia}`,
        STATUS_PAGAMENTO[a.statusPagamento].label,
        `${a.frequencia30d}%`,
      ]),
    ]
    const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `alunos-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        titulo="Alunos"
        subtitulo="Cadastro, situação de pagamento e frequência de cada aluno da academia."
        acoes={
          <>
            <Button variante="contorno" onClick={exportarCsv}>
              <Download className="size-4" />
              Exportar
            </Button>
            <Button
              variante="primaria"
              onClick={() => {
                setEmEdicao(null)
                setFormAberto(true)
              }}
            >
              <UserPlus className="size-4" />
              Adicionar aluno
            </Button>
          </>
        }
      />

      <Card>
        <div className="px-2 pt-1">
          <Tabs<Aba>
            valor={aba}
            aoMudar={setAba}
            itens={[
              { id: 'todos', label: 'Todos', contagem: contagem('todos') },
              { id: 'ativo', label: 'Ativos', contagem: contagem('ativo') },
              { id: 'experimental', label: 'Experimentais', contagem: contagem('experimental') },
              { id: 'inativo', label: 'Inativos', contagem: contagem('inativo') },
              { id: 'inadimplentes', label: 'Em aberto', contagem: contagem('inadimplentes') },
            ]}
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-3 border-b border-rs-gray-200 bg-rs-gray-50 px-4 py-4 sm:px-5">
          <Input
            placeholder="Buscar por nome ou e-mail"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            iconeEsq={<Search className="size-4" />}
            wrapClass="w-full sm:min-w-[220px] sm:w-auto sm:flex-1"
            aria-label="Buscar aluno"
          />
          <Select
            value={faixa}
            onChange={(e) => setFaixa(e.target.value as typeof faixa)}
            wrapClass="w-[calc(50%-0.375rem)] sm:w-44"
            aria-label="Filtrar por faixa"
          >
            <option value="todas">Todas as faixas</option>
            {Object.entries(FAIXAS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
          <Select
            value={plano}
            onChange={(e) => setPlano(e.target.value)}
            wrapClass="w-[calc(50%-0.375rem)] sm:w-44"
            aria-label="Filtrar por plano"
          >
            <option value="todos">Todos os planos</option>
            {planos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
          <Select
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as typeof ordem)}
            wrapClass="w-full sm:w-44"
            aria-label="Ordenar por"
          >
            <option value="nome">Ordem alfabética</option>
            <option value="frequencia">Maior frequência</option>
            <option value="matricula">Matrícula recente</option>
          </Select>
          <span className="flex items-center gap-1.5 text-sm text-rs-gray-500 sm:ml-auto sm:pb-2.5">
            <SlidersHorizontal className="size-4" />
            {filtrados.length} de {alunos.length}
          </span>
        </div>

        {filtrados.length === 0 ? (
          <EmptyState
            icone={<Users className="size-6" />}
            titulo="Nenhum aluno encontrado"
            mensagem="Ajuste os filtros ou cadastre um novo aluno para começar."
            acao={
              <Button variante="secundaria" onClick={() => setFormAberto(true)}>
                <UserPlus className="size-4" />
                Adicionar aluno
              </Button>
            }
          />
        ) : (
          <>
          {/* Celular e tablet: um cartão por aluno, sem rolagem lateral */}
          <ul className="divide-y divide-rs-gray-200 lg:hidden">
            {filtrados.map((a) => {
              const p = planos.find((x) => x.id === a.planoId)
              const pag = STATUS_PAGAMENTO[a.statusPagamento]
              return (
                <li key={a.id}>
                  <Link
                    to={`/alunos/${a.id}`}
                    className="flex gap-3 px-4 py-3.5 transition-colors active:bg-rs-gray-100 sm:px-5"
                  >
                    <Avatar nome={a.nome} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-rs-ink">{a.nome}</span>
                          <span className="block truncate text-xs text-rs-gray-500">
                            {a.nascimento && `${idade(a.nascimento)} anos · `}desde {dataCurta(a.matriculaEm)}
                          </span>
                        </span>
                        <Badge tom={pag.tom}>{pag.label}</Badge>
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-rs-gray-700">
                        <FaixaBadge faixa={a.faixa} graus={a.graus} compacto />
                        <span>
                          {p?.nome ?? 'Sem plano'} · dia {a.vencimentoDia}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-10 overflow-hidden rounded-full bg-rs-gray-200">
                            <span
                              className={cn(
                                'block h-full rounded-full',
                                a.frequencia30d >= 70 ? 'bg-rs-success' : a.frequencia30d >= 40 ? 'bg-rs-warn' : 'bg-rs-red-600',
                              )}
                              style={{ width: `${a.frequencia30d}%` }}
                            />
                          </span>
                          <span className="font-semibold text-rs-ink">{a.frequencia30d}%</span>
                          <span className="text-rs-gray-500">em 30d</span>
                        </span>
                        {a.status !== 'ativo' && <Badge tom={STATUS_ALUNO[a.status].tom}>{STATUS_ALUNO[a.status].label}</Badge>}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-rs-gray-200 bg-white">
                  {['Aluno', 'Faixa', 'Plano', 'Vencimento', 'Pagamento', 'Frequência', 'Situação', ''].map((h) => (
                    <th key={h} className="rs-label px-5 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rs-gray-200">
                {filtrados.map((a) => {
                  const p = planos.find((x) => x.id === a.planoId)
                  const pag = STATUS_PAGAMENTO[a.statusPagamento]
                  return (
                    <tr key={a.id} className="group transition-colors hover:bg-rs-gray-50">
                      <td className="px-5 py-3">
                        <Link to={`/alunos/${a.id}`} className="flex items-center gap-3">
                          <Avatar nome={a.nome} />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-rs-ink group-hover:text-rs-blue-600">
                              {a.nome}
                            </span>
                            <span className="block truncate text-xs text-rs-gray-500">
                              {idade(a.nascimento)} anos · desde {dataCurta(a.matriculaEm)}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <FaixaBadge faixa={a.faixa} graus={a.graus} compacto />
                      </td>
                      <td className="px-5 py-3 text-sm text-rs-gray-700">{p?.nome ?? '—'}</td>
                      <td className="px-5 py-3 text-sm text-rs-gray-700">Dia {a.vencimentoDia}</td>
                      <td className="px-5 py-3">
                        <Badge tom={pag.tom}>{pag.label}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-rs-gray-200">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                a.frequencia30d >= 70 ? 'bg-rs-success' : a.frequencia30d >= 40 ? 'bg-rs-warn' : 'bg-rs-red-600',
                              )}
                              style={{ width: `${a.frequencia30d}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-rs-ink">{a.frequencia30d}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tom={STATUS_ALUNO[a.status].tom}>{STATUS_ALUNO[a.status].label}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => {
                            setEmEdicao(a)
                            setFormAberto(true)
                          }}
                          aria-label={`Editar ${a.nome}`}
                          className="cursor-pointer rounded-md p-2 text-rs-gray-500 opacity-0 transition-opacity hover:bg-rs-gray-100 hover:text-rs-ink focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                        >
                          <Pencil className="size-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>

      <FormularioAluno
        aberto={formAberto}
        aluno={emEdicao}
        aoFechar={() => {
          setFormAberto(false)
          setEmEdicao(null)
        }}
      />
    </>
  )
}
