import { useState } from 'react'
import { Download, FileUp } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Badge } from '@/components/ui/Badge'
import { useImportarAlunos, type ResultadoImportacao } from '@/api/lgpd'
import { lerArquivoTexto } from '@/lib/arquivo'
import { mensagemDeErro } from '@/lib/api'

/* Importação de alunos da planilha atual (fase 9). Primeiro SIMULA (nada é gravado) e mostra o que entra
   e o que fica de fora; só depois o gestor confirma. Duplicados (mesmo e-mail, ou nome + nascimento) ficam de fora. */

const MODELO = [
  'nome;email;telefone;nascimento;faixa;graus;status;matricula;plano;vencimento;responsavel;telefone_do_responsavel;observacoes',
  'Maria Santos;maria@email.com;(11) 99999-0000;15/03/1990;azul;2;ativo;10/01/2024;Integral;10;;;',
  'Pedro Lima;;(11) 98888-0000;02/07/2015;cinza;1;ativo;05/02/2025;Kids;5;Ana Lima;(11) 97777-0000;Asma: trazer bombinha',
].join('\n')

const ROTULO_COLUNA: Record<string, string> = {
  nome: 'Nome',
  email: 'E-mail',
  telefone: 'Telefone',
  nascimento: 'Nascimento',
  faixa: 'Faixa',
  graus: 'Graus',
  status: 'Status',
  matricula: 'Matrícula',
  plano: 'Plano',
  vencimentoDia: 'Vencimento',
  responsavelNome: 'Responsável',
  responsavelTelefone: 'Telefone do responsável',
  observacoes: 'Observações',
}

export function ImportarAlunos({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const importar = useImportarAlunos()
  const [arquivo, setArquivo] = useState<{ nome: string; csv: string } | null>(null)
  const [consentimentoPor, setConsentimentoPor] = useState('')
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null)
  const [erro, setErro] = useState('')

  const fechar = () => {
    setArquivo(null)
    setConsentimentoPor('')
    setResultado(null)
    setErro('')
    importar.reset()
    aoFechar()
  }

  const escolher = async (f: File | undefined) => {
    setResultado(null)
    setErro('')
    if (!f) return setArquivo(null)
    if (f.size > 1_500_000) return setErro('Arquivo grande demais. Divida a planilha em partes de até mil alunos.')
    setArquivo({ nome: f.name, csv: await lerArquivoTexto(f) })
  }

  const enviar = (simular: boolean) => {
    if (!arquivo) return
    setErro('')
    importar.mutate(
      { csv: arquivo.csv, simular, consentimentoPor },
      { onSuccess: setResultado, onError: (e) => setErro(mensagemDeErro(e)) },
    )
  }

  const baixarModelo = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + MODELO], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'modelo-importacao-alunos.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const concluido = resultado && !resultado.simulacao
  const podeConfirmar = resultado?.simulacao && resultado.totais.validas > 0

  return (
    <Modal
      aberto={aberto}
      aoFechar={fechar}
      titulo="Importar alunos"
      descricao="Traga os alunos da planilha atual. Primeiro o sistema confere o arquivo sem gravar nada; você revisa e confirma."
      largura="lg"
      rodape={
        concluido ? (
          <Button variante="primaria" onClick={fechar}>
            Concluir
          </Button>
        ) : (
          <>
            <Button variante="fantasma" onClick={fechar}>
              Cancelar
            </Button>
            {podeConfirmar ? (
              <Button variante="primaria" onClick={() => enviar(false)} disabled={importar.isPending}>
                {importar.isPending
                  ? 'Importando…'
                  : `Importar ${resultado.totais.validas} aluno${resultado.totais.validas > 1 ? 's' : ''}`}
              </Button>
            ) : (
              <Button variante="primaria" onClick={() => enviar(true)} disabled={!arquivo || importar.isPending}>
                {importar.isPending ? 'Conferindo…' : 'Conferir arquivo'}
              </Button>
            )}
          </>
        )
      }
    >
      <div className="space-y-5">
        {!concluido && (
          <>
            <div className="rounded-md border border-rs-gray-200 bg-rs-gray-50 p-4 text-sm text-rs-gray-700">
              <p>
                Salve a planilha como <strong>CSV</strong> (separado por vírgula ou ponto e vírgula), com a primeira
                linha de títulos. Só a coluna <strong>nome</strong> é obrigatória. Datas no formato dd/mm/aaaa; o plano
                deve ter o mesmo nome de um plano cadastrado.
              </p>
              <Button variante="fantasma" tamanho="sm" className="mt-2" onClick={baixarModelo}>
                <Download className="size-4" />
                Baixar modelo
              </Button>
            </div>

            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-rs-gray-300 px-4 py-6 text-center hover:border-rs-blue-300 hover:bg-rs-blue-50">
              <FileUp className="size-6 text-rs-blue-600" />
              <span className="text-sm font-semibold text-rs-ink">
                {arquivo ? arquivo.nome : 'Escolher arquivo CSV'}
              </span>
              <span className="text-xs text-rs-gray-500">Até mil alunos por arquivo</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => escolher(e.target.files?.[0])}
                aria-label="Arquivo CSV de alunos"
              />
            </label>

            <Input
              label="Consentimento dado por (opcional)"
              hint="Ex.: “Ficha de matrícula assinada”. Sem isso, os alunos entram sem consentimento LGPD registrado e você registra depois, aluno por aluno."
              value={consentimentoPor}
              onChange={(e) => {
                setConsentimentoPor(e.target.value)
                setResultado(null)
              }}
            />
          </>
        )}

        {erro && (
          <p
            role="alert"
            className="rounded-md border border-rs-red-100 bg-rs-red-50 px-3 py-2 text-sm font-medium text-rs-red-700"
          >
            {erro}
          </p>
        )}

        {resultado && (
          <div role="status" className="space-y-4">
            {concluido ? (
              <p className="rounded-md border border-rs-success/30 bg-rs-success-bg px-3 py-2 text-sm font-semibold text-rs-ink">
                {resultado.criados} aluno{resultado.criados === 1 ? '' : 's'} importado
                {resultado.criados === 1 ? '' : 's'}.
                {resultado.totais.rejeitadas > 0 && ` ${resultado.totais.rejeitadas} linha(s) ficaram de fora.`}
              </p>
            ) : (
              <p className="text-sm text-rs-gray-700">
                Conferência (nada foi gravado): <strong>{resultado.totais.linhas}</strong> linhas,{' '}
                <strong>{resultado.totais.validas}</strong> prontas para importar,{' '}
                <strong>{resultado.totais.rejeitadas}</strong> com problema.
                {resultado.totais.validas === 0 && ' Corrija o arquivo e escolha de novo.'}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rs-label mr-1">Colunas reconhecidas</span>
              {resultado.colunasReconhecidas.map((c) => (
                <Badge key={c} tom="azul">
                  {ROTULO_COLUNA[c] ?? c}
                </Badge>
              ))}
            </div>

            {resultado.rejeitadas.length > 0 && (
              <div className="max-h-56 overflow-y-auto rounded-md border border-rs-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-rs-gray-200">
                      <th className="rs-label px-3 py-2">Linha</th>
                      <th className="rs-label px-3 py-2">Por que ficou de fora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rs-gray-200">
                    {resultado.rejeitadas.map((r) => (
                      <tr key={r.linha}>
                        <td className="px-3 py-2 font-mono text-rs-gray-700">{r.linha}</td>
                        <td className="px-3 py-2 text-rs-gray-700">{r.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
