const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'mabrown040@gmail.com' } });
  if (!user) {
    throw new Error('User not found: mabrown040@gmail.com');
  }

  console.log('User ID:', user.id);
  console.log('Enrolled program:', user.enrolledProgram);

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { userId: user.id },
    orderBy: [{ isPrimary: 'desc' }, { enrolledAt: 'desc' }],
  });
  console.log('Enrollments:', enrollments.length);
  enrollments.forEach(e => console.log('  -', e.programSlug, 'primary:', e.isPrimary));

  const progress = await prisma.courseProgress.findMany({ where: { userId: user.id } });
  console.log('CourseProgress rows:', progress.length);
  progress.forEach(p => console.log('  -', p.courseSlug, p.status, p.percentComplete + '%'));

  const csv = await prisma.courseraCourseProgress.findMany({ where: { userId: user.id } });
  console.log('CourseraCourseProgress rows:', csv.length);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
