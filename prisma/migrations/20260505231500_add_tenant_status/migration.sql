-- Add tenant lifecycle status used by auth and tenant management.
ALTER TABLE "Tenant"
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- Preserve inactive tenants from the previous isActive-based schema.
UPDATE "Tenant"
SET "status" = 'INACTIVE'
WHERE "isActive" = false;
