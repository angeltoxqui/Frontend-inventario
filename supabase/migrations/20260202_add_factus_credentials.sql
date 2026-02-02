-- Migration: add_factus_credentials.sql
-- Purpose: Add Factus credential columns to tenants table
-- Date: 2026-02-02
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS factus_client_id text,
    ADD COLUMN IF NOT EXISTS factus_password text,
    ADD COLUMN IF NOT EXISTS factus_secret text,
    ADD COLUMN IF NOT EXISTS factus_email text;
COMMENT ON COLUMN public.tenants.factus_client_id IS 'Factus Client ID for electronic invoicing';
COMMENT ON COLUMN public.tenants.factus_password IS 'Factus Password for electronic invoicing';
COMMENT ON COLUMN public.tenants.factus_secret IS 'Factus Secret Key for electronic invoicing';
COMMENT ON COLUMN public.tenants.factus_email IS 'Email registered with Factus';