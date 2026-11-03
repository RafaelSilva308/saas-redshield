# PROGRESSO — o que já foi feito e o que falta

Registro vivo do desenvolvimento. **Atualize ao fim de cada sessão.** O plano e as decisões continuam no [`ROADMAP.md`](./ROADMAP.md) (fonte de verdade); aqui fica o estado da execução.

Última atualização: 2026-11-03 · `feat/front-api` mergeada na `main` (PR #6). **Sistema no ar na Railway + Neon, com banco vazio; ver "Deploy em andamento".**

## Como rodar o back-end (`server/`)

```bash
cd server && npm install
cp .env.example .env     # ajustar DATABASE_URL (PostgreSQL 15+)
npm run migrar           # aplica db/schema.sql (001) + db/migrations/*
npm run seed             # dados equivalentes ao protótipo (recusa rodar em produção)
npm run dev              # API em http://localhost:3000/api/v1
npm test                 # 81 testes; sobe um PostgreSQL embutido, não precisa de banco local
npm run typecheck && npx tsc -p tsconfig.test.json --noEmit
npm run nova-academia    # cria academia + gestor (variáveis ACADEMIA_NOME, GESTOR_NOME, GESTOR_EMAIL, ACADEMIA_FUSO)
npm run rotinas          # roda uma vez as rotinas (cobranças do mês e avisos)
```

- Testes: `vitest` + `embedded-postgres` (ou `TEST_DATABASE_URL`). Cada arquivo cria a própria academia isolada.
- Windows com acento no caminho do projeto: o `initdb` não aceita UTF8, então os testes usam `SQL_ASCII` nesse caso (ver `test/globalSetup.ts`). Em CI/Linux usa UTF8.
- Login de demonstração do seed: `gestor|professor|aluno@redshield.com.br`, senha `treino123`.
- Colocar no ar: [`DEPLOY.md`](./DEPLOY.md).

## Feito (servidor, fases 2 a 9 do ROADMAP)

| Área | O que existe | Onde |
|---|---|---|
| Fundação | Fastify 5 + TS estrito, pool `pg`, migrações versionadas com lock, erros `{erro:{codigo,mensagem,campos}}`, validação zod | `server/src/` |
| Migrações | 001 = `db/schema.sql`; 002 autenticação; 003 financeiro/rotinas/LGPD | `db/migrations/` |
| Autenticação | Argon2id; sessão em cookie `rs.sid` (httpOnly, SameSite=Strict), só o sha256 no banco; checagem de Origin nas escritas; rate limit no login; recuperação e convite por token de uso único | `src/auth/`, `src/rotas/auth.ts` |
| Autorização | Por papel (`exigir(...)`) e por `academia_id` **sempre da sessão**; testes provam isolamento entre academias | `test/autorizacao.test.ts` |
| Planos, alunos, turmas | CRUD, graduações, vínculo aluno-turma, consentimento do responsável, convite de acesso, auditoria | `src/rotas/{planos,alunos,turmas}.ts` |
| Presença (D1–D7) | Check-in do aluno; chamada do dia (ausência de linha = falta); correção livre do professor, auditada; cancelar/reativar aula | `src/rotas/presenca.ts` |
| Financeiro | Geração mensal idempotente de cobranças; baixa com `transacao` na mesma transação; estorno e cancelamento; inadimplência; lançamentos avulsos e categorias | `src/rotas/financeiro.ts`, `src/financeiro.ts` |
| Métricas | Painel (o aluno só vê os próprios dados: defeito 8), financeiro, presença, faixas, ocupação, elegíveis à graduação (regra **provisória** até E1) | `src/rotas/metricas.ts` |
| E-mail e rotinas | Resend (ou console sem chave); `envio_email` gravado **antes** de enviar, com índice único (nunca duplica); avisos de vencimento, atraso, aniversário, ausência e resumo semanal; respeita `config_aviso` (sem linha = desligado, E9) e a hora local da academia; agendador no processo (`ROTINAS=1`) | `src/rotinas.ts`, `src/email.ts`, `src/rotas/configuracoes.ts` |
| LGPD | Exportação JSON do titular e anonimização irreversível (mantém valores fiscais e contagem de presença, apaga dados pessoais, encerra o acesso, bloqueia edição depois) | `src/rotas/lgpd.ts` |
| Importação | `POST /alunos/importar` de CSV (`,` ou `;`, BOM, datas dd/mm/aaaa). **Simula por padrão**; relatório de linhas rejeitadas; duplicados por e-mail ou nome+nascimento | `src/importacao.ts`, `src/rotas/importacao.ts` |
| Segurança HTTP | CSP (só o Google Fonts como origem externa), nosniff, X-Frame-Options, Referrer-Policy, HSTS em produção, `no-store` na API | `src/app.ts` |
| Infra como código | `Dockerfile` (API serve o front), `railway.json` (migra antes do deploy, healthcheck `/saude`), CI, backup diário criptografado **com teste de restauração**, papéis de banco de mínimo privilégio | `Dockerfile`, `.github/workflows/`, `scripts/`, `db/papeis.sql` |
| Documentos | Passo a passo de deploy; modelo de política de privacidade (precisa de revisão jurídica) | `DEPLOY.md`, `POLITICA_DE_PRIVACIDADE.md` |

## Deploy em andamento (atualizado em 2026-11-03)

**Quando o dono do produto perguntar "o que falta fazer?", responda a partir da lista "Pendente" abaixo, na ordem.**

### Feito
- **Neon:** projeto `Redshield-SaaS` (id `square-sky-31126079`), região **`aws-sa-east-1` (São Paulo)**, **PostgreSQL 16**, branch `production`, banco `neondb`. Papéis `redshield_migracao`, `redshield_app` e `redshield_backup` criados por `db/papeis.sql` (já com a correção do PG 16); concessões conferidas em `pg_default_acl`. As senhas ficam com o dono do produto, no gerenciador de senhas do Google, e **nunca** passam pelo chat nem pelo repositório.
- **Railway:** serviço `saas-redshield` ligado à branch `main`, região **`us-east4` (Virgínia)** (opção B: decisão do dono; a Railway não tem região no Brasil, e ele pretende migrar para um servidor no Brasil no futuro). Endereço: **https://saas-redshield-production.up.railway.app**.
  - Variáveis: `DATABASE_URL` (`redshield_app`, host com `-pooler`), `MIGRATION_DATABASE_URL` (`redshield_migracao`, host direto), `URL_PUBLICA`, `ROTINAS=1`, `HORA_DOS_AVISOS=8`.
  - Pre-deploy `node dist/db/migrar.js`, healthcheck `/saude`, configurados direto no serviço (a Railway ignora o `railway.json`; ver `DEPLOY.md`).
  - As 3 migrações rodaram; o deploy passou no healthcheck. O banco está **vazio** (sem academia nem usuário).
- Acesso do Claude: o ambiente de nuvem libera `console.neon.tech` e `backboard.railway.com`; tokens nas variáveis do ambiente `NEON_API_KEY` (escopo do projeto) e `RAILWAY_TOKEN` (*Project Token*, cabeçalho `Project-Access-Token` na API GraphQL). O ambiente **não** alcança o PostgreSQL da Neon (sem DNS/porta 5432) nem o endereço público da Railway.

### Pendente (nesta ordem)
1. **Criar a academia e o primeiro gestor. Aguardando o dono enviar: nome da academia, nome do gestor e e-mail do gestor.** Como fazer daqui (sem acesso direto ao banco): criar na Railway as variáveis `ACADEMIA_NOME`, `GESTOR_NOME`, `GESTOR_EMAIL`; trocar o pre-deploy, por um deploy, para `node dist/db/migrar.js && node dist/db/nova-academia.js`; conferir no log "Academia criada"; **voltar o pre-deploy** para só a migração e apagar as 3 variáveis (o script não é idempotente: rodar de novo duplica a academia).
2. **Senha do gestor:** ele usa "Esqueci minha senha". Sem `RESEND_API_KEY` o e-mail só sai no log da Railway; pegar o link lá e entregar ao dono.
3. **Conferir no navegador** (pelo dono, o ambiente do Claude não abre o site): tela de login, entrar como gestor, cadastrar um plano e um aluno.
4. **Backup:** segredos `BACKUP_*` no GitHub (o `BACKUP_DATABASE_URL` usa `redshield_backup` e o host **direto**), bucket S3-compatível (Cloudflare R2 ou Backblaze B2) e a senha de criptografia guardada pelo dono fora do GitHub. Depois, rodar o fluxo *Backup do banco* manualmente e ver a restauração passar. Até lá ele falha todo dia (esperado).
5. **E-mail (Resend):** depende de domínio próprio verificado (pendência V1: nome/INPI/domínio). Depois, `RESEND_API_KEY` e `EMAIL_REMETENTE` na Railway.
6. **Monitoramento:** UptimeRobot apontando para `/saude`.
7. **Ao terminar a configuração:** o dono apaga os tokens (`NEON_API_KEY`, `RAILWAY_TOKEN`) nas contas e nas variáveis do ambiente.
8. Menores: o aviso do `pg` sobre `sslmode=require` (será tratado como `verify-full` hoje; mudar a URL para `sslmode=verify-full` mantém o comportamento quando o `pg` 9 sair); migrar a configuração da Railway para `.railway/railway.ts` se quisermos ela de volta no código.

## Falta

**Depende de você (contas e decisões)**
- [ ] Criar os projetos **novos** na Neon e na Railway e preencher variáveis/segredos (passo a passo em `DEPLOY.md`). Nada disso foi executado: o `Dockerfile`, o `railway.json` e os fluxos de CI/backup **nunca rodaram** (sem Docker nem `pg_dump` no ambiente de desenvolvimento). Confira o primeiro CI e rode o backup manualmente (*Run workflow*) para ver o teste de restauração passar.
- [ ] Conta no Resend com domínio verificado (SPF/DKIM/DMARC), UptimeRobot e, opcionalmente, Sentry.
- [ ] **V1**: nome/INPI/domínio; retirar `referencia_visual_conceitual.png` do repositório antes de divulgar.
- [ ] Revisão jurídica da política de privacidade e página/link dela dentro do sistema.
- [ ] Decisões abertas: **E1** (regra de graduação), E8 (check-in offline), E9 (quais avisos ligar), E11 (cancelamento), E14 (criança/sem celular), E16 (prazo do check-in), E17 (manter "justificado"), V1–V6.

**Front**
- [ ] Equipe: a API não lista nem convida professor/gestor (hoje só por `npm run nova-academia`). Decidir se entra na v1.
- [ ] Página ou link da política de privacidade dentro do sistema (depois da revisão jurídica).

**Depois do front**
- [ ] Teste de ponta a ponta no navegador, piloto em paralelo à planilha e go-live (ROADMAP, fases 9 e 10).

## Feito (front, `feat/front-api`)

| Área | O que existe | Onde |
|---|---|---|
| Base | Cliente da API (mesma origem, cookie), erros da API viram mensagem pronta; TanStack Query; `Carregando`/`ErroCarga`; conversão reais ↔ centavos só na borda; proxy do Vite para a API local; Vitest no front e no CI | `app/src/lib/`, `app/src/api/` |
| Login | Entrar, sair, sessão mantida ao recarregar; esqueci a senha; criar/redefinir senha pelo link do e-mail (`#/redefinir-senha?token=`, serve também para o convite) | `app/auth.tsx`, `pages/Entrar.tsx`, `pages/RedefinirSenha.tsx` |
| Cadastros | Planos; alunos com turmas (defeito 1), plano, consentimento LGPD e uso de imagem; ficha com presenças de 90 dias e cobranças; convite de acesso ao aluno | `pages/Planos.tsx`, `pages/Alunos.tsx`, `pages/AlunoDetalhe.tsx` |
| Presença | Check-in com a data do servidor; lista da aula pelo vínculo aluno-turma; correção do professor (otimista); cancelar e reativar aula; sem "fechar chamada" (defeito 10) | `pages/Checkin.tsx`, `pages/Presenca.tsx`, `pages/Agenda.tsx` |
| Financeiro | Lançamentos e categorias; aba Mensalidades: gerar cobranças do mês, dar baixa, desfazer, cancelar | `pages/Financeiro.tsx`, `pages/financeiro/` |
| Painel e Progresso | Métricas do servidor (defeito 9); versão do aluno só com os dados dele (defeito 8); registrar graduação a partir dos elegíveis | `pages/Painel.tsx`, `pages/painel/`, `pages/Progresso.tsx`, `pages/progresso/` |
| Configurações | Dados da academia (gestor edita), avisos automáticos, troca da própria senha | `pages/Configuracoes.tsx` |
| Importação e LGPD | Importar alunos por CSV (conferir sem gravar → confirmar; lê UTF-8 e o CSV do Excel em Windows-1252; modelo para baixar); na ficha, baixar os dados do aluno e anonimizar com a palavra ANONIMIZAR, ficha travada depois. Só gestor | `pages/alunos/ImportarAlunos.tsx`, `pages/alunos/DadosPessoais.tsx` |
| Servidor | `GET /eu/presencas`: o aluno lê o próprio histórico (com teste de isolamento); `anonimizado` no cadastro do aluno | `server/src/rotas/alunos.ts` |
| Servidor | `WEB_DIST` relativo (como no `.env.example`) derrubava a API ao subir; agora é resolvido para caminho absoluto. Verificado: API servindo o build do front na mesma origem, com a CSP de produção e os gráficos | `server/src/config.ts` |

- `mock.ts`, `selectors.ts` e `store.tsx` foram apagados. O protótipo com dados simulados ficou congelado na branch **`prototipo`**, e o GitHub Pages passou a publicar só ela.
- A branch `prototipo` foi liberada no ambiente `github-pages` e publicou com sucesso em 2026-11-03.
- Backup: os scripts de `scripts/` estavam sem permissão de execução no Git, e o backup diário falhava com *Permission denied* desde que entrou na `main`. Corrigido, e o fluxo não engole mais a falha do `pg_dump`. Backup e restauração testados localmente (PG 16, banco com seed). Continua falhando todo dia até os segredos `BACKUP_*` existirem: é o esperado.

## Pontos de atenção

- Check-in **não** aplica a capacidade da aula (decisão não tomada).
- `GET /planos` também é lido pelo professor (o contrato original só previa o gestor).
- Nos esquemas zod de PATCH **não** pode haver `.default()` (zod 4 aplica o default dentro de `.partial()`). Defaults no insert com `??`.
- Anonimizar não tem volta e mantém cobranças/lançamentos pagos por obrigação fiscal; confirme o prazo de guarda com o contador.
- O seed (`npm run seed`) cria categorias financeiras padrão só pelo CLI; `semear()` em si não as cria (um teste cria "Aluguel" e espera 201).
- A importação grava consentimento LGPD **somente** se o gestor informar `consentimentoPor`; sem isso o cadastro fica sem consentimento registrado.
- Regra provisória de graduação (E1): o próximo passo depois da branca com 4 graus é **cinza** (ordem das faixas infantis), também para adultos. A tela mostra o que a API sugere; rever junto com E1.
- A cobrança de um aluno matriculado depois do dia de vencimento vence no mês seguinte (regra do servidor, de propósito). Na aba Mensalidades isso aparece como cobrança de outubro com vencimento em novembro.
