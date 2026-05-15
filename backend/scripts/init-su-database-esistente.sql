-- Esegui su "Nicolò Service" (Query Tool con QUEL database selezionato)
-- Serve solo se usi l'utente crm_user. Se usi postgres, puoi saltare questo file.

GRANT ALL ON SCHEMA public TO crm_user;
GRANT CREATE ON SCHEMA public TO crm_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO crm_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO crm_user;
