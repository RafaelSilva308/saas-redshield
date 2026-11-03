# Passo a passo para colocar no ar

O código está pronto para isto; o que falta são **contas e segredos**, que só o dono do produto cria. Nada abaixo deve ser commitado: segredos vão nas variáveis do Railway e nos *Secrets* do GitHub.

## 1. Banco (Neon)
1. Criar um projeto **novo** na Neon (nunca reutilizar o de outro sistema). Região mais próxima (São Paulo, se disponível).
2. No SQL Editor, rodar `db/papeis.sql` trocando as senhas e o nome do banco. Anote as 3 URLs de conexão.

## 2. Aplicação (Railway)
1. Novo projeto → *Deploy from GitHub repo*. O build usa o `Dockerfile` da raiz.
   - **A Railway ignora o `railway.json`** (o *config as code* foi descontinuado em favor de `.railway/railway.ts`; visto em 2026-11-03). Configure no serviço: *Pre-deploy command* `node dist/db/migrar.js`, *Healthcheck path* `/saude` (60 s), reinício *On failure*. Sem o pre-deploy, a API sobe sem tabelas (`relation "academia" does not exist`).
   - **Região:** a Railway não tem região no Brasil. Usamos `us-east4` (Virgínia), a mais próxima do banco em São Paulo. A região padrão (Califórnia) dobra o atraso de cada consulta.
2. Variáveis:
   - `DATABASE_URL` = papel `redshield_app`, conexão **com pool** (host com `-pooler`)
   - `MIGRATION_DATABASE_URL` = papel `redshield_migracao`, conexão **direta** (host sem `-pooler`): a migração usa `pg_advisory_lock`, que não funciona atrás do pool em modo transação
   - As duas com `?sslmode=require`. O `BACKUP_DATABASE_URL` (passo 3) também usa a conexão direta.
   - `URL_PUBLICA` = endereço público (https)
   - `RESEND_API_KEY`, `EMAIL_REMETENTE` (domínio verificado no Resend)
   - `ROTINAS=1` em **uma** instância só; `HORA_DOS_AVISOS=8`
3. Primeira academia (uma vez, no terminal do Railway ou local com a URL de migração):
   `ACADEMIA_NOME=... GESTOR_NOME=... GESTOR_EMAIL=... npm run nova-academia` (dentro de `server/`). O gestor define a senha em "Esqueci a senha".

## 3. Backup
No GitHub → Settings → Secrets: `BACKUP_DATABASE_URL` (papel `redshield_backup`), `BACKUP_PASSPHRASE`, `BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`. O fluxo `.github/workflows/backup.yml` roda todo dia e **testa a restauração**. Guarde a senha de criptografia também num gerenciador de senhas.

## 4. Monitoramento
Criar conta no UptimeRobot (ou similar) apontando para `https://<seu-endereço>/saude`. Sentry é opcional.

## 5. Antes de abrir para alunos
- Resolver V1 (nome/INPI/domínio) e retirar `referencia_visual_conceitual.png` do repositório.
- Publicar a política de privacidade (`POLITICA_DE_PRIVACIDADE.md`, revisada por advogado).
- Ligar o front à API (ver `PROGRESSO.md`).
