import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select, Switch, Textarea } from '@/components/ui/Field'
import { useAuth } from '@/app/auth'
import { usePlanos } from '@/api/planos'
import { useTurmas } from '@/api/turmas'
import { useRemoverAluno, useSalvarAluno } from '@/api/alunos'
import { ErroApi, mensagemDeErro } from '@/lib/api'
import { FAIXAS, hojeISO } from '@/lib/format'
import type { Aluno, Faixa, StatusAluno } from '@/types'

const VAZIO: Aluno = {
  id: '',
  nome: '',
  email: '',
  telefone: '',
  nascimento: '',
  faixa: 'branca',
  graus: 0,
  status: 'experimental',
  matriculaEm: '',
  planoId: '',
  vencimentoDia: 10,
  statusPagamento: 'em_dia',
  frequencia30d: 0,
  turmaIds: [],
  usoImagemAutorizado: false,
  temAcesso: false,
}

type Campo = 'nome' | 'email' | 'telefone' | 'nascimento' | 'planoId' | 'turmaIds' | 'responsavel' | 'consentimento'
type Erros = Partial<Record<Campo, string>>

export function FormularioAluno({
  aberto,
  aluno,
  aoFechar,
}: {
  aberto: boolean
  aluno: Aluno | null
  aoFechar: () => void
}) {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const planos = usePlanos().data ?? []
  const turmas = useTurmas().data ?? []
  const salvar = useSalvarAluno()
  const remover = useRemoverAluno()

  const [dados, setDados] = useState<Aluno>(VAZIO)
  const [erros, setErros] = useState<Erros>({})
  const [erroGeral, setErroGeral] = useState('')
  const [temResponsavel, setTemResponsavel] = useState(false)
  const [consentimentoPor, setConsentimentoPor] = useState('')
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false)

  useEffect(() => {
    if (!aberto) return
    setDados(aluno ?? { ...VAZIO, matriculaEm: hojeISO() })
    setTemResponsavel(!!aluno?.responsavel)
    setConsentimentoPor('')
    setErros({})
    setErroGeral('')
    setConfirmandoRemocao(false)
  }, [aberto, aluno])

  const set = <K extends keyof Aluno,>(chave: K, valor: Aluno[K]) => setDados((d) => ({ ...d, [chave]: valor }))

  const alternarTurma = (id: string) =>
    setDados((d) => {
      const atuais = d.turmaIds
      return { ...d, turmaIds: atuais.includes(id) ? atuais.filter((t) => t !== id) : [...atuais, id] }
    })

  /** Validação mínima para avisar antes de enviar; a regra de verdade é a da API. */
  const validar = (): boolean => {
    const e: Erros = {}
    if (dados.nome.trim().length < 3) e.nome = 'Informe o nome completo do aluno.'
    if (dados.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email.trim())) e.email = 'Informe um e-mail válido.'
    if (dados.telefone && dados.telefone.replace(/\D/g, '').length < 10) e.telefone = 'Informe telefone com DDD.'
    if (temResponsavel && (!dados.responsavel?.nome.trim() || (dados.responsavel?.telefone ?? '').replace(/\D/g, '').length < 8))
      e.responsavel = 'Informe nome e telefone do responsável.'
    setErros(e)
    return Object.keys(e).length === 0
  }

  const submeter = () => {
    setErroGeral('')
    if (!validar()) return
    const aEnviar: Aluno = {
      ...dados,
      responsavel: temResponsavel ? (dados.responsavel ?? { nome: '', telefone: '' }) : undefined,
    }
    salvar.mutate(
      { aluno: aEnviar, consentimentoPor },
      {
        onSuccess: aoFechar,
        onError: (e) => {
          if (e instanceof ErroApi && e.campos) setErros(e.campos as Erros)
          setErroGeral(mensagemDeErro(e))
        },
      },
    )
  }

  const confirmarRemocao = () => {
    if (!aluno) return
    remover.mutate(aluno.id, {
      onSuccess: () => {
        aoFechar()
        navigate('/alunos')
      },
      onError: (e) => {
        setConfirmandoRemocao(false)
        setErroGeral(mensagemDeErro(e))
      },
    })
  }

  const ocupado = salvar.isPending || remover.isPending
  const podeRemover = !!aluno && usuario?.papel === 'gestor'

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={aluno ? 'Editar aluno' : 'Adicionar aluno'}
      descricao={
        aluno
          ? 'Atualize os dados cadastrais, o plano, as turmas e a situação do aluno.'
          : 'Preencha os dados básicos. Você pode completar o cadastro depois.'
      }
      rodape={
        <>
          {podeRemover &&
            (confirmandoRemocao ? (
              <Button variante="perigo" className="mr-auto" onClick={confirmarRemocao} disabled={ocupado}>
                {remover.isPending ? 'Removendo…' : 'Confirmar remoção'}
              </Button>
            ) : (
              <Button variante="perigo" className="mr-auto" onClick={() => setConfirmandoRemocao(true)} disabled={ocupado}>
                Remover cadastro
              </Button>
            ))}
          <Button variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button variante="primaria" onClick={submeter} disabled={ocupado}>
            {salvar.isPending ? 'Salvando…' : aluno ? 'Salvar alterações' : 'Cadastrar aluno'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submeter()
        }}
        className="space-y-6"
      >
        {confirmandoRemocao && (
          <p role="alert" className="rounded-md border border-rs-red-100 bg-rs-red-50 px-3 py-2 text-sm text-rs-red-700">
            Remover apaga o cadastro de vez. Só é possível para quem ainda não tem presenças, cobranças nem graduações; nos
            outros casos, marque o aluno como inativo.
          </p>
        )}

        <fieldset className="space-y-4">
          <legend className="rs-label mb-2">Dados pessoais</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nome completo"
              value={dados.nome}
              onChange={(e) => set('nome', e.target.value)}
              erro={erros.nome}
              wrapClass="sm:col-span-2"
              placeholder="Ex.: Maria Santos"
            />
            <Input
              label="E-mail"
              type="email"
              value={dados.email}
              onChange={(e) => set('email', e.target.value)}
              erro={erros.email}
              hint="Necessário para enviar o convite de acesso."
              placeholder="maria@email.com"
            />
            <Input
              label="Telefone"
              value={dados.telefone}
              onChange={(e) => set('telefone', e.target.value)}
              erro={erros.telefone}
              placeholder="(11) 99999-0000"
            />
            <Input
              label="Data de nascimento"
              type="date"
              max={hojeISO()}
              value={dados.nascimento}
              onChange={(e) => set('nascimento', e.target.value)}
              erro={erros.nascimento}
            />
            <Input
              label="Matriculado em"
              type="date"
              value={dados.matriculaEm}
              onChange={(e) => set('matriculaEm', e.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="rs-label mb-2">Graduação e situação</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Faixa" value={dados.faixa} onChange={(e) => set('faixa', e.target.value as Faixa)}>
              {Object.entries(FAIXAS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
            <Select label="Graus" value={dados.graus} onChange={(e) => set('graus', Number(e.target.value))}>
              {[0, 1, 2, 3, 4].map((g) => (
                <option key={g} value={g}>
                  {g === 0 ? 'Sem graus' : `${g}º grau${g > 1 ? 's' : ''}`}
                </option>
              ))}
            </Select>
            <Select label="Status" value={dados.status} onChange={(e) => set('status', e.target.value as StatusAluno)}>
              <option value="ativo">Ativo</option>
              <option value="experimental">Experimental</option>
              <option value="inativo">Inativo</option>
            </Select>
          </div>
          {aluno && (dados.faixa !== aluno.faixa || dados.graus !== aluno.graus) && (
            <p className="text-xs text-rs-gray-500">A mudança de faixa ou grau fica registrada no histórico de graduações.</p>
          )}
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="rs-label mb-2">Turmas</legend>
          {turmas.length === 0 ? (
            <p className="text-sm text-rs-gray-500">Nenhuma turma cadastrada.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {turmas
                .filter((t) => t.ativa || dados.turmaIds.includes(t.id))
                .map((t) => (
                  <label key={t.id} className="flex cursor-pointer items-center gap-2 text-sm text-rs-gray-700">
                    <input
                      type="checkbox"
                      checked={dados.turmaIds.includes(t.id)}
                      onChange={() => alternarTurma(t.id)}
                      className="size-4 cursor-pointer accent-rs-blue-600"
                    />
                    {t.nome}
                    <span className="text-xs text-rs-gray-500">· {t.faixaEtaria}</span>
                  </label>
                ))}
            </div>
          )}
          {erros.turmaIds && <p className="text-sm text-rs-red-700">{erros.turmaIds}</p>}
          <p className="text-xs text-rs-gray-500">O aluno só faz check-in e só aparece na lista de presença das turmas marcadas.</p>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="rs-label mb-2">Plano e cobrança</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Plano" value={dados.planoId} onChange={(e) => set('planoId', e.target.value)} erro={erros.planoId}>
              <option value="">Sem plano</option>
              {planos
                .filter((p) => p.ativo || p.id === dados.planoId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
            </Select>
            <Select
              label="Dia de vencimento"
              value={dados.vencimentoDia}
              onChange={(e) => set('vencimentoDia', Number(e.target.value))}
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Dia {d}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-rs-gray-500">A situação do pagamento é calculada pelas cobranças do Financeiro.</p>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="rs-label mb-2">Responsável</legend>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-rs-gray-700">
            <input
              type="checkbox"
              checked={temResponsavel}
              onChange={(e) => setTemResponsavel(e.target.checked)}
              className="size-4 cursor-pointer accent-rs-blue-600"
            />
            Aluno menor de idade com responsável
          </label>
          {temResponsavel && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nome do responsável"
                value={dados.responsavel?.nome ?? ''}
                onChange={(e) => set('responsavel', { nome: e.target.value, telefone: dados.responsavel?.telefone ?? '' })}
                erro={erros.responsavel}
              />
              <Input
                label="Telefone do responsável"
                value={dados.responsavel?.telefone ?? ''}
                onChange={(e) => set('responsavel', { nome: dados.responsavel?.nome ?? '', telefone: e.target.value })}
              />
            </div>
          )}
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="rs-label mb-2">Consentimento (LGPD)</legend>
          {dados.consentimento ? (
            <p className="text-sm text-rs-gray-700">
              Registrado por <span className="font-semibold">{dados.consentimento.por}</span> em{' '}
              {new Date(dados.consentimento.em).toLocaleDateString('pt-BR')}.
            </p>
          ) : (
            <Input
              label="Consentimento dado por"
              hint="Nome de quem autorizou o uso dos dados: o próprio aluno ou, se menor, o responsável. Deixe em branco se ainda não autorizou."
              value={consentimentoPor}
              onChange={(e) => setConsentimentoPor(e.target.value)}
              erro={erros.consentimento}
            />
          )}
          <Switch
            checked={dados.usoImagemAutorizado ?? false}
            onChange={(v) => set('usoImagemAutorizado', v)}
            label="Uso de imagem autorizado"
            descricao="Fotos e vídeos do aluno em divulgação da academia."
          />
        </fieldset>

        <Textarea
          label="Observações de treino"
          hint="Lesões, restrições ou pontos de atenção que o professor precisa lembrar."
          value={dados.observacoes ?? ''}
          onChange={(e) => set('observacoes', e.target.value)}
          placeholder="Ex.: recuperando lesão no ombro, evitar quedas por 30 dias."
        />

        {erroGeral && (
          <p role="alert" className="rounded-md border border-rs-red-100 bg-rs-red-50 px-3 py-2 text-sm font-medium text-rs-red-700">
            {erroGeral}
          </p>
        )}
      </form>
    </Modal>
  )
}
