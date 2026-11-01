import { useState } from 'react'
import { FileDown, ShieldAlert } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { useAnonimizar, useExportarDados } from '@/api/lgpd'
import { mensagemDeErro } from '@/lib/api'

/* Direitos do titular (LGPD, art. 18), só para o gestor: cópia dos dados e anonimização.
   Anonimizar não tem volta: apaga os dados pessoais, encerra o acesso e cancela as cobranças em aberto.
   Valores pagos e a contagem de presenças continuam (obrigação fiscal e histórico sem identificação). */
export function DadosPessoais({ id, nome, anonimizado }: { id: string; nome: string; anonimizado: boolean }) {
  const exportar = useExportarDados()
  const anonimizar = useAnonimizar()
  const [confirmando, setConfirmando] = useState(false)
  const [palavra, setPalavra] = useState('')
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null)

  const baixar = () => {
    setAviso(null)
    exportar.mutate(
      { id, nome },
      {
        onSuccess: () =>
          setAviso({ tom: 'ok', texto: 'Arquivo com os dados do aluno baixado. A exportação fica registrada.' }),
        onError: (e) => setAviso({ tom: 'erro', texto: mensagemDeErro(e) }),
      },
    )
  }

  const confirmar = () => {
    setAviso(null)
    anonimizar.mutate(id, {
      onSuccess: () => {
        setConfirmando(false)
        setPalavra('')
        setAviso({ tom: 'ok', texto: 'Cadastro anonimizado.' })
      },
      onError: (e) => setAviso({ tom: 'erro', texto: mensagemDeErro(e) }),
    })
  }

  return (
    <Card className="mt-4">
      <CardHeader
        titulo="Dados pessoais (LGPD)"
        descricao="Pedidos do aluno ou do responsável: cópia dos dados e eliminação"
      />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variante="contorno" onClick={baixar} disabled={exportar.isPending}>
            <FileDown className="size-4" />
            {exportar.isPending ? 'Gerando…' : 'Baixar dados do aluno'}
          </Button>
          {!anonimizado && !confirmando && (
            <Button variante="perigo" onClick={() => setConfirmando(true)}>
              <ShieldAlert className="size-4" />
              Anonimizar cadastro
            </Button>
          )}
        </div>

        {confirmando && (
          <div className="space-y-3 rounded-md border border-rs-red-100 bg-rs-red-50 p-4">
            <p className="text-sm text-rs-red-700">
              <strong>Não tem volta.</strong> Nome, contatos, nascimento, responsável e observações são apagados; o
              acesso ao sistema é encerrado e as cobranças em aberto são canceladas. Ficam só os valores já pagos e a
              contagem de presenças, sem identificar o aluno. Baixe os dados antes, se o titular pediu uma cópia.
            </p>
            <Input
              label="Para confirmar, digite ANONIMIZAR"
              value={palavra}
              onChange={(e) => setPalavra(e.target.value)}
              autoComplete="off"
            />
            <div className="flex gap-2">
              <Button variante="perigo" onClick={confirmar} disabled={palavra !== 'ANONIMIZAR' || anonimizar.isPending}>
                {anonimizar.isPending ? 'Anonimizando…' : 'Anonimizar definitivamente'}
              </Button>
              <Button
                variante="fantasma"
                onClick={() => {
                  setConfirmando(false)
                  setPalavra('')
                }}
              >
                Voltar
              </Button>
            </div>
          </div>
        )}

        {aviso && (
          <p
            role={aviso.tom === 'erro' ? 'alert' : 'status'}
            className={aviso.tom === 'erro' ? 'text-sm font-medium text-rs-red-700' : 'text-sm text-rs-gray-700'}
          >
            {aviso.texto}
          </p>
        )}
      </CardBody>
    </Card>
  )
}
