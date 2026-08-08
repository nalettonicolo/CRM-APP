-- Sul Mint (terminal): sudo -u postgres psql -f create-impianti-elettrici-database-on-server.sql

CREATE DATABASE crm_impianti_elettrici
  OWNER postgres
  ENCODING 'UTF8'
  LC_COLLATE 'it_IT.UTF-8'
  LC_CTYPE 'it_IT.UTF-8'
  TEMPLATE template0;

COMMENT ON DATABASE crm_impianti_elettrici IS
  'Impianti Elettrici — database parallelo (schema identico al CRM, dati separati)';
