-- Papéis de banco com o mínimo de privilégio. Rode UMA vez como dono do banco (na Neon: pelo SQL Editor),
-- trocando as senhas de exemplo por senhas geradas. Nunca versione as senhas reais.
--
--   redshield_migracao : dono do schema; só é usado pelo passo de migração (MIGRATION_DATABASE_URL)
--   redshield_app      : o que a API usa em produção (DATABASE_URL); sem DDL
--   redshield_backup   : somente leitura, para o pg_dump (BACKUP_DATABASE_URL)

create role redshield_migracao login password 'TROQUE-ESTA-SENHA' ;
create role redshield_app      login password 'TROQUE-ESTA-SENHA' ;
create role redshield_backup   login password 'TROQUE-ESTA-SENHA' ;

grant connect on database neondb to redshield_migracao, redshield_app, redshield_backup; -- ajuste o nome do banco
grant create, usage on schema public to redshield_migracao;
grant usage on schema public to redshield_app, redshield_backup;

-- O que a migração criar passa a valer para os outros papéis automaticamente.
-- No PostgreSQL 16, quem criou o papel não é membro dele, e sem isso o ALTER DEFAULT PRIVILEGES abaixo
-- falha com "permission denied to change default privileges" (visto na Neon em 2026-11-03).
grant redshield_migracao to current_user;
alter default privileges for role redshield_migracao in schema public
  grant select, insert, update, delete on tables to redshield_app;
alter default privileges for role redshield_migracao in schema public
  grant usage, select on sequences to redshield_app;
alter default privileges for role redshield_migracao in schema public
  grant select on tables to redshield_backup;
alter default privileges for role redshield_migracao in schema public
  grant select on sequences to redshield_backup;

-- Tabelas que já existem (criadas por outro papel) precisam de concessão direta:
grant select, insert, update, delete on all tables in schema public to redshield_app;
grant usage, select on all sequences in schema public to redshield_app;
grant select on all tables in schema public to redshield_backup;
grant select on all sequences in schema public to redshield_backup;
