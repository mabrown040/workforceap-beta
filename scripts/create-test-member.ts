import { PrismaClient, PipelineBoardStage } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const state = args[0]?.toUpperCase() || 'A';
  const email = args[1] || `test-${randomBytes(4).toString('hex')}@workforceap.org`;
  const name = args[2] || 'Test Member';

  console.log(`Creating test member: ${name} (${email}) in state ${state}...`);
  
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error('No organization found in DB');

  // 1. Create User
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      fullName: name,
      organizationId: org.id,
      enrolledProgram: state !== 'A' ? 'medical-assistant' : null,
      enrolledAt: state !== 'A' ? new Date() : null,
      assessmentCompleted: ['B', 'C', 'D'].includes(state),
      assessmentCompletedAt: ['B', 'C', 'D'].includes(state) ? new Date() : null,
      coursesCompleted: state === 'D' ? ['medical-terminology', 'anatomy-physiology', 'clinical-procedures', 'electronic-health-records'] : [],
    },
  });

  // Ensure 'member' role exists and assign it
  const memberRole = await prisma.role.upsert({
    where: { name: 'member' },
    update: {},
    create: { name: 'member' },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: memberRole.id } },
    update: {},
    create: { userId: user.id, roleId: memberRole.id },
  });

  // 2. Create Profile
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      city: 'Fresno',
      state: 'CA',
      zip: '93701',
      dob: new Date('1995-01-01'),
      profilePhone: '555-0101',
    },
  });

  // 3. Create Application (if state > A)
  if (state !== 'A') {
    await prisma.application.create({
      data: {
        userId: user.id,
        status: 'APPROVED',
        programInterest: 'medical-assistant',
        submittedAt: new Date(),
      },
    });
  }

  console.log(`✅ Success! Created member ID: ${user.id}`);
  console.log(`Login: ${email} / (Any password if dev auth is enabled)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
