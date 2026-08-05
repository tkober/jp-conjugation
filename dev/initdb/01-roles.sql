-- Local development only: create the two roles the backend expects, with
-- throwaway passwords matching compose.yaml. Runs once, on the first start of
-- an empty postgres volume (docker-entrypoint-initdb.d), connected to the
-- POSTGRES_DB database as the superuser.
--
-- The production equivalent (against the shared postgres-core instance) is
-- dbeaver/create_users_and_db.sql + dbeaver/grant_privileges.sql.

CREATE ROLE conjugation_owner WITH LOGIN PASSWORD 'conjugation';
CREATE ROLE conjugation_app WITH LOGIN PASSWORD 'conjugation';

ALTER DATABASE conjugation OWNER TO conjugation_owner;
GRANT CONNECT ON DATABASE conjugation TO conjugation_app;

ALTER SCHEMA public OWNER TO conjugation_owner;
GRANT USAGE ON SCHEMA public TO conjugation_app;

-- The app role never runs DDL; it inherits access to the tables the owner
-- creates at startup from these default privileges.
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
