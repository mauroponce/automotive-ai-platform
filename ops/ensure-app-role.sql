SELECT format('CREATE ROLE automotive_app LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'automotive_app')
\gexec

SELECT format('ALTER ROLE automotive_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'app_password')
\gexec

GRANT CONNECT ON DATABASE :"app_database" TO automotive_app;
GRANT USAGE ON SCHEMA public TO automotive_app;
