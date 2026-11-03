#!/usr/bin/env bash
# Prova que uma cópia abre: descriptografa e restaura num PostgreSQL VAZIO e confere se há dados.
#   ARQUIVO              cópia gerada por backup.sh
#   BACKUP_PASSPHRASE    senha da criptografia
#   RESTORE_DATABASE_URL banco vazio e descartável (NUNCA o de produção)
set -euo pipefail
: "${ARQUIVO:?defina ARQUIVO}"
: "${BACKUP_PASSPHRASE:?defina BACKUP_PASSPHRASE}"
: "${RESTORE_DATABASE_URL:?defina RESTORE_DATABASE_URL}"
umask 077
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass env:BACKUP_PASSPHRASE -in "$ARQUIVO" -out "$TMP"
pg_restore --no-owner --no-privileges --exit-on-error --dbname "$RESTORE_DATABASE_URL" "$TMP"
PSQL=(psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -tA)
"${PSQL[@]}" -c "select 'academias=' || count(*) from academia"
"${PSQL[@]}" -c "select 'migracoes=' || count(*) from schema_migracao"
test "$("${PSQL[@]}" -c 'select count(*) from academia')" -ge 1
echo "Restauração conferida."
