import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AGORA, chamar, criarAmbiente, entrar, HOJE, novaAcademia, type Ambiente } from './ajuda.js'

let amb: Ambiente
let s: string
let alunoId: string
let aluno: string
let prof: string

const aulaPorTitulo = async (cookie: string, titulo: string) => {
  const r = await chamar(amb, cookie, 'GET', '/aulas')
  return (r.json().itens as { id: string; titulo: string }[]).find((a) => a.titulo === titulo)!.id
}

beforeAll(async () => {
  amb = await criarAmbiente()
})
afterAll(() => amb.fechar())

beforeEach(async () => {
  amb.relogio.agora = AGORA
  const a = await novaAcademia(amb)
  s = a.sufixo
  alunoId = a.alunoDemoId
  aluno = await entrar(amb, `aluno@${s}`)
  prof = await entrar(amb, `professor@${s}`)
})

describe('check-in do aluno', () => {
  it('lista as aulas de hoje e registra presença na hora, sem confirmação', async () => {
    const hoje = await chamar(amb, aluno, 'GET', '/checkin/hoje')
    expect(hoje.json().data).toBe(HOJE)
    const raspagens = hoje.json().itens.find((i: { titulo: string }) => i.titulo === 'Raspagens')
    expect(raspagens.registro).toBeNull()

    const r = await chamar(amb, aluno, 'POST', `/aulas/${raspagens.aulaId}/checkin`)
    expect(r.statusCode).toBe(200)
    expect(r.json().registro).toMatchObject({ status: 'presente', origem: 'aluno' })

    const depois = await chamar(amb, aluno, 'GET', '/checkin/hoje')
    expect(depois.json().itens.find((i: { titulo: string }) => i.titulo === 'Raspagens').registro.status).toBe('presente')
  })

  it('é idempotente: repetir não muda o horário registrado', async () => {
    const aula = await aulaPorTitulo(aluno, 'Raspagens')
    const a = await chamar(amb, aluno, 'POST', `/aulas/${aula}/checkin`)
    amb.relogio.agora = new Date(AGORA.getTime() + 60_000)
    const b = await chamar(amb, aluno, 'POST', `/aulas/${aula}/checkin`)
    expect(b.statusCode).toBe(200)
    expect(b.json().registro.registradoEm).toBe(a.json().registro.registradoEm)
    const { rows } = await amb.db.query('select count(*)::int as n from presenca where aluno_id = $1', [alunoId])
    expect(rows[0].n).toBe(
      (await amb.db.query(`select count(*)::int as n from presenca p join chamada c on c.id = p.chamada_id where p.aluno_id = $1 and c.data <> $2`, [alunoId, HOJE])).rows[0].n + 1,
    )
  })

  it('recusa aula de outro dia da semana e aula de turma da qual não faz parte', async () => {
    const quinta = await aulaPorTitulo(aluno, 'Finalizações')
    const r1 = await chamar(amb, aluno, 'POST', `/aulas/${quinta}/checkin`)
    expect(r1.statusCode).toBe(422)

    const kids = await aulaPorTitulo(aluno, 'Kids — Jogos de Guarda')
    const r2 = await chamar(amb, aluno, 'POST', `/aulas/${kids}/checkin`)
    expect(r2.statusCode).toBe(403)
  })

  it('o cliente não escolhe a data: o corpo é ignorado', async () => {
    const aula = await aulaPorTitulo(aluno, 'Raspagens')
    await chamar(amb, aluno, 'POST', `/aulas/${aula}/checkin`, { data: '2020-01-01' })
    const { rows } = await amb.db.query(
      `select c.data from presenca p join chamada c on c.id = p.chamada_id where p.aluno_id = $1 and p.origem = 'aluno' and c.aula_id = $2 and c.data = $3`,
      [alunoId, aula, HOJE],
    )
    expect(rows).toHaveLength(1)
  })

  it('o aluno desfaz o próprio check-in, mas não o registro do professor', async () => {
    const aula = await aulaPorTitulo(aluno, 'Raspagens')
    await chamar(amb, aluno, 'POST', `/aulas/${aula}/checkin`)
    expect((await chamar(amb, aluno, 'DELETE', `/aulas/${aula}/checkin`)).statusCode).toBe(204)
    expect((await chamar(amb, aluno, 'GET', '/checkin/hoje')).json().itens.find((i: { titulo: string }) => i.titulo === 'Raspagens').registro).toBeNull()

    await chamar(amb, prof, 'PUT', `/chamadas/${aula}/${HOJE}/presencas/${alunoId}`, { status: 'justificado', observacao: 'Atestado' })
    const r = await chamar(amb, aluno, 'DELETE', `/aulas/${aula}/checkin`)
    expect(r.statusCode).toBe(409)
    expect(r.json().erro.codigo).toBe('registro_do_professor')
  })

  it('aluno inativo não faz check-in', async () => {
    await amb.db.query(`update aluno set status = 'inativo' where id = $1`, [alunoId])
    const aula = await aulaPorTitulo(aluno, 'Raspagens')
    expect((await chamar(amb, aluno, 'POST', `/aulas/${aula}/checkin`)).statusCode).toBe(403)
  })

  it('o aluno lê só o próprio histórico de presença, com o check-in de hoje', async () => {
    const aula = await aulaPorTitulo(aluno, 'Raspagens')
    await chamar(amb, aluno, 'POST', `/aulas/${aula}/checkin`)

    const r = await chamar(amb, aluno, 'GET', '/eu/presencas?dias=30')
    expect(r.statusCode).toBe(200)
    const hoje = r.json().itens.find((i: { data: string; aulaId: string }) => i.data === HOJE && i.aulaId === aula)
    expect(hoje).toMatchObject({ situacao: 'presente', origem: 'aluno' })
    // Igual ao que a equipe vê na ficha dele.
    expect(r.json()).toEqual((await chamar(amb, prof, 'GET', `/alunos/${alunoId}/presencas?dias=30`)).json())

    // Não há como pedir o de outro aluno: a rota da ficha é da equipe e /eu/ não recebe id.
    const outro = (await amb.db.query('select id from aluno where id <> $1 limit 1', [alunoId])).rows[0].id
    expect((await chamar(amb, aluno, 'GET', `/alunos/${outro}/presencas`)).statusCode).toBe(403)
    expect((await chamar(amb, prof, 'GET', '/eu/presencas')).statusCode).toBe(403)
  })
})

