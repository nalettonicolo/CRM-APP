-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 2 — Esegui connesso al database "crm_gestionale" (non "postgres")
-- In pgAdmin: tasto destro su crm_gestionale → Query Tool → incolla ed esegui
-- ═══════════════════════════════════════════════════════════════════════════

GRANT ALL ON SCHEMA public TO crm_user;
GRANT CREATE ON SCHEMA public TO crm_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO crm_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO crm_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO crm_user;
