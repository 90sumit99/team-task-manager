const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const adminPassword = await bcrypt.hash('Admin@1234', 12);
  const memberPassword = await bcrypt.hash('Member@1234', 12);

  const admin = await prisma.user.create({
    data: { name: 'Admin User', email: 'admin@demo.com', password: adminPassword, role: 'ADMIN' },
  });

  const member = await prisma.user.create({
    data: { name: 'John Member', email: 'member@demo.com', password: memberPassword, role: 'MEMBER' },
  });

  console.log('✅ Users created');

  // Create projects
  const project1 = await prisma.project.create({
    data: { name: 'Website Redesign', description: 'Redesign the company website with modern UI/UX', ownerId: admin.id },
  });

  const project2 = await prisma.project.create({
    data: { name: 'Mobile App', description: 'Build a cross-platform mobile application', ownerId: admin.id },
  });

  // Add project members
  await prisma.projectMember.createMany({
    data: [
      { projectId: project1.id, userId: admin.id, role: 'ADMIN' },
      { projectId: project1.id, userId: member.id, role: 'MEMBER' },
      { projectId: project2.id, userId: admin.id, role: 'ADMIN' },
      { projectId: project2.id, userId: member.id, role: 'MEMBER' },
    ],
  });

  console.log('✅ Projects and members created');

  // Date helpers
  const now = new Date();
  const tomorrow   = new Date(now.getTime() + 1  * 24 * 60 * 60 * 1000);
  const in3days    = new Date(now.getTime() + 3  * 24 * 60 * 60 * 1000);
  const in7days    = new Date(now.getTime() + 7  * 24 * 60 * 60 * 1000);
  const past5days  = new Date(now.getTime() - 5  * 24 * 60 * 60 * 1000);
  const past2days  = new Date(now.getTime() - 2  * 24 * 60 * 60 * 1000);

  // Create tasks (5 spread across projects)
  const task1 = await prisma.task.create({
    data: {
      title: 'Design homepage wireframes',
      description: 'Create detailed wireframes for the new homepage layout including mobile responsive designs.',
      status: 'TODO',
      priority: 'HIGH',
      projectId: project1.id,
      assigneeId: member.id,
      dueDate: tomorrow,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: 'Implement authentication flow',
      description: 'Build login, register, and JWT token management with refresh token support.',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      projectId: project1.id,
      assigneeId: admin.id,
      dueDate: in3days,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: 'Setup CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment to Railway.',
      status: 'DONE',
      priority: 'LOW',
      projectId: project1.id,
      assigneeId: member.id,
      dueDate: past5days,
    },
  });

  // Task 4: OVERDUE — dueDate in past, status is NOT DONE
  const task4 = await prisma.task.create({
    data: {
      title: 'Fix critical payment bug',
      description: 'Users are unable to complete checkout. This is blocking revenue. Needs immediate attention.',
      status: 'TODO',
      priority: 'HIGH',
      projectId: project2.id,
      assigneeId: member.id,
      dueDate: past2days,  // Overdue!
    },
  });

  const task5 = await prisma.task.create({
    data: {
      title: 'Design mobile app screens',
      description: 'Create Figma designs for all app screens including onboarding, dashboard, and profile.',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      projectId: project2.id,
      assigneeId: admin.id,
      dueDate: in7days,
    },
  });

  console.log('✅ Tasks created');

  // Create comments
  await prisma.comment.createMany({
    data: [
      { content: 'Wireframes are looking great! Just need a few tweaks on the mobile breakpoints.', taskId: task1.id, authorId: admin.id },
      { content: 'I will have the first draft ready by EOD tomorrow.', taskId: task1.id, authorId: member.id },
      { content: 'Working on the JWT refresh token logic now. Should be done by end of day.', taskId: task2.id, authorId: admin.id },
      { content: 'This is critical — customer reported it blocking checkout since yesterday!', taskId: task4.id, authorId: admin.id },
    ],
  });

  console.log('✅ Comments created');
  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Demo Credentials:');
  console.log('  🔑 Admin : admin@demo.com  / Admin@1234');
  console.log('  🔑 Member: member@demo.com / Member@1234');
  console.log('\n📊 Data Summary:');
  console.log('  • 2 users, 2 projects, 5 tasks (1 overdue), 4 comments');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
