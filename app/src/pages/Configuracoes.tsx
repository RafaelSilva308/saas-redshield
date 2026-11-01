import { useState, type FormEvent } from 'react'
import { Building2, Palette, ShieldCheck, Users } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Switch } from '@/components/ui/Field'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Carregando, ErroCarga, PageHeader, Tabs } from '@/components/ui/Misc'
import { ROTULO_PAPEL, useAuth } from '@/app/auth'
import {
  useAcademia,
  useAlternarAviso,
  useAvisos,
  useSalvarAcademia,
  useTrocarSenha,
  type Academia,
  type TipoAviso,
} from '@/api/configuracoes'
import { ErroApi, mensagemDeErro } from '@/lib/api'
import { FAIXAS } from '@/lib/format'

type Aba = 'academia' | 'equipe' | 'notificacoes' | 'marca'

const FUSOS = [
  ['America/Sao_Paulo', 'Brasília (GMT-3)'],
  ['America/Manaus', 'Manaus (GMT-4)'],
  ['America/Cuiaba', 'Cuiabá (GMT-4)'],
  ['America/Rio_Branco', 'Rio Branco (GMT-5)'],
  ['America/Noronha', 'Fernando de Noronha (GMT-2)'],
] as const

const AVISOS: { tipo: TipoAviso; label: string; descricao: string }[] = [
  {
    tipo: 'vencimento',
    label: 'Lembrete de vencimento',
    descricao: 'Enviado alguns dias antes da data de pagamento do aluno.',
  },
  {
    tipo: 'inadimplencia',
    label: 'Aviso de mensalidade em atraso',
    descricao: 'Mensagem acolhedora convidando o aluno a regularizar.',
  },
  {
    tipo: 'ausencia',
    label: 'Convite para quem sumiu',
    descricao: 'Enviado a alunos sem presença registrada há 14 dias.',
  },
  { tipo: 'aniversario', label: 'Mensagem de aniversário', descricao: 'Um cumprimento simples da equipe da academia.' },
  {
    tipo: 'resumo_semanal',
    label: 'Resumo semanal para a equipe',
    descricao: 'Presença, novas matrículas e pendências da semana, toda segunda de manhã.',
  },
]

export function Configuracoes() {
  const { usuario } = useAuth()
  const ehGestor = usuario?.papel === 'gestor'
  const [aba, setAba] = useState<Aba>('academia')

  return (
    <>
      <PageHeader
        titulo="Configurações"
        subtitulo={
          ehGestor
            ? 'Dados da academia, equipe, avisos automáticos e identidade visual do sistema.'
            : 'Dados da academia e da sua conta.'
        }
      />

      {/* Só o gestor administra a academia; os outros papéis veem os dados e a própria conta. */}
      {ehGestor && (
        <div className="mb-4">
          <Tabs<Aba>
            valor={aba}
            aoMudar={setAba}
            itens={[
              { id: 'academia', label: 'Academia' },
              { id: 'equipe', label: 'Equipe e acessos' },
              { id: 'notificacoes', label: 'Avisos automáticos' },
              { id: 'marca', label: 'Identidade visual' },
            ]}
          />
        </div>
      )}

      {(aba === 'academia' || !ehGestor) && (
        <div className="grid gap-4 lg:grid-cols-3">
          <DadosAcademia podeEditar={ehGestor} />
          <SuaConta />
        </div>
      )}

      {ehGestor && aba === 'equipe' && <Equipe />}
      {ehGestor && aba === 'notificacoes' && <Avisos />}
      {ehGestor && aba === 'marca' && <Marca />}
    </>
  )
}

