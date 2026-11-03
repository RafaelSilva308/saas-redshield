import type { FastifyInstance } from 'fastify'
import type { PoolClient } from 'pg'
import { z } from 'zod'
import type { Contexto } from '../app.js'
import { auditar } from '../auditoria.js'
import { novoToken } from '../auth/senha.js'
import { exigir, sessaoDe, type Sessao } from '../auth/sessao.js'
import { hojeNoFuso } from '../datas.js'
import { comTransacao, type Executor } from '../db/pool.js'
import { conflito, invalido, naoEncontrado } from '../erros.js'
import { dataISO, uuid, validar } from '../validacao.js'

const FAIXAS = ['branca', 'cinza', 'amarela', 'laranja', 'verde', 'azul', 'roxa', 'marrom', 'preta'] as const
const STATUS = ['ativo', 'inativo', 'experimental'] as const

/** Aceita '' do formulário como "sem valor". */
const opcional = <S extends z.ZodType>(s: S) => z.preprocess((v) => (v === '' ? null : v), s.nullable()).optional()

const nascimento = dataISO.refine((d) => d < new Date().toISOString().slice(0, 10), 'A data de nascimento deve estar no passado.')

const corpoAluno = z.object({
  nome: z.string().trim().min(2, 'Informe o nome.').max(120),
  email: opcional(z.string().trim().toLowerCase().pipe(z.string().email('E-mail inválido.').max(200))),
  telefone: opcional(z.string().trim().max(30)),
  nascimento: opcional(nascimento),
  faixa: z.enum(FAIXAS).optional(),
  graus: z.number().int().min(0).max(6).optional(),
  status: z.enum(STATUS).optional(),
  matriculaEm: dataISO.optional(),
  planoId: opcional(uuid),
  vencimentoDia: z.number().int().min(1).max(28).optional(),
  responsavel: z
    .object({ nome: z.string().trim().min(2, 'Informe o nome do responsável.').max(120), telefone: z.string().trim().min(8, 'Informe o telefone.').max(30) })
    .nullable()
    .optional(),
  observacoes: opcional(z.string().trim().max(2000)),
  /** LGPD: quem consentiu (o próprio aluno ou o responsável). A data é gravada pelo servidor. null revoga. */
  consentimento: z.object({ por: z.string().trim().min(2).max(120) }).nullable().optional(),
  usoImagemAutorizado: z.boolean().optional(),
  turmaIds: z.array(uuid).max(20).optional(),
})

type Linha = Record<string, any>

/** `h` é o placeholder (ex.: `$3`) que carrega o "hoje" no fuso da academia: status de pagamento e frequência dependem dele. */
const selectAluno = (h: string) => `
  select a.*,
         aluno_status_pagamento(a.id, ${h}::date) as status_pagamento,
         aluno_frequencia_30d(a.id, ${h}::date) as frequencia_30d,
         coalesce((select array_agg(t.turma_id order by t.turma_id) from aluno_turma t
                    where t.aluno_id = a.id and t.ate is null), '{}') as turma_ids,
         exists (select 1 from usuario u where u.aluno_id = a.id) as tem_acesso
    from aluno a`

export const alunoDto = (a: Linha) => ({
  id: a.id as string,
  nome: a.nome as string,
  email: a.email ?? null,
  telefone: a.telefone ?? null,
  nascimento: a.nascimento ?? null,
  faixa: a.faixa,
  graus: a.graus,
  status: a.status,
  matriculaEm: a.matricula_em,
  planoId: a.plano_id ?? null,
  vencimentoDia: a.vencimento_dia,
  statusPagamento: a.status_pagamento,
  frequencia30d: a.frequencia_30d,
  responsavel: a.responsavel_nome ? { nome: a.responsavel_nome, telefone: a.responsavel_telefone } : null,
  observacoes: a.observacoes ?? null,
  consentimento: a.consentimento_em ? { em: new Date(a.consentimento_em).toISOString(), por: a.consentimento_por } : null,
  usoImagemAutorizado: a.uso_imagem_autorizado,
  turmaIds: a.turma_ids as string[],
  temAcesso: a.tem_acesso as boolean,
  /** LGPD: cadastro anonimizado não pode mais ser alterado. */
  anonimizado: !!a.anonimizado_em,
})

