/* Conversão de dinheiro na borda da API.
   O front trabalha em reais (`number`); a API e o banco, em centavos inteiros.
   Toda leitura e toda escrita de valor passam por aqui (defeito 3 do roadmap). */

/** Reais → centavos inteiros. Arredonda para corrigir a imprecisão do ponto flutuante (19,9 × 100 = 1989,999…). */
export function paraCentavos(reais: number): number {
  if (!Number.isFinite(reais)) throw new RangeError(`Valor em reais inválido: ${reais}`)
  return Math.round(reais * 100)
}

/** Centavos inteiros → reais. */
export function paraReais(centavos: number): number {
  if (!Number.isInteger(centavos)) throw new RangeError(`Valor em centavos precisa ser inteiro: ${centavos}`)
  return centavos / 100
}
