#!/usr/bin/env bash
# Gera uma cópia criptografada do banco. Nada aqui contém segredo: tudo vem de variáveis de ambiente.
#   BACKUP_DATABASE_URL  conexão somente-leitura com o banco (papel redshield_backup, ver db/papeis.sql)
#   BACKUP_PASSPHRASE    senha da criptografia (guarde também fora do GitHub: sem ela a cópia não abre)
#   SAIDA                arquivo de saída (padrão: backups/redshield-AAAAMMDD-HHMMSS.dump.enc)
set -euo pipefail
: "${BACKUP_DATABASE_URL:?defina BACKUP_DATABASE_URL}"
: "${BACKUP_PASSPHRASE:?defina BACKUP_PASSPHRASE}"
SAIDA="${SAIDA:-backups/redshield-$(date -u +%Y%m%d-%H%M%S).dump.enc}"
mkdir -p "$(dirname "$SAIDA")"
umask 077
pg_dump --format=custom --no-owner --no-privileges "$BACKUP_DATABASE_URL" \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -pass env:BACKUP_PASSPHRASE -out "$SAIDA"
echo "$SAIDA"
