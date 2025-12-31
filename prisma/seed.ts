import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin/owner user
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@stitchhub.com' },
    update: {},
    create: {
      email: 'admin@stitchhub.com',
      name: 'Admin User',
      password: adminPassword,
      role: Role.OWNER,
    },
  });

  console.log(`✅ Created admin user: ${admin.email}`);

  // Create sample worker users
  const workerEmails = [
    { email: 'worker1@stitchhub.com', name: 'John Doe' },
    { email: 'worker2@stitchhub.com', name: 'Jane Smith' },
    { email: 'worker3@stitchhub.com', name: 'Mike Johnson' },
  ];

  for (const worker of workerEmails) {
    const workerPassword = await bcrypt.hash('Worker@123', 10);
    const createdWorker = await prisma.user.upsert({
      where: { email: worker.email },
      update: {},
      create: {
        email: worker.email,
        name: worker.name,
        password: workerPassword,
        role: Role.WORKER,
      },
    });

    console.log(`✅ Created worker user: ${createdWorker.email}`);
  }

  console.log('🎉 Database seeding complete!');
  console.log('\n📝 Test Credentials:');
  console.log('   Admin - Email: admin@stitchhub.com, Password: Admin@123');
  console.log('   Worker - Email: worker1@stitchhub.com, Password: Worker@123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
