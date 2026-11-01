import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ErroApi, mensagemDeErro, quandoPerderSessao } from './api'

const resposta = (status: number, corpo?: unknown) =>
  new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  })

afterEach(() => vi.unstubAllGlobals())

describe('api', () => {
  it('prefixa /api/v1, envia o cookie da mesma origem e devolve o JSON', async () => {
    const fetch = vi.fn().mockResolvedValue(resposta(200, { ok: 1 }))
    vi.stubGlobal('fetch', fetch)

    expect(await api.get('/planos')).toEqual({ ok: 1 })
    const [url, opcoes] = fetch.mock.calls[0]
    expect(url).toBe('/api/v1/planos')
    expect(opcoes).toMatchObject({ method: 'GET', credentials: 'same-origin', body: undefined })
  })

  it('serializa o corpo das escritas', async () => {
    const fetch = vi.fn().mockResolvedValue(resposta(201, { id: 'x' }))
    vi.stubGlobal('fetch', fetch)

    await api.post('/planos', { nome: 'Mensal', valorCentavos: 18990 })
    const opcoes = fetch.mock.calls[0][1]
    expect(opcoes.method).toBe('POST')
    expect(opcoes.headers['content-type']).toBe('application/json')
    expect(JSON.parse(opcoes.body)).toEqual({ nome: 'Mensal', valorCentavos: 18990 })
  })

  it('aceita 204 sem corpo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    await expect(api.delete('/transacoes/1')).resolves.toBeUndefined()
  })

  it('transforma o erro da API em ErroApi com código, mensagem e campos', async () => {
    const corpo = { erro: { codigo: 'validacao', mensagem: 'Confira os campos.', campos: { nome: 'Obrigatório.' } } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(400, corpo)))

    const erro = await api.post('/planos', {}).catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ErroApi)
    expect(erro).toMatchObject({
      status: 400,
      codigo: 'validacao',
      message: 'Confira os campos.',
      campos: { nome: 'Obrigatório.' },
    })
  })

  it('erro sem corpo reconhecível ainda tem mensagem legível', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 502 })))
    const erro = await api.get('/planos').catch((e: unknown) => e)
    expect(erro).toMatchObject({ status: 502, codigo: 'erro_desconhecido' })
    expect(mensagemDeErro(erro)).toMatch(/Algo deu errado/)
  })

  it('falha de rede vira sem_conexao', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(api.get('/planos')).rejects.toMatchObject({ status: 0, codigo: 'sem_conexao' })
  })

  it('avisa quem escuta quando a sessão cai (401)', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(resposta(401, { erro: { codigo: 'nao_autenticado', mensagem: 'Entre para continuar.' } })),
    )
    const ouvinte = vi.fn()
    const parar = quandoPerderSessao(ouvinte)

    await api.get('/auth/eu').catch(() => {})
    expect(ouvinte).toHaveBeenCalledTimes(1)

    parar()
    await api.get('/auth/eu').catch(() => {})
    expect(ouvinte).toHaveBeenCalledTimes(1)
  })

  it('outro 401 (senha atual errada) não derruba a sessão', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          resposta(401, { erro: { codigo: 'credenciais_invalidas', mensagem: 'A senha atual está incorreta.' } }),
        ),
    )
    const ouvinte = vi.fn()
    const parar = quandoPerderSessao(ouvinte)
    await expect(api.post('/auth/trocar-senha', {})).rejects.toMatchObject({ codigo: 'credenciais_invalidas' })
    expect(ouvinte).not.toHaveBeenCalled()
    parar()
  })
})
