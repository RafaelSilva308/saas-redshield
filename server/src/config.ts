import { resolve } from 'node:path'

export interface Config {
  ambiente: 'development' | 'production' | 'test'
  databaseUrl: string
  porta: number
  host: string
  /** Pasta do front compilado (app/dist). Se não existir, a API sobe sem servir o front. */
  webDist: string | undefined
  sessaoDias: number
  /** Cookie `Secure`: obrigatório em produção (HTTPS). */
  cookieSeguro: boolean
  /** URL pública usada nos links de e-mail (convite, recuperação de senha). */
  urlPublica: string
  /** Tentativas por minuto, por IP, nas rotas de login e senha. */
  limiteLogin: number
  /** Chave da API do Resend. Sem ela o e-mail só é escrito no log. */
  resendApiKey: string | undefined
  /** Remetente verificado no Resend, ex.: `REDSHIELD <avisos@seudominio.com.br>`. */
  emailRemetente: string
  /** Liga o agendador de rotinas (cobranças do mês e avisos por e-mail) dentro do processo da API. */
  rotinasAtivas: boolean
  /** Hora local da academia a partir da qual os avisos do dia podem sair. */
  horaDosAvisos: number
  /** Aplica as migrações ao subir. Em produção o padrão é NÃO: migrar é um passo à parte, com credencial própria. */
  migrarNoInicio: boolean
}

export function lerConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const ambiente = (env.NODE_ENV ?? 'development') as Config['ambiente']
  const databaseUrl = env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL não definida.')
  const porta = Number(env.PORT ?? 3000)
  return {
    ambiente,
    databaseUrl,
    porta,
    host: env.HOST ?? '0.0.0.0',
    // O @fastify/static exige caminho absoluto; relativo (como no .env.example) vale a partir da pasta da API.
    webDist: env.WEB_DIST ? resolve(env.WEB_DIST) : undefined,
    sessaoDias: Number(env.SESSAO_DIAS ?? 14),
    cookieSeguro: ambiente === 'production',
    urlPublica: env.URL_PUBLICA ?? `http://localhost:${porta}`,
    limiteLogin: Number(env.LIMITE_LOGIN ?? 10),
    resendApiKey: env.RESEND_API_KEY || undefined,
    emailRemetente: env.EMAIL_REMETENTE ?? 'REDSHIELD <onboarding@resend.dev>',
    rotinasAtivas: env.ROTINAS === '1',
    horaDosAvisos: Number(env.HORA_DOS_AVISOS ?? 8),
    migrarNoInicio: env.MIGRAR_NO_INICIO ? env.MIGRAR_NO_INICIO === '1' : ambiente !== 'production',
  }
}
