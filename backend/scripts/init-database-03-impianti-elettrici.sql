-- Database separato per Impianti Elettrici (stesso schema Prisma, dati isolati)
-- Esegui su database "postgres" (come init-database-02-database.sql)

CREATE DATABASE crm_impianti_elettrici OWNER crm_user ENCODING 'UTF8';

COMMENT ON DATABASE crm_impianti_elettrici IS
  'Impianti Elettrici — gestionale parallelo (stesse tabelle, dati separati dal CRM)';
