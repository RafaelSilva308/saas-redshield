import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { dataParaIso, lerCsv } from '../src/importacao.js'
import { chamar, criarAmbiente, entrar, novaAcademia, type Ambiente } from './ajuda.js'

let amb: Ambiente
let A: Awaited<ReturnType<typeof novaAcademia>>
let B: Awaited<ReturnType<typeof novaAcademia>>
let gestorA: string
let gestorB: string
let profA: string

beforeAll(async () => {
  amb = await criarAmbiente()
  A = await novaAcademia(amb)
  B = await novaAcademia(amb)
  gestorA = await entrar(amb, `gestor@${A.sufixo}`)
  gestorB = await entrar(amb, `gestor@${B.sufixo}`)
  profA = await entrar(amb, `professor@${A.sufixo}`)
})
afterAll(() => amb.fechar())

describe('cabeçalhos de segurança', () => {
  it('API responde com CSP, nosniff, sem cache', async () => {
    const r = await amb.app.inject({ method: 'GET', url: '/saude' })
    expect(r.headers['x-content-type-options']).toBe('nosniff')
    expect(r.headers['x-frame-options']).toBe('DENY')
    expect(String(r.headers['content-security-policy'])).toContain("frame-ancestors 'none'")
    const api = await chamar(amb, gestorA, 'GET', '/academia')
    expect(api.headers['cache-control']).toBe('no-store')
    expect(api.headers['strict-transport-security']).toBeUndefined() // só em produção
  })
})

describe('LGPD', () => {
  it('só o gestor exporta e anonimiza; academia alheia não enxerga', async () => {
    const id = A.alunoDemoId
    expect((await chamar(amb, profA, 'GET', `/alunos/${id}/exportacao`)).statusCode).toBe(403)
    expect((await chamar(amb, profA, 'POST', `/alunos/${id}/anonimizar`, { confirmacao: 'ANONIMIZAR' })).statusCode).toBe(403)
    expect((await chamar(amb, gestorB, 'GET', `/alunos/${id}/exportacao`)).statusCode).toBe(404)
    expect((await chamar(amb, gestorB, 'POST', `/alunos/${id}/anonimizar`, { confirmacao: 'ANONIMIZAR' })).statusCode).toBe(404)
  })

  it('exporta tudo do aluno em JSON para download', async () => {
    const r = await chamar(amb, gestorA, 'GET', `/alunos/${A.alunoDemoId}/exportacao`)
    expect(r.statusCode).toBe(200)
    expect(r.headers['content-disposition']).toContain('attachment')
    const j = r.json()
    expect(j.aluno).toMatchObject({ id: A.alunoDemoId, nome: 'Pedro Almeida' })
    expect(Array.isArray(j.presencas)).toBe(true)
    expect(j.presencas.length).toBeGreaterThan(0)
    expect(j.graduacoes.length).toBeGreaterThan(0)
    expect(JSON.stringify(j)).not.toMatch(/senha/i)
    const log = await amb.db.query(`select 1 from log_auditoria where acao = 'lgpd.exportar' and entidade_id = $1`, [A.alunoDemoId])
    expect(log.rowCount).toBe(1)
  })

  it('anonimiza: apaga dados pessoais, derruba o acesso e mantém os números', async () => {
    const id = A.alunoDemoId
    const cookieAluno = await entrar(amb, `aluno@${A.sufixo}`)
    await chamar(amb, gestorA, 'POST', '/cobrancas/gerar', { competencia: '2026-03' })
    const presencasAntes = (await amb.db.query('select count(*)::int as n from presenca where aluno_id = $1', [id])).rows[0].n

    expect((await chamar(amb, gestorA, 'POST', `/alunos/${id}/anonimizar`, {})).statusCode).toBe(400)
    const r = await chamar(amb, gestorA, 'POST', `/alunos/${id}/anonimizar`, { confirmacao: 'ANONIMIZAR' })
    expect(r.statusCode).toBe(200)

    const a = (await amb.db.query('select * from aluno where id = $1', [id])).rows[0]
    expect(a).toMatchObject({ nome: 'Aluno anonimizado', email: null, telefone: null, nascimento: null, status: 'inativo', observacoes: null })
    expect(a.anonimizado_em).toBeTruthy()
    expect((await chamar(amb, gestorA, 'GET', `/alunos/${id}`)).json()).toMatchObject({ anonimizado: true, nome: 'Aluno anonimizado' })
    expect((await amb.db.query('select count(*)::int as n from presenca where aluno_id = $1', [id])).rows[0].n).toBe(presencasAntes)
    expect((await amb.db.query(`select count(*)::int as n from cobranca where aluno_id = $1 and status = 'aberta'`, [id])).rows[0].n).toBe(0)
    expect((await amb.db.query(`select count(*)::int as n from log_auditoria where entidade = 'aluno' and entidade_id = $1 and (dados_antes is not null or dados_depois is not null)`, [id])).rows[0].n).toBe(0)

    // o acesso morreu: a sessão antiga não vale e o login não funciona mais
    expect((await chamar(amb, cookieAluno, 'GET', '/auth/eu')).statusCode).toBe(401)
    const login = await amb.app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: `aluno@${A.sufixo}`, senha: 'treino123' } })
    expect(login.statusCode).toBe(401)

    // não dá para anonimizar de novo, nem editar, nem devolver o acesso
    expect((await chamar(amb, gestorA, 'POST', `/alunos/${id}/anonimizar`, { confirmacao: 'ANONIMIZAR' })).statusCode).toBe(409)
    expect((await chamar(amb, gestorA, 'PATCH', `/alunos/${id}`, { nome: 'Outro Nome' })).statusCode).toBe(409)
    expect((await chamar(amb, gestorA, 'POST', `/alunos/${id}/acesso`, { email: 'novo@teste.test' })).statusCode).toBe(409)
  })
})

