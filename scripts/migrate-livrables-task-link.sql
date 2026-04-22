-- Migration : lier les livrables à la tâche qui les a générés.
-- À lancer une seule fois contre la DB Turso de prod :
--   turso db shell <db-name> < scripts/migrate-livrables-task-link.sql
--
-- SQLite ne supporte pas IF NOT EXISTS sur ALTER TABLE ADD COLUMN.
-- Si la colonne existe déjà, ignorer l'erreur "duplicate column name".

ALTER TABLE livrables ADD COLUMN source_task_id TEXT REFERENCES tasks(id);
ALTER TABLE livrables ADD COLUMN format TEXT;
