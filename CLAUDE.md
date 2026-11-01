# CLAUDE.md — contexto do projeto para sessões futuras

Sistema de gestão da academia **REDSHIELD** (jiu-jitsu). **Front (`app/`, React) ligado à API (`server/`, Fastify + PostgreSQL, 81 testes).** O protótipo com dados simulados ficou congelado na branch `prototipo`. Não há deploy feito (só `Dockerfile`/`railway.json`/CI/backup escritos, nunca executados); veja `PROGRESSO.md` e `DEPLOY.md`.
Idioma do produto, dos documentos e dos commits: **português do Brasil**.

## Leia nesta ordem

0. [`PROGRESSO.md`](./PROGRESSO.md): **o que já foi feito e o que falta** (atualizar ao fim de cada sessão).
1. [`ROADMAP.md`](./ROADMAP.md): **fonte de verdade.** Decisões de produto já tomadas (D1–D7), pendências (V = dono do produto, E = academia), ordem de execução em 10 fases, infraestrutura e custos, riscos.
2. [`BANCO_DE_DADOS.md`](./BANCO_DE_DADOS.md) + [`db/schema.sql`](./db/schema.sql): modelo PostgreSQL, **testado** em PG 16.
3. [`ROTEIRO_DEMONSTRACAO.md`](./ROTEIRO_DEMONSTRACAO.md): sessão de validação com o professor (versão de 15 e de 35 minutos).
4. [`PLANO_DESENVOLVIMENTO.md`](./PLANO_DESENVOLVIMENTO.md): visão de produto original e contrato de API. **Onde divergir do ROADMAP, vale o ROADMAP.**

## Decisões de produto que não são detalhe de implementação

Mudar uma delas é decisão do dono do produto. Estão detalhadas no `ROADMAP.md`.

- **Não existe chamada feita pelo professor.** O **aluno** faz check-in na aula do dia, pelo celular; vale na hora, sem confirmação.
- **Quem não faz check-in tem falta.** A falta **não é gravada**: é a ausência da linha em `presenca`, calculada nas views.
- O **professor edita livremente** (presente/falta, e justificado se mantido). A correção prevalece sobre o check-in e é auditada.
- O **aluno tem login na v1**: Painel, Agenda, Progresso, Check-in.
- Risco de fraude no check-in **aceito** na v1. Não adicionar janela de horário, QR, geolocalização ou confirmação sem o dono pedir.
- **Módulo Comunicados foi removido** por decisão do dono. Não recriar. (Os "Avisos automáticos" de Configurações são e-mails de cobrança, outra coisa.)

## Como o front fala com a API

- Todos os dados vêm da API. `app/src/lib/api.ts` faz as chamadas (mesma origem, cookie `httpOnly` da sessão); `app/src/api/*.ts` tem um hook do TanStack Query por recurso e converte o formato da API para o das telas.
- Valores em **reais** no front; na API e no banco são **centavos**. A conversão é só em `src/api/` (`lib/dinheiro.ts`). Nenhuma tela manda centavos.
- Login real (`app/auth.tsx`): nada de usuário ou token no `localStorage`. Só 401 com código `nao_autenticado` derruba a sessão no front.
- A guarda por papel (`ExigePapel`, links e botões escondidos) é só navegação. **A autorização de verdade é da API.**
- Painel e Progresso têm uma versão da equipe e uma do aluno. A do aluno usa só `/metricas/painel` (que já responde só com os dados dele) e `/eu/presencas` (defeito 8). Não pôr dado de outro aluno nas telas do aluno.
- O modelo antigo de chamada fechada pelo professor (`fecharChamada`, `chamada.fechada`, defeito 10) foi removido. Não recriar.

## Infraestrutura decidida

- **Neon** (PostgreSQL, hoje no plano gratuito) + **Fastify na Railway** (plano de US$ 5, já assinado) + **Resend** para e-mail. O front será **servido pela própria API** (mesma origem).
- A autorização fica **em código na API**, não em políticas de banco. A autenticação é própria (Argon2id, sessão `httpOnly`).
- **Não usar a Vercel em produção:** o plano gratuito proíbe uso comercial. Criar projetos **novos e isolados** na Neon e na Railway; nunca compartilhar banco com outro sistema.
- O plano gratuito da Neon **não tem backup**: o `pg_dump` agendado e testado é obrigatório. Detalhes, limites e custos em `ROADMAP.md`, seção 4.

## Nome e marca