function DadosAcademia({ podeEditar }: { podeEditar: boolean }) {
  const consulta = useAcademia()
  const salvar = useSalvarAcademia()
  // Rascunho só existe enquanto o gestor edita; sem ele, o formulário mostra o que veio da API.
  const [rascunho, setRascunho] = useState<Academia | null>(null)
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null)
  const [erros, setErros] = useState<Record<string, string>>({})

  if (consulta.isError)
    return <ErroCarga mensagem={mensagemDeErro(consulta.error)} aoTentarDeNovo={() => consulta.refetch()} />
  if (consulta.isPending)
    return (
      <Card className="lg:col-span-2">
        <Carregando />
      </Card>
    )

  const dados = rascunho ?? consulta.data
  const set = <K extends keyof Academia>(k: K, v: Academia[K]) => setRascunho({ ...dados, [k]: v })

  const submeter = (e: FormEvent) => {
    e.preventDefault()
    if (!rascunho) return
    setAviso(null)
    setErros({})
    salvar.mutate(rascunho, {
      onSuccess: () => {
        setRascunho(null)
        setAviso({ tom: 'ok', texto: 'Dados da academia salvos.' })
      },
      onError: (err) => {
        if (err instanceof ErroApi && err.campos) setErros(err.campos)
        setAviso({ tom: 'erro', texto: mensagemDeErro(err) })
      },
    })
  }

  return (
    <Card className="lg:col-span-2">
      <form onSubmit={submeter}>
        <CardHeader titulo="Dados da academia" descricao="Aparecem nos e-mails enviados aos alunos" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nome da academia"
            value={dados.nome}
            onChange={(e) => set('nome', e.target.value)}
            disabled={!podeEditar}
            erro={erros.nome}
            wrapClass="sm:col-span-2"
          />
          <Input
            label="CNPJ"
            value={dados.cnpj ?? ''}
            onChange={(e) => set('cnpj', e.target.value)}
            disabled={!podeEditar}
            erro={erros.cnpj}
          />
          <Input
            label="Telefone"
            value={dados.telefone ?? ''}
            onChange={(e) => set('telefone', e.target.value)}
            disabled={!podeEditar}
            erro={erros.telefone}
          />
          <Input
            label="E-mail de contato"
            type="email"
            value={dados.email ?? ''}
            onChange={(e) => set('email', e.target.value)}
            disabled={!podeEditar}
            erro={erros.email}
          />
          <Select
            label="Fuso horário"
            hint="Define o “hoje” do check-in, da presença e dos avisos."
            value={dados.fuso}
            onChange={(e) => set('fuso', e.target.value)}
            disabled={!podeEditar}
            erro={erros.fuso}
          >
            {!FUSOS.some(([f]) => f === dados.fuso) && <option value={dados.fuso}>{dados.fuso}</option>}
            {FUSOS.map(([f, rotulo]) => (
              <option key={f} value={f}>
                {rotulo}
              </option>
            ))}
          </Select>
          <Input
            label="Endereço"
            value={dados.endereco ?? ''}
            onChange={(e) => set('endereco', e.target.value)}
            disabled={!podeEditar}
            erro={erros.endereco}
            wrapClass="sm:col-span-2"
          />
        </CardBody>
        {aviso && (
          <p
            role={aviso.tom === 'erro' ? 'alert' : 'status'}
            className={
              aviso.tom === 'erro'
                ? 'border-t border-rs-red-100 bg-rs-red-50 px-5 py-3 text-sm font-medium text-rs-red-700'
                : 'border-t border-rs-gray-200 px-5 py-3 text-sm text-rs-gray-700'
            }
          >
            {aviso.texto}
          </p>
        )}
        {podeEditar && (
          <footer className="flex justify-end gap-2 border-t border-rs-gray-200 bg-rs-gray-50 px-5 py-4">
            <Button type="button" variante="fantasma" disabled={!rascunho} onClick={() => setRascunho(null)}>
              Descartar
            </Button>
            <Button type="submit" variante="primaria" disabled={!rascunho || salvar.isPending}>
              {salvar.isPending ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </footer>
        )}
      </form>
    </Card>
  )
}

