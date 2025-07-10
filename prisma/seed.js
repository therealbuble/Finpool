import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.create({
    data: {
      clerkUserId: 'user_YOUR_REAL_ID',
      email: 'demo@example.com',
    },
  });
  console.log('✅ Seeded: Demo user created.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