/** Garante que plano e turmas pertencem à academia da sessão (ids vêm do cliente). */
async function conferirReferencias(db: Executor, academiaId: string, planoId?: string | null, turmaIds?: string[]) {
  if (planoId) {
    const r = await db.query('select 1 from plano where id = $1 and academia_id = $2', [planoId, academiaId])
    if (!r.rowCount) throw invalido('Plano inexistente.', { planoId: 'Plano inexistente.' })
  }
  if (turmaIds?.length) {
    const unicos = [...new Set(turmaIds)]
    const r = await db.query('select count(*)::int as n from turma where id = any($1) and academia_id = $2', [unicos, academiaId])
    if (r.rows[0].n !== unicos.length) throw invalido('Turma inexistente.', { turmaIds: 'Turma inexistente.' })
  }
}

async function definirTurmas(c: PoolClient, alunoId: string, turmaIds: string[], hoje: string) {
  const alvo = [...new Set(turmaIds)]
  // Quem saiu da turma fica com `ate` (a frequência passada continua valendo); quem voltou reabre o vínculo.
  await c.query(`update aluno_turma set ate = $3 where aluno_id = $1 and ate is null and not (turma_id = any($2))`, [alunoId, alvo, hoje])
  for (const t of alvo) {
    await c.query(
      `insert into aluno_turma (aluno_id, turma_id, desde) values ($1, $2, $3)
       on conflict (aluno_id, turma_id) do update set ate = null`,
      [alunoId, t, hoje],
    )
  }
}

const filtros = z.object({
  status: z.enum(STATUS).optional(),
  faixa: z.enum(FAIXAS).optional(),
  plano: uuid.optional(),
  turma: uuid.optional(),
  busca: z.string().trim().max(80).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(200).default(50),
})