describe('leitor de CSV', () => {
  it('lê aspas, vírgula dentro de campo, ponto e vírgula, BOM e CRLF', () => {
    expect(lerCsv('﻿nome;obs\r\n"Silva; João";"disse ""oi"""\r\n\r\nAna;x\r\n')).toEqual([
      ['nome', 'obs'],
      ['Silva; João', 'disse "oi"'],
      ['Ana', 'x'],
    ])
    expect(lerCsv('a,b\n"x, y",z')).toEqual([['a', 'b'], ['x, y', 'z']])
  })

  it('converte datas brasileiras e recusa as impossíveis', () => {
    expect(dataParaIso('05/03/1990')).toBe('1990-03-05')
    expect(dataParaIso('1990-03-05')).toBe('1990-03-05')
    expect(dataParaIso('31/02/1990')).toBeNull()
    expect(dataParaIso('ontem')).toBeNull()
  })
})

describe('importação de alunos', () => {
  const csv = [
    'Nome;E-mail;Nascimento;Faixa;Graus;Plano;Matrícula',
    'Carla Dias;carla@import.test;12/05/1992;Azul;2;;01/02/2025',
    'Bruno Reis;bruno@import.test;;branca;0;;',
    'Carla Dias de novo;CARLA@import.test;;branca;0;;',
    'X;sem@nome.test;;;;;',
    'Dora Lima;dora@import.test;31/02/2000;;;;',
    'Eva Costa;eva@import.test;;roxa;9;;',
    'Fabio Neto;fabio@import.test;;;;Plano Que Nao Existe;',
  ].join('\n')

  it('só o gestor importa; cabeçalho sem nome é recusado', async () => {
    expect((await chamar(amb, profA, 'POST', '/alunos/importar', { csv })).statusCode).toBe(403)
    expect((await chamar(amb, gestorB, 'POST', '/alunos/importar', { csv: 'email\na@b.test' })).statusCode).toBe(422)
    expect((await chamar(amb, gestorB, 'POST', '/alunos/importar', { csv: 'nome' })).statusCode).toBe(422)
  })

  it('por padrão só simula: relata o que seria rejeitado e não grava nada', async () => {
    const r = await chamar(amb, gestorB, 'POST', '/alunos/importar', { csv })
    expect(r.statusCode).toBe(200)
    const j = r.json()
    expect(j).toMatchObject({ simulacao: true, criados: 0, totais: { linhas: 7, validas: 2, rejeitadas: 5 } })
    expect(j.rejeitadas.map((x: any) => x.linha)).toEqual([4, 5, 6, 7, 8])
    expect(j.rejeitadas.find((x: any) => x.linha === 4).motivo).toMatch(/já cadastrado|E-mail/i)
    expect((await amb.db.query(`select count(*)::int as n from aluno where academia_id = $1 and email like '%@import.test'`, [B.academiaId])).rows[0].n).toBe(0)
  })

  it('grava as linhas válidas, cria a graduação inicial e rejeita repetidos numa segunda rodada', async () => {
    const r = await chamar(amb, gestorB, 'POST', '/alunos/importar', { csv, simular: false, consentimentoPor: 'Ficha em papel' })
    expect(r.json()).toMatchObject({ simulacao: false, criados: 2 })
    const carla = (await amb.db.query(`select faixa, graus, status, matricula_em::text, nascimento::text, consentimento_por from aluno where email = 'carla@import.test'`)).rows[0]
    expect(carla).toMatchObject({ faixa: 'azul', graus: 2, status: 'ativo', matricula_em: '2025-02-01', nascimento: '1992-05-12', consentimento_por: 'Ficha em papel' })
    expect((await amb.db.query(`select count(*)::int as n from graduacao g join aluno a on a.id = g.aluno_id where a.email like '%@import.test'`)).rows[0].n).toBe(2)

    const de_novo = await chamar(amb, gestorB, 'POST', '/alunos/importar', { csv, simular: false })
    expect(de_novo.json()).toMatchObject({ criados: 0, totais: { validas: 0, rejeitadas: 7 } })
    // academia A não é afetada
    expect((await amb.db.query(`select count(*)::int as n from aluno where academia_id = $1 and email like '%@import.test'`, [A.academiaId])).rows[0].n).toBe(0)
  })
})
