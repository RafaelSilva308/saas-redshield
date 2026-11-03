/* Leitura de arquivos de texto enviados pelo usuário. */

/**
 * Decodifica o conteúdo de um CSV. Tenta UTF-8 primeiro; se os bytes não forem UTF-8 válido, usa Windows-1252,
 * que é como o Excel em português salva "CSV (separado por vírgulas)". Assim "João" não vira "Jo�o".
 */
export function decodificarTexto(bytes: ArrayBuffer | Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

export async function lerArquivoTexto(arquivo: File): Promise<string> {
  return decodificarTexto(await arquivo.arrayBuffer())
}
