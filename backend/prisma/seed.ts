import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminEmail = 'admin@infinos.local';
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'INFINOS@Admin2026!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'INFINOS Admin',
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      name: 'INFINOS Admin',
      email: adminEmail,
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log(`Seeded development admin user: ${adminUser.email} (ID: ${adminUser.id})`);
}

main()
  .catch((e) => {
    console.error('Failed to seed database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