function SuaConta() {
  const { usuario } = useAuth()
  const trocar = useTrocarSenha()
  const [aberto, setAberto] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null)

  const submeter = (e: FormEvent) => {
    e.preventDefault()
    setAviso(null)
    if (novaSenha.length < 8) return setAviso({ tom: 'erro', texto: 'A nova senha precisa ter ao menos 8 caracteres.' })
    if (novaSenha !== confirmacao)
      return setAviso({ tom: 'erro', texto: 'A confirmação não confere com a nova senha.' })
    trocar.mutate(
      { senhaAtual, novaSenha },
      {
        onSuccess: () => {
          setAberto(false)
          setSenhaAtual('')
          setNovaSenha('')
          setConfirmacao('')
          setAviso({ tom: 'ok', texto: 'Senha alterada. As sessões em outros aparelhos foram encerradas.' })
        },
        onError: (err) => setAviso({ tom: 'erro', texto: mensagemDeErro(err) }),
      },
    )
  }

  return (
    <Card>
      <CardHeader titulo="Sua conta" descricao="Perfil usado nesta sessão" />
      <CardBody className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar nome={usuario?.nome ?? ''} tamanho="lg" />
          <div className="min-w-0">
            <p className="truncate font-bold text-rs-ink">{usuario?.nome}</p>
            <p className="truncate text-sm text-rs-gray-500">{usuario?.email}</p>
            <Badge tom="azul" className="mt-1.5">
              {usuario ? ROTULO_PAPEL[usuario.papel] : ''}
            </Badge>
          </div>
        </div>
        <div className="space-y-3 border-t border-rs-gray-200 pt-4">
          {aberto ? (
            <form onSubmit={submeter} className="space-y-3">
              <Input
                label="Senha atual"
                type="password"
                autoComplete="current-password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
              />
              <Input
                label="Nova senha"
                type="password"
                autoComplete="new-password"
                hint="Ao menos 8 caracteres."
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
              />
              <Input
                label="Confirme a nova senha"
                type="password"
                autoComplete="new-password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
              />
              <div className="flex gap-2">
                <Button type="submit" variante="secundaria" disabled={trocar.isPending || !senhaAtual}>
                  {trocar.isPending ? 'Salvando…' : 'Salvar senha'}
                </Button>
                <Button type="button" variante="fantasma" onClick={() => setAberto(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <Button variante="secundaria" className="w-full" onClick={() => setAberto(true)}>
              Alterar senha
            </Button>
          )}
          {aviso && (
            <p
              role={aviso.tom === 'erro' ? 'alert' : 'status'}
              className={aviso.tom === 'erro' ? 'text-sm font-medium text-rs-red-700' : 'text-sm text-rs-gray-700'}
            >
              {aviso.texto}
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

/* A API ainda não lista nem convida pessoas da equipe: contas de gestor e professor são criadas no servidor
   (`npm run nova-academia`). O convite de aluno fica na ficha do aluno. */
function Equipe() {
  return (
    <Card>
      <CardHeader titulo="Equipe e permissões" descricao="Cada papel enxerga apenas o que precisa para trabalhar" />
      <CardBody>
        <p className="mb-4 max-w-2xl text-sm text-rs-gray-700">
          Alunos ganham acesso pelo botão <strong>Convidar para o sistema</strong>, na ficha de cada aluno. Para incluir
          um novo professor ou gestor, fale com o suporte do sistema.
        </p>
        <h3 className="rs-title mb-3 flex items-center gap-2 text-base text-rs-ink">
          <ShieldCheck className="size-4 text-rs-blue-600" />O que cada papel enxerga
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              Icone: Building2,
              papel: 'Gestor',
              desc: 'Indicadores, inadimplência, ocupação de turmas, planos e financeiro completo.',
            },
            {
              Icone: Users,
              papel: 'Professor',
              desc: 'Alunos, agenda, presença e correções, acompanhamento e graduações.',
            },
            {
              Icone: Palette,
              papel: 'Aluno',
              desc: 'Check-in, agenda, a própria frequência e a própria faixa. Nada de outros alunos.',
            },
          ].map(({ Icone, papel, desc }) => (
            <div key={papel} className="rounded-md border border-rs-gray-200 bg-white p-4">
              <p className="flex items-center gap-2 font-bold text-rs-ink">
                <Icone className="size-4 text-rs-blue-600" />
                {papel}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-rs-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

function Avisos() {
  const consulta = useAvisos()
  const alternar = useAlternarAviso()
  const [erro, setErro] = useState('')

  if (consulta.isError)
    return <ErroCarga mensagem={mensagemDeErro(consulta.error)} aoTentarDeNovo={() => consulta.refetch()} />
  if (consulta.isPending) return <Carregando />

  const ativo = (tipo: TipoAviso) => consulta.data.find((a) => a.tipo === tipo)?.ativo ?? false

  return (
    <Card className="max-w-3xl">
      <CardHeader
        titulo="Avisos automáticos"
        descricao="E-mails que o sistema envia sozinho. Cada mudança vale na hora; todos começam desligados."
      />
      <CardBody className="divide-y divide-rs-gray-200">
        {AVISOS.map((a) => (
          <Switch
            key={a.tipo}
            checked={ativo(a.tipo)}
            onChange={(v) => {
              setErro('')
              alternar.mutate({ tipo: a.tipo, ativo: v }, { onError: (e) => setErro(mensagemDeErro(e)) })
            }}
            label={a.label}
            descricao={a.descricao}
          />
        ))}
      </CardBody>
      {erro && (
        <p
          role="alert"
          className="border-t border-rs-red-100 bg-rs-red-50 px-5 py-3 text-sm font-medium text-rs-red-700"
        >
          {erro}
        </p>
      )}
    </Card>
  )
}

function Marca() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader
          titulo="Paleta do sistema"
          descricao="Vermelho para ação, azul para estrutura, neutros para leitura"
        />
        <CardBody className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Vermelho', '#d40000', 'CTA e urgência'],
              ['Azul', '#1764a8', 'Navegação e confiança'],
              ['Branco', '#ffffff', 'Fundo e cartões'],
              ['Preto', '#111111', 'Títulos e números'],
            ].map(([nome, hex, uso]) => (
              <div key={nome}>
                <div className="h-20 rounded-md border border-rs-gray-200" style={{ background: hex }} />
                <p className="mt-2 text-sm font-bold text-rs-ink">{nome}</p>
                <p className="font-mono text-xs text-rs-gray-500">{hex}</p>
                <p className="mt-0.5 text-xs text-rs-gray-500">{uso}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Cinza claro', '#f2f4f6'],
              ['Cinza médio', '#667085'],
              ['Borda', '#e4e8ed'],
            ].map(([nome, hex]) => (
              <div key={nome}>
                <div className="h-12 rounded-md border border-rs-gray-200" style={{ background: hex }} />
                <p className="mt-1.5 text-xs font-semibold text-rs-ink">{nome}</p>
                <p className="font-mono text-[10px] text-rs-gray-500">{hex}</p>
              </div>
            ))}
          </div>
          <p className="rounded-md border border-rs-blue-100 bg-rs-blue-50 p-3 text-xs leading-relaxed text-rs-gray-700">
            Estes valores são <strong>provisórios</strong>, para prototipação. Se o REDSHIELD tiver identidade visual
            própria (logotipo, cores, tipografia), ela substitui esta paleta.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          titulo="Tipografia e faixas"
          descricao="Títulos condensados, corpo neutro, cores de faixa com legenda"
        />
        <CardBody className="space-y-6">
          <div>
            <p className="rs-label mb-2">Título principal</p>
            <p className="rs-title text-4xl text-rs-ink">Gestão que fortalece</p>
            <p className="rs-label mt-4 mb-1">Título secundário</p>
            <p className="rs-title text-xl text-rs-ink">Turmas e horários</p>
            <p className="rs-label mt-4 mb-1">Texto de apoio</p>
            <p className="max-w-md text-sm leading-relaxed text-rs-gray-700">
              Texto de parágrafo com boa legibilidade para leitura contínua em telas de escritório e celular.
            </p>
            <p className="rs-label mt-4 mb-1">Números e destaques</p>
            <p className="rs-metric text-rs-blue-600">12345</p>
          </div>

          <div className="border-t border-rs-gray-200 pt-4">
            <p className="rs-label mb-3">Cores de faixa</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(FAIXAS).map(([k, f]) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rs-gray-200 px-2.5 py-1 text-xs font-semibold"
                >
                  <span
                    aria-hidden
                    className="size-3 rounded-full border border-black/15"
                    style={{ background: f.cor }}
                  />
                  {f.label}
                </span>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
