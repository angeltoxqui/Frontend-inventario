-- Test queries for tenants functions/triggers/policies
-- Use these queries to validate helpers and triggers after applying migrations

-- 1) Check functions exist
SELECT proname, prosrc FROM pg_proc WHERE proname IN ('set_updated_at','tenants_block_schema_mutation');

-- 2) Basic sanity: list tenants
SELECT tenant_id, name, created_at, updated_at FROM public.tenants ORDER BY tenant_id LIMIT 10;

-- 3) Test trigger: updating name should update updated_at
-- Run this and observe returned updated_at changed
-- (replace 1 with an existing tenant_id)
BEGIN;
UPDATE public.tenants SET name = name || ' (test)' WHERE tenant_id = 1 RETURNING tenant_id, name, updated_at;
ROLLBACK; -- use ROLLBACK to avoid mutating real data during smoke test

-- 4) Test immutability trigger: attempt to change tenant_id (should raise)
-- This should fail when executed; run inside a transaction
BEGIN;
-- Attempt to set tenant_id -> expected: exception from tenants_block_schema_mutation
UPDATE public.tenants SET tenant_id = tenant_id + 1 WHERE tenant_id = 1;
ROLLBACK;

-- 5) Inspect policies for tenants
SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenants';
