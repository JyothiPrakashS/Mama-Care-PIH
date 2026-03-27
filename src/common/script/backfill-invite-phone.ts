import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function backfill() {
  console.log('Backfill started...');

  const tenants = await prisma.$queryRaw<Array<{ id: string; code: string }>>`
    SELECT id, code
    FROM "Tenant"
    WHERE "inviteCode" IS NULL
  `;

  for (const tenant of tenants) {
    const generatedInviteCode = `INV-${tenant.code}-${randomUUID().slice(0, 6)}`;
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { inviteCode: generatedInviteCode },
    });
    console.log(`Updated tenant inviteCode: ${tenant.code}`);
  }

  const users = await prisma.$queryRaw<Array<{ id: string; email: string }>>`
    SELECT id, email
    FROM "User"
    WHERE phone IS NULL
  `;

  for (const user of users) {
    const generatedPhone = `9000${user.id.replace(/-/g, '').slice(0, 6)}`;
    await prisma.user.update({
      where: { id: user.id },
      data: { phone: generatedPhone },
    });
    console.log(`Updated user phone: ${user.email}`);
  }

  console.log('Backfill completed ✅');
}

backfill()
  .catch((err) => {
    console.error('Backfill failed ❌', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });