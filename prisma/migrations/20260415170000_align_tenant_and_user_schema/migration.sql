-- Align migration history with current Prisma schema without requiring data reset.
-- This makes Tenant soft-delete fields explicit and keeps User.tenantId optional.

-- Add tenant lifecycle columns expected by schema.prisma.
ALTER TABLE "Tenant"
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Make tenant relation optional for SUPER_ADMIN and similar platform-level users.
ALTER TABLE "User"
ALTER COLUMN "tenantId" DROP NOT NULL;

-- Recreate FK with optional-relation behavior.
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_tenantId_fkey";
ALTER TABLE "User"
ADD CONSTRAINT "User_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
