-- Create the enum type expected by prisma/schema.prisma.
DO $$ BEGIN
    CREATE TYPE "EntityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Convert existing text lifecycle statuses to the Prisma enum type.
ALTER TABLE "Tenant"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "EntityStatus" USING "status"::"EntityStatus",
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

ALTER TABLE "User"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "EntityStatus" USING "status"::"EntityStatus",
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
