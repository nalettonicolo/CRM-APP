-- Sul Mint (terminal): sudo -u postgres psql -f create-crm-database.sql
-- Oppure psql come postgres

CREATE DATABASE crm_gestionale
  OWNER postgres
  ENCODING 'UTF8'
  LC_COLLATE 'it_IT.UTF-8'
  LC_CTYPE 'it_IT.UTF-8'
  TEMPLATE template0;

COMMENT ON DATABASE crm_gestionale IS 'NexusCRM — gestionale SaaS';