describe('chamada do professor', () => {
  it('mostra quem fez check-in e quem ficou como falta; aula só é realizada com ao menos um presente', async () => {
    const aula = await aulaPorTitulo(prof, 'Raspagens')
    const antes = (await chamar(amb, prof, 'GET', `/chamadas?aulaId=${aula}&data=${HOJE}`)).json()
    expect(antes.realizada).toBe(false)
    expect(antes.registros.length).toBeGreaterThan(1)
    expect(antes.registros.every((r: { situacao: string }) => r.situacao === 'sem_checkin')).toBe(true)

    await chamar(amb, aluno, 'POST', `/aulas/${aula}/checkin`)
    const depois = (await chamar(amb, prof, 'GET', `/chamadas?aulaId=${aula}&data=${HOJE}`)).json()
    expect(depois.realizada).toBe(true)
    const pedro = depois.registros.find((r: { alunoId: string }) => r.alunoId === alunoId)
    expect(pedro).toMatchObject({ situacao: 'presente', origem: 'aluno' })
    expect(depois.registros.filter((r: { situacao: string }) => r.situacao === 'sem_checkin').length).toBe(depois.registros.length - 1)
  })

  it('professor corrige livremente, a correção prevalece sobre o check-in e é auditada', async () => {
    const aula = await aulaPorTitulo(prof, 'Raspagens')
    await chamar(amb, aluno, 'POST', `/aulas/${aula}/checkin`)

    const r = await chamar(amb, prof, 'PUT', `/chamadas/${aula}/${HOJE}/presencas/${alunoId}`, { status: 'ausente', observacao: 'Saiu antes do aquecimento' })
    expect(r.statusCode).toBe(200)
    expect(r.json().registro).toMatchObject({ status: 'ausente', origem: 'professor' })

    // novo check-in do aluno não sobrescreve a correção
    const de_novo = await chamar(amb, aluno, 'POST', `/aulas/${aula}/checkin`)
    expect(de_novo.json().registro).toMatchObject({ status: 'ausente', origem: 'professor' })

    const { rows } = await amb.db.query(`select dados_antes, dados_depois, usuario_id from log_auditoria where acao = 'presenca.corrigir' order by id desc limit 1`)
    expect(rows[0].dados_antes).toMatchObject({ status: 'presente', origem: 'aluno' })
    expect(rows[0].dados_depois).toMatchObject({ status: 'ausente', origem: 'professor' })
  })

  it('professor pode registrar presença de quem não fez check-in', async () => {
    const aula = await aulaPorTitulo(prof, 'Raspagens')
    const outro = (await amb.db.query(`select id from aluno where id <> $1 and status <> 'inativo' and academia_id = (select academia_id from aluno where id = $1) limit 1`, [alunoId])).rows[0].id
    const r = await chamar(amb, prof, 'PUT', `/chamadas/${aula}/${HOJE}/presencas/${outro}`, { status: 'presente' })
    expect(r.statusCode).toBe(200)
  })

  it('recusa data futura e dia da semana que não bate com a aula', async () => {
    const aula = await aulaPorTitulo(prof, 'Raspagens')
    const futura = await chamar(amb, prof, 'PUT', `/chamadas/${aula}/2026-03-18/presencas/${alunoId}`, { status: 'presente' })
    expect(futura.statusCode).toBe(422)
    const dia = await chamar(amb, prof, 'PUT', `/chamadas/${aula}/2026-03-10/presencas/${alunoId}`, { status: 'presente' })
    expect(dia.statusCode).toBe(422)
  })

  it('aula cancelada recusa check-in e correção, e some do cálculo; reativar volta ao normal', async () => {
    const aula = await aulaPorTitulo(prof, 'Raspagens')
    await chamar(amb, aluno, 'POST', `/aulas/${aula}/checkin`)

    const c = await chamar(amb, prof, 'POST', `/chamadas/${aula}/${HOJE}/cancelar`, { motivo: 'Feriado municipal' })
    expect(c.statusCode).toBe(200)

    const ci = await chamar(amb, aluno, 'POST', `/aulas/${aula}/checkin`)
    expect(ci.statusCode).toBe(409)
    expect(ci.json().erro.codigo).toBe('aula_cancelada')
    expect((await chamar(amb, prof, 'PUT', `/chamadas/${aula}/${HOJE}/presencas/${alunoId}`, { status: 'presente' })).statusCode).toBe(409)

    const visao = (await chamar(amb, prof, 'GET', `/chamadas?aulaId=${aula}&data=${HOJE}`)).json()
    expect(visao).toMatchObject({ cancelada: true, motivo: 'Feriado municipal', realizada: false })
    const real = await amb.db.query('select 1 from v_aula_realizada where aula_id = $1 and data = $2', [aula, HOJE])
    expect(real.rowCount).toBe(0)

    expect((await chamar(amb, prof, 'POST', `/chamadas/${aula}/${HOJE}/reativar`)).statusCode).toBe(200)
    expect((await chamar(amb, prof, 'GET', `/chamadas?aulaId=${aula}&data=${HOJE}`)).json().realizada).toBe(true)
  })

  it('exige motivo para cancelar', async () => {
    const aula = await aulaPorTitulo(prof, 'Raspagens')
    expect((await chamar(amb, prof, 'POST', `/chamadas/${aula}/${HOJE}/cancelar`, {})).statusCode).toBe(400)
  })

  it('o aluno não acessa a chamada nem corrige presença (nem a própria)', async () => {
    const aula = await aulaPorTitulo(aluno, 'Raspagens')
    expect((await chamar(amb, aluno, 'GET', `/chamadas?aulaId=${aula}&data=${HOJE}`)).statusCode).toBe(403)
    expect((await chamar(amb, aluno, 'PUT', `/chamadas/${aula}/${HOJE}/presencas/${alunoId}`, { status: 'presente' })).statusCode).toBe(403)
    expect((await chamar(amb, aluno, 'POST', `/chamadas/${aula}/${HOJE}/cancelar`, { motivo: 'teste' })).statusCode).toBe(403)
  })

  it('professor não faz check-in como aluno', async () => {
    const aula = await aulaPorTitulo(prof, 'Raspagens')
    expect((await chamar(amb, prof, 'POST', `/aulas/${aula}/checkin`)).statusCode).toBe(403)
  })
})
