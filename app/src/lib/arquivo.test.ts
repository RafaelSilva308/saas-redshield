import { describe, expect, it } from 'vitest'
import { decodificarTexto } from './arquivo'

describe('decodificarTexto', () => {
  it('lê UTF-8 (com ou sem BOM)', () => {
    expect(decodificarTexto(new TextEncoder().encode('nome\nJoão Conceição'))).toBe('nome\nJoão Conceição')
    expect(decodificarTexto(new Uint8Array([0xef, 0xbb, 0xbf, 0x41]))).toBe('A')
  })

  it('cai para Windows-1252 quando o arquivo veio do Excel em português', () => {
    // "João" em Windows-1252: ã = 0xE3, byte inválido isolado em UTF-8
    expect(decodificarTexto(new Uint8Array([0x4a, 0x6f, 0xe3, 0x6f]))).toBe('João')
  })
})