export async function rotasAlunos(app: FastifyInstance, ctx: Contexto) {
  const { db, config, mailer } = ctx
  const equipe = exigir('gestor', 'professor')
  const fusoDe = async (s: Sessao) => (await db.query('select fuso from academia where id = $1', [s.academiaId])).rows[0].fuso as string
  const hoje = async (s: Sessao) => hojeNoFuso(ctx.agora(), await fusoDe(s))

  async function carregar(executor: Executor, academiaId: string, id: string) {
    const fuso = (await db.query('select fuso from academia where id = $1', [academiaId])).rows[0]?.fuso as string | undefined
    const dia = hojeNoFuso(ctx.agora(), fuso ?? 'America/Sao_Paulo')
    const { rows } = await executor.query(`${selectAluno('$3')} where a.id = $1 and a.academia_id = $2`, [id, academiaId, dia])
    return rows[0] as Linha | undefined
  }

  async function recusarAnonimizado(id: string) {
    if ((await db.query('select 1 from aluno where id = $1 and anonimizado_em is not null', [id])).rowCount) {
      throw conflito('aluno_anonimizado', 'Este cadastro foi anonimizado e não pode mais ser alterado.')
    }
  }

  app.get('/alunos', { preHandler: equipe }, async (req) => {
    const s = sessaoDe(req)
    const f = validar(filtros, req.query)
    const params: unknown[] = [s.academiaId]
    const where = ['a.academia_id = $1']
    const add = (sql: string, v: unknown) => {
      params.push(v)
      where.push(sql.replaceAll('?', `$${params.length}`))
    }
    if (f.status) add('a.status = ?', f.status)
    if (f.faixa) add('a.faixa = ?', f.faixa)
    if (f.plano) add('a.plano_id = ?', f.plano)
    if (f.turma) add('exists (select 1 from aluno_turma t where t.aluno_id = a.id and t.turma_id = ? and t.ate is null)', f.turma)
    if (f.busca) add('(a.nome ilike ? or a.email ilike ?)', `%${f.busca.replace(/[\\%_]/g, '\\$&')}%`)
    const sql = where.join(' and ')
    const paramsContagem = [...params]
    params.push(f.limite, (f.pagina - 1) * f.limite, await hoje(s))
    const n = params.length
    const { rows } = await db.query(
      `${selectAluno(`$${n}`)} where ${sql} order by a.nome limit $${n - 2} offset $${n - 1}`,
      params,
    )
    const total = (await db.query(`select count(*)::int as n from aluno a where ${sql}`, paramsContagem)).rows[0].n
    return { itens: rows.map(alunoDto), total, pagina: f.pagina, limite: f.limite }
  })

  app.post('/alunos', { preHandler: equipe }, async (req, reply) => {
    const s = sessaoDe(req)
    const d = validar(corpoAluno, req.body)
    await conferirReferencias(db, s.academiaId, d.planoId, d.turmaIds)
    const dia = await hoje(s)
    const id = await comTransacao(db, async (c) => {
      const { rows } = await c.query(
        `insert into aluno (academia_id, nome, email, telefone, nascimento, faixa, graus, status, matricula_em, plano_id,
                            vencimento_dia, responsavel_nome, responsavel_telefone, observacoes,
                            consentimento_em, consentimento_por, uso_imagem_autorizado)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) returning id`,
        [
          s.academiaId, d.nome, d.email ?? null, d.telefone ?? null, d.nascimento ?? null, d.faixa ?? 'branca', d.graus ?? 0, d.status ?? 'experimental',
          d.matriculaEm ?? dia, d.planoId ?? null, d.vencimentoDia ?? 10, d.responsavel?.nome ?? null, d.responsavel?.telefone ?? null,
          d.observacoes ?? null, d.consentimento ? new Date() : null, d.consentimento?.por ?? null, d.usoImagemAutorizado ?? false,
        ],
      )
      const novoId = rows[0].id as string
      await c.query(
        `insert into graduacao (academia_id, aluno_id, faixa, graus, data, concedida_por, observacao) values ($1,$2,$3,$4,$5,$6,'Matrícula')`,
        [s.academiaId, novoId, d.faixa ?? 'branca', d.graus ?? 0, d.matriculaEm ?? dia, s.usuarioId],
      )
      if (d.turmaIds?.length) await definirTurmas(c, novoId, d.turmaIds, d.matriculaEm ?? dia)
      const criado = alunoDto((await carregar(c, s.academiaId, novoId))!)
      await auditar(c, s, 'aluno.criar', 'aluno', novoId, null, criado, req.ip)
      return novoId
    })
    return reply.status(201).send(alunoDto((await carregar(db, s.academiaId, id))!))
  })

  app.get('/alunos/:id', { preHandler: equipe }, async (req) => {
    const s = sessaoDe(req)
    const { id } = validar(z.object({ id: uuid }), req.params)
    const a = await carregar(db, s.academiaId, id)
    if (!a) throw naoEncontrado('Aluno')
    return alunoDto(a)
  })

  app.patch('/alunos/:id', { preHandler: equipe }, async (req) => {
    const s = sessaoDe(req)
    const { id } = validar(z.object({ id: uuid }), req.params)
    const d = validar(corpoAluno.partial(), req.body)
    const antesLinha = await carregar(db, s.academiaId, id)
    if (!antesLinha) throw naoEncontrado('Aluno')
    await recusarAnonimizado(id)
    await conferirReferencias(db, s.academiaId, d.planoId, d.turmaIds)
    const dia = await hoje(s)

    await comTransacao(db, async (c) => {
      const novoResp = d.responsavel === undefined ? undefined : d.responsavel
      const consent =
        d.consentimento === undefined
          ? { em: antesLinha.consentimento_em, por: antesLinha.consentimento_por }
          : d.consentimento === null
            ? { em: null, por: null }
            : { em: new Date(), por: d.consentimento.por }
      const pick = <T>(novo: T | undefined, atual: T) => (novo === undefined ? atual : novo)
      await c.query(
        `update aluno set nome=$3, email=$4, telefone=$5, nascimento=$6, status=$7, matricula_em=$8, plano_id=$9,
                vencimento_dia=$10, responsavel_nome=$11, responsavel_telefone=$12, observacoes=$13,
                consentimento_em=$14, consentimento_por=$15, uso_imagem_autorizado=$16, atualizado_em=now()
          where id=$1 and academia_id=$2`,
        [
          id, s.academiaId,
          d.nome ?? antesLinha.nome,
          pick(d.email, antesLinha.email),
          pick(d.telefone, antesLinha.telefone),
          pick(d.nascimento, antesLinha.nascimento),
          d.status ?? antesLinha.status,
          d.matriculaEm ?? antesLinha.matricula_em,
          pick(d.planoId, antesLinha.plano_id),
          d.vencimentoDia ?? antesLinha.vencimento_dia,
          novoResp === undefined ? antesLinha.responsavel_nome : (novoResp?.nome ?? null),
          novoResp === undefined ? antesLinha.responsavel_telefone : (novoResp?.telefone ?? null),
          pick(d.observacoes, antesLinha.observacoes),
          consent.em, consent.por,
          d.usoImagemAutorizado ?? antesLinha.uso_imagem_autorizado,
        ],
      )
      // Faixa/graus só mudam gravando uma graduação: o histórico nunca fica para trás do estado atual.
      const faixa = d.faixa ?? antesLinha.faixa
      const graus = d.graus ?? antesLinha.graus
      if (faixa !== antesLinha.faixa || graus !== antesLinha.graus) {
        await c.query(
          `insert into graduacao (academia_id, aluno_id, faixa, graus, data, concedida_por, observacao) values ($1,$2,$3,$4,$5,$6,'Ajuste no cadastro')`,
          [s.academiaId, id, faixa, graus, dia, s.usuarioId],
        )
      }
      if (d.turmaIds) await definirTurmas(c, id, d.turmaIds, dia)
      const depois = alunoDto((await carregar(c, s.academiaId, id))!)
      await auditar(c, s, 'aluno.atualizar', 'aluno', id, alunoDto(antesLinha), depois, req.ip)
    })
    return alunoDto((await carregar(db, s.academiaId, id))!)
  })

  app.delete('/alunos/:id', { preHandler: exigir('gestor') }, async (req, reply) => {
    const s = sessaoDe(req)
    const { id } = validar(z.object({ id: uuid }), req.params)
    const antes = await carregar(db, s.academiaId, id)
    if (!antes) throw naoEncontrado('Aluno')
    await comTransacao(db, async (c) => {
      const h = (
        await c.query(
          `select (select count(*) from presenca where aluno_id = $1)::int as presencas,
                  (select count(*) from cobranca where aluno_id = $1)::int as cobrancas,
                  (select count(*) from transacao where aluno_id = $1)::int as transacoes,
                  (select count(*) from envio_email where aluno_id = $1)::int as emails,
                  (select count(*) from graduacao where aluno_id = $1)::int as graduacoes`,
          [id],
        )
      ).rows[0]
      // Só a graduação inicial (criada com a matrícula) pode ser descartada junto com o aluno.
      if (h.presencas || h.cobrancas || h.transacoes || h.emails || h.graduacoes > 1) {
        throw conflito('aluno_com_historico', 'Este aluno tem histórico (presenças, cobranças ou graduações). Marque como inativo em vez de excluir.')
      }
      await c.query('delete from sessao where usuario_id in (select id from usuario where aluno_id = $1)', [id])
      await c.query('delete from usuario where aluno_id = $1', [id])
      await c.query('delete from graduacao where aluno_id = $1', [id])
      await c.query('delete from aluno where id = $1 and academia_id = $2', [id, s.academiaId])
      await auditar(c, s, 'aluno.remover', 'aluno', id, alunoDto(antes), null, req.ip)
    })
    return reply.status(204).send()
  })

  /** Histórico de presença com a origem de cada registro; aula realizada sem registro aparece como "sem_checkin". */
  async function historicoPresenca(alunoId: string, dias: number, dia: string) {
    const { rows } = await db.query(
      `select ch.data, au.id as aula_id, au.titulo, au.inicio, p.status, p.origem, p.registrado_em, p.observacao
         from aluno_turma at
         join aula au on au.turma_id = at.turma_id
         join v_aula_realizada ch on ch.aula_id = au.id and ch.data >= at.desde and ch.data <= coalesce(at.ate, $3::date)
         left join presenca p on p.chamada_id = ch.id and p.aluno_id = at.aluno_id
        where at.aluno_id = $1 and ch.data >= $3::date - $2::int and ch.data <= $3::date
        order by ch.data desc, au.inicio desc`,
      [alunoId, dias, dia],
    )
    return {
      itens: rows.map((r) => ({
        data: r.data,
        aulaId: r.aula_id,
        titulo: r.titulo,
        inicio: String(r.inicio).slice(0, 5),
        situacao: r.status ?? 'sem_checkin',
        origem: r.origem ?? null,
        registradoEm: r.registrado_em ? new Date(r.registrado_em).toISOString() : null,
        observacao: r.observacao ?? null,
      })),
    }
  }
  const janela = z.object({ dias: z.coerce.number().int().min(1).max(730).default(90) })

  app.get('/alunos/:id/presencas', { preHandler: equipe }, async (req) => {
    const s = sessaoDe(req)
    const { id } = validar(z.object({ id: uuid }), req.params)
    const { dias } = validar(janela, req.query)
    if (!(await carregar(db, s.academiaId, id))) throw naoEncontrado('Aluno')
    return historicoPresenca(id, dias, await hoje(s))
  })

  /** O aluno lê o próprio histórico (Check-in, Painel e Progresso). O id vem só da sessão. */
  app.get('/eu/presencas', { preHandler: exigir('aluno') }, async (req) => {
    const s = sessaoDe(req)
    const { dias } = validar(janela, req.query)
    if (!s.alunoId || !(await carregar(db, s.academiaId, s.alunoId))) throw naoEncontrado('Aluno')
    return historicoPresenca(s.alunoId, dias, await hoje(s))
  })

  const corpoGraduacao = z.object({
    faixa: z.enum(FAIXAS),
    graus: z.number().int().min(0).max(6).default(0),
    data: dataISO.optional(),
    observacao: z.string().trim().max(500).optional(),
  })

  app.get('/alunos/:id/graduacoes', { preHandler: equipe }, async (req) => {
    const s = sessaoDe(req)
    const { id } = validar(z.object({ id: uuid }), req.params)
    if (!(await carregar(db, s.academiaId, id))) throw naoEncontrado('Aluno')
    const { rows } = await db.query(
      `select g.id, g.faixa, g.graus, g.data, g.observacao, u.nome as concedida_por
         from graduacao g left join usuario u on u.id = g.concedida_por
        where g.aluno_id = $1 and g.academia_id = $2 order by g.data desc, g.criado_em desc`,
      [id, s.academiaId],
    )
    return { itens: rows.map((r) => ({ id: r.id, faixa: r.faixa, graus: r.graus, data: r.data, observacao: r.observacao, concedidaPor: r.concedida_por })) }
  })

  app.post('/alunos/:id/graduacoes', { preHandler: equipe }, async (req, reply) => {
    const s = sessaoDe(req)
    const { id } = validar(z.object({ id: uuid }), req.params)
    const d = validar(corpoGraduacao, req.body)
    const antes = await carregar(db, s.academiaId, id)
    if (!antes) throw naoEncontrado('Aluno')
    const dia = await hoje(s)
    const nova = await comTransacao(db, async (c) => {
      // O trigger do banco atualiza faixa/graus do aluno na mesma transação.
      const { rows } = await c.query(
        `insert into graduacao (academia_id, aluno_id, faixa, graus, data, concedida_por, observacao)
         values ($1,$2,$3,$4,$5,$6,$7) returning id`,
        [s.academiaId, id, d.faixa, d.graus, d.data ?? dia, s.usuarioId, d.observacao ?? null],
      )
      await auditar(c, s, 'aluno.graduar', 'aluno', id, { faixa: antes.faixa, graus: antes.graus }, { faixa: d.faixa, graus: d.graus }, req.ip)
      return rows[0].id as string
    })
    return reply.status(201).send({ id: nova, faixa: d.faixa, graus: d.graus, data: d.data ?? dia })
  })

  /** Cria o login do aluno (D5) e manda o convite para ele definir a própria senha. */
  app.post('/alunos/:id/acesso', { preHandler: equipe }, async (req, reply) => {
    const s = sessaoDe(req)
    const { id } = validar(z.object({ id: uuid }), req.params)
    const { email: emailCorpo } = validar(z.object({ email: z.string().trim().toLowerCase().pipe(z.string().email('E-mail inválido.')).optional() }), req.body ?? {})
    const aluno = await carregar(db, s.academiaId, id)
    if (!aluno) throw naoEncontrado('Aluno')
    await recusarAnonimizado(id)
    if (aluno.tem_acesso) throw conflito('acesso_existente', 'Este aluno já tem acesso ao sistema.')
    const email = emailCorpo ?? aluno.email
    if (!email) throw invalido('Informe um e-mail para enviar o convite.', { email: 'Informe um e-mail.' })

    const { token, hash } = novoToken()
    try {
      await comTransacao(db, async (c) => {
        const { rows } = await c.query(
          `insert into usuario (academia_id, nome, email, papel, aluno_id) values ($1,$2,$3,'aluno',$4) returning id`,
          [s.academiaId, aluno.nome, email, id],
        )
        if (!aluno.email) await c.query('update aluno set email = $2 where id = $1', [id, email])
        await c.query(
          `insert into token_senha (token_hash, usuario_id, finalidade, expira_em) values ($1,$2,'convite', now() + interval '7 days')`,
          [hash, rows[0].id],
        )
        await auditar(c, s, 'aluno.convidar', 'aluno', id, null, { email }, req.ip)
      })
    } catch (e) {
      if ((e as { code?: string }).code === '23505') throw conflito('email_em_uso', 'Esse e-mail já está em uso por outro acesso.')
      throw e
    }
    await mailer
      .enviar({
        para: email,
        assunto: 'REDSHIELD · crie sua senha',
        texto: `Olá, ${aluno.nome}.\n\nSeu acesso ao REDSHIELD foi criado. Defina sua senha pelo link (vale por 7 dias):\n${config.urlPublica}/#/redefinir-senha?token=${token}`,
      })
      .catch((e) => req.log.error(e))
    return reply.status(201).send({ ok: true, email })
  })
}
