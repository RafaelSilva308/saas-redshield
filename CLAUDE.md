# CLAUDE.md — contexto do projeto para sessões futuras

Sistema de gestão da academia **REDSHIELD** (jiu-jitsu). **Front-end com dados simulados (`app/`) + API completa para a v1 (`server/`, Fastify + PostgreSQL, 80 testes), ainda não ligada ao front.** Não há deploy feito (só `Dockerfile`/`railway.json`/CI/backup escritos, nunca executados); veja `PROGRESSO.md` e `DEPLOY.md`.
Idioma do produto, dos documentos e dos commits: **português do Brasil**.

## Leia nesta ordem

0. [`PROGRESSO.md`](./PROGRESSO.md): **o que já foi feito e o que falta** no back-end (atualizar ao fim de cada sessão).
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

## O que o protótipo faz e o que NÃO faz

- Estado **em memória** (`app/src/app/store.tsx`): recarregar a página apaga tudo. Só a sessão de login fica no `localStorage`.
- Trocar de usuário (Sair → entrar) **não** recarrega a página, então o estado se mantém. Útil para demonstrar aluno → professor.
- `selectors.ts` lê dados simulados **fixos**, não o estado: o Painel e o campo "% em 30d" **não** reagem a check-ins. Isso some quando as métricas vierem do servidor.
- O modelo antigo de chamada fechada pelo professor (`fecharChamada`, `chamada.fechada`, defeito 10) foi removido do front. Não recriar.
- O login só confere o e-mail. **Não é segurança.** A guarda por papel (`ExigePapel`) é só navegação.
- Valores em **reais** no front; no banco são **centavos** (`integer`). A conversão é na camada de API.

## Infraestrutura decidida

- **Neon** (PostgreSQL, hoje no plano gratuito) + **Fastify na Railway** (plano de US$ 5, já assinado) + **Resend** para e-mail. O front será **servido pela própria API** (mesma origem).
- A autorização fica **em código na API**, não em políticas de banco. A autenticação é própria (Argon2id, sessão `httpOnly`).
- **Não usar a Vercel em produção:** o plano gratuito proíbe uso comercial. Criar projetos **novos e isolados** na Neon e na Railway; nunca compartilhar banco com outro sistema.
- O plano gratuito da Neon **não tem backup**: o `pg_dump` agendado e testado é obrigatório. Detalhes, limites e custos em `ROADMAP.md`, seção 4.

## Nome e marca

- Nome do produto e da academia: **REDSHIELD** (em texto corrido e na interface). Arquivos e pastas em minúsculas: `redshield_*`, pacote `redshield-app`.
- Demonstração: e-mails `@redshield.com.br` (fictícios), chave de sessão `redshield.sessao` no `localStorage`.
- A pasta `app/` e `db/` não levam o nome da marca de propósito (são papéis, não marca).
- **O nome do repositório no GitHub** não pode ser alterado por uma sessão do Claude (as ferramentas não renomeiam repositório). Se ainda for `saas-gb`, renomeie em *Settings → General → Repository name*.

## Rodar, verificar, publicar

```bash
cd app && npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build
npx oxlint         # lint (restam avisos antigos de react/only-export-components e set-state-in-effect)
```

- Demonstração: `gestor@redshield.com.br`, `professor@redshield.com.br`, `aluno@redshield.com.br`; senha `treino123`. As linhas em "Acessos de demonstração" preenchem o formulário.
- O aluno de demonstração é `al1` (Pedro Almeida). O quadro simulado **não tem aulas aos domingos**; nesse dia o check-in mostra "Sem aula hoje".
- Deploy: GitHub Actions (`.github/workflows/deploy.yml`) publica no **GitHub Pages** a cada push na `main`. `HashRouter` e `base: './'` por causa da hospedagem estática.
- Banco: para validar o schema, `psql` num PostgreSQL 15+ vazio: `psql -v ON_ERROR_STOP=1 -f db/schema.sql`. Há um PostgreSQL 16 instalado no ambiente de nuvem (cluster desligado por padrão).

## Convenções do código

- React 19 + TypeScript estrito + Vite + Tailwind v4 + React Router (HashRouter). Nomes de domínio em português (`aluno`, `chamada`, `presenca`, `cobranca`).
- Tokens de marca em `app/src/index.css` (`rs-red`, `rs-blue`, `rs-ink`…; prefixo `rs-` de REDSHIELD). **Nenhum estado depende só de cor**: todo badge tem rótulo.
- Um botão primário (vermelho) por tela. Evite novas cores e novos componentes se já existe um em `components/ui/`.
- Toda mutação passa por `store.tsx`; cada função ali corresponde a um endpoint futuro. Páginas não escrevem em `mock.ts`.
- A data de "hoje" usa fuso **local** (`hojeISO()` em `lib/format.ts`). Não use `toISOString().slice(0,10)`: vira o dia às 21h em Brasília.

## Pendências críticas antes de qualquer lançamento

- **V1: nome e identidade.** O nome REDSHIELD está adotado em todo o sistema, mas **não foi verificado** (INPI, domínio). Cores, tipografia e símbolo são provisórios; `referencia_visual_conceitual.png` traz símbolo e fotos que **não** são do REDSHIELD e deve sair do repositório antes de divulgar.
- Painel do aluno ainda mostra dados da academia inteira, inclusive nomes e frequência de outros alunos (defeito 8). Resolver antes de ter login de aluno real.
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
