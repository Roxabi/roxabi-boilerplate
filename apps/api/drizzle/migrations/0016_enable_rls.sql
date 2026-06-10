-- Enable Row Level Security on tenant-scoped tables
-- Safe to re-run: each block is idempotent via exception handling
--
-- NOTE: Only api_keys and roles currently have tenant_id. Other tables
-- (members, organizations, audit_logs, system_settings) will get RLS
-- policies in P2 when tenant_id is added.

-- api_keys (has tenant_id)
DO $$
BEGIN
  PERFORM create_tenant_rls_policy('api_keys');
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'api_keys RLS setup skipped: %', SQLERRM;
END
$$;

-- roles (has tenant_id)
DO $$
BEGIN
  PERFORM create_tenant_rls_policy('roles');
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'roles RLS setup skipped: %', SQLERRM;
END
$$;
