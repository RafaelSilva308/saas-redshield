import { describe, expect, it } from 'vitest'
import { paraCentavos, paraReais } from './dinheiro'

describe('paraCentavos', () => {
  it('converte reais em centavos inteiros', () => {
    expect(paraCentavos(189.9)).toBe(18990)
    expect(paraCentavos(0)).toBe(0)
    expect(paraCentavos(1500)).toBe(150000)
  })

  it('corrige a imprecisão do ponto flutuante', () => {
    expect(paraCentavos(19.9)).toBe(1990)
    expect(paraCentavos(0.1 + 0.2)).toBe(30)
    expect(paraCentavos(1.005)).toBe(100)
  })

  it('recusa valor que não é número finito', () => {
    expect(() => paraCentavos(Number.NaN)).toThrow(RangeError)
    expect(() => paraCentavos(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('paraReais', () => {
  it('converte centavos em reais', () => {
    expect(paraReais(18990)).toBe(189.9)
    expect(paraReais(1)).toBe(0.01)
  })

  it('recusa centavos fracionados', () => {
    expect(() => paraReais(10.5)).toThrow(RangeError)
  })

  it('ida e volta preservam o valor', () => {
    for (const reais of [0.01, 9.99, 150, 189.9, 2349.47]) expect(paraReais(paraCentavos(reais))).toBe(reais)
  })
})
