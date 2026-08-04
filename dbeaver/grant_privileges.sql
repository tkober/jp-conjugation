-- Run against the conjugation database (NOT postgres) after
-- create_users_and_db.sql:
--
--   docker exec -i postgres-core psql -U postgres -d conjugation < grant_privileges.sql
--
-- The tables themselves are created by the backend on startup, connecting as
-- conjugation_owner. The app role never runs DDL — its access to those tables
-- comes from the default privileges below, so the backend issues no GRANT.

ALTER SCHEMA public OWNER TO conjugation_owner;

GRANT USAGE ON SCHEMA public
  TO conjugation_app;

ALTER DEFAULT PRIVILEGES
  FOR ROLE conjugation_owner
  IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLES
  TO conjugation_app;

ALTER DEFAULT PRIVILEGES
  FOR ROLE conjugation_owner
  IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE
  ON SEQUENCES
  TO conjugation_app;
