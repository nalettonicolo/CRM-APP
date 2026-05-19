#!/usr/bin/env bash
# Verifica SMTP sul server Mint (dalla cartella backend con .env caricato).
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -f .env ]]; then set -a; source .env; set +a; fi
TO="${1:-${SMTP_USER:-${NOTIFY_EMAIL:-}}}"
if [[ -z "$TO" ]]; then
  echo "Uso: $0 email@destinazione"
  echo "Oppure imposta SMTP_USER / NOTIFY_EMAIL in backend/.env"
  exit 1
fi
node --import tsx -e "
import { verifySmtpConnection, sendEmail, emailTemplate } from './src/services/email.ts';
import { getSmtpConfig, isSmtpConfigured } from './src/services/smtpConfig.ts';
const smtp = await getSmtpConfig();
if (!isSmtpConfigured(smtp)) {
  console.error('SMTP non configurato: Impostazioni CRM oppure SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
  process.exit(1);
}
await verifySmtpConnection();
const r = await sendEmail({
  to: process.argv[1],
  subject: 'Test CRM Nicolò Service',
  html: emailTemplate('Test', '<p>Invio OK dal server Mint.</p>', smtp.fromName),
});
console.log(r.mock ? 'Mock (nessun invio reale)' : 'Email inviata a ' + process.argv[1]);
" "$TO"