- Nome do produto e da academia: **REDSHIELD** (em texto corrido e na interface). Arquivos e pastas em minúsculas: `redshield_*`, pacote `redshield-app`.
- Demonstração: e-mails `@redshield.com.br` (fictícios), criados pelo `npm run seed` do servidor.
- A pasta `app/` e `db/` não levam o nome da marca de propósito (são papéis, não marca).
- **O nome do repositório no GitHub** não pode ser alterado por uma sessão do Claude (as ferramentas não renomeiam repositório). Se ainda for `saas-gb`, renomeie em *Settings → General → Repository name*.

## Rodar, verificar, publicar

```bash
# 1. API (outro terminal): precisa de PostgreSQL 15+ em DATABASE_URL
cd server && npm run migrar && npm run seed && npm run dev   # http://localhost:3000
# 2. Front
cd app && npm install
npm run dev        # http://localhost:5173; o Vite repassa /api para a API (API_URL, padrão localhost:3000)
npm test           # vitest: cliente da API e conversão de dinheiro
npm run build      # tsc -b && vite build
npx oxlint         # lint (restam 4 avisos antigos de react/only-export-components e set-state-in-effect)
```

- O proxy do Vite usa `changeOrigin: false` de propósito: a API recusa escrita cuja origem não bate com o Host.
- Demonstração (seed): `gestor@redshield.com.br`, `professor@redshield.com.br`, `aluno@redshield.com.br`; senha `treino123`. Os atalhos "Acessos de demonstração" só aparecem em desenvolvimento.
- O aluno de demonstração é Pedro Almeida (turma Fundamentos). Nos dias sem aula da turma dele, o check-in mostra "Sem aula hoje".
- Sem PostgreSQL instalado: o pacote `embedded-postgres` (já em `server/node_modules`, é o que os testes usam) sobe um banco local.
- Produção: a API serve o `app/dist` na mesma origem (`WEB_DIST`). `HashRouter` continua (links de e-mail usam `#/rota`).
- GitHub Pages: publica só a branch **`prototipo`** (protótipo congelado, com dados simulados). A `main` não vai mais para o Pages.
- Banco: para validar o schema, `psql` num PostgreSQL 15+ vazio: `psql -v ON_ERROR_STOP=1 -f db/schema.sql`. Há um PostgreSQL 16 instalado no ambiente de nuvem (cluster desligado por padrão).

## Convenções do código

- React 19 + TypeScript estrito + Vite + Tailwind v4 + React Router (HashRouter). Nomes de domínio em português (`aluno`, `chamada`, `presenca`, `cobranca`).
- Tokens de marca em `app/src/index.css` (`rs-red`, `rs-blue`, `rs-ink`…; prefixo `rs-` de REDSHIELD). **Nenhum estado depende só de cor**: todo badge tem rótulo.
- Um botão primário (vermelho) por tela. Evite novas cores e novos componentes se já existe um em `components/ui/`.
- Toda leitura e escrita passa por um hook de `src/api/`; páginas não chamam `fetch` nem `api` direto. Carregando e erro: `Carregando` e `ErroCarga` (`components/ui/Misc.tsx`).
- Datas que importam (hoje do check-in, presença, cobranças) vêm do servidor, no fuso da academia. No front, `hojeISO()` (`lib/format.ts`) usa o fuso **local**; não use `toISOString().slice(0,10)`: vira o dia às 21h em Brasília.

## Pendências críticas antes de qualquer lançamento

- **V1: nome e identidade.** O nome REDSHIELD está adotado em todo o sistema, mas **não foi verificado** (INPI, domínio). Cores, tipografia e símbolo são provisórios; `referencia_visual_conceitual.png` traz símbolo e fotos que **não** são do REDSHIELD e deve sair do repositório antes de divulgar.
- Todas as pendências E1–E17 dependem de conversa com a academia; ver o roteiro de demonstração.

## Fluxo de trabalho no GitHub

- Desenvolver na branch designada pela sessão, nunca direto na `main`. Não abrir PR sem o usuário pedir.
- Se o PR da branch já foi mergeado, recomece a branch a partir da `main` e trate o trabalho como mudança nova.
- Commits e descrições de PR em português, com o resumo do que mudou e o que foi verificado.

## Back-end (`server/`)

```bash
cd server && npm install && npm test   # PostgreSQL embutido nos testes
npm run migrar && npm run seed && npm run dev   # precisa de DATABASE_URL (ver .env.example)
```

- Rotas em `/api/v1`; autorização por papel e `academia_id` da sessão; erros `{ erro: { codigo, mensagem } }`; dinheiro em centavos.
- Esquemas zod de PATCH **sem `.default()`** (zod 4 aplica o default sob `.partial()`); defaults no insert com `??`.
