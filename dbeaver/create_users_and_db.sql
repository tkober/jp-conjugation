-- One-off bootstrap for the conjugation database on a shared Postgres server.
-- Run as the postgres superuser, substituting the ${...} placeholders with the
-- values from the deployment's .env:
--
--   docker exec -i postgres-core psql -U postgres < create_users_and_db.sql
--
-- Then run grant_privileges.sql against the new database.

-- Create Roles
CREATE ROLE conjugation_owner
  WITH LOGIN
  PASSWORD '${DB_OWNER_PASSWORD}';

CREATE ROLE conjugation_app
  WITH LOGIN
  PASSWORD '${DB_PASSWORD}';

-- Create Database
CREATE DATABASE conjugation
  OWNER conjugation_owner;

-- Allow app user to connect
GRANT CONNECT ON DATABASE conjugation
  TO conjugation_app;
