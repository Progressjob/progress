import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('==> Clearing all fake vacancies, dummy applications, and non-demo companies...');

  const preservedEmails = [
    'admin@example.com',
    'admin@progressjobs.com',
    'employer@example.com',
    'candidate@example.com',
  ];

  // 1. Delete all applications and job-related interactions
  await prisma.applicationAnswer.deleteMany({});
  await prisma.applicationEvent.deleteMany({});
  await prisma.interview.deleteMany({});
  await prisma.application.deleteMany({});
  await prisma.savedJob.deleteMany({});
  await prisma.jobView.deleteMany({});
  await prisma.jobRevision.deleteMany({});
  await prisma.jobSkill.deleteMany({});
  await prisma.jobScreeningQuestion.deleteMany({});
  await prisma.jobReport.deleteMany({});

  // 2. Delete all jobs
  const deletedJobs = await prisma.job.deleteMany({});
  console.log(`✔ Deleted ${deletedJobs.count} fake job postings.`);

  // 3. Delete non-demo companies (keep demo-technology-plc)
  await prisma.companyVerificationDocument.deleteMany({
    where: { company: { slug: { not: 'demo-technology-plc' } } },
  });
  await prisma.companyMember.deleteMany({
    where: { company: { slug: { not: 'demo-technology-plc' } } },
  });
  const deletedCompanies = await prisma.company.deleteMany({
    where: { slug: { not: 'demo-technology-plc' } },
  });
  console.log(`✔ Deleted ${deletedCompanies.count} fake companies.`);

  // 4. Delete dummy candidate profiles (except candidate@example.com)
  const dummyUsers = await prisma.user.findMany({
    where: {
      email: { notIn: preservedEmails },
    },
    select: { id: true, email: true },
  });

  const dummyUserIds = dummyUsers.map((u) => u.id);

  if (dummyUserIds.length > 0) {
    await prisma.candidateEducation.deleteMany({
      where: { candidate: { userId: { in: dummyUserIds } } },
    });
    await prisma.candidateExperience.deleteMany({
      where: { candidate: { userId: { in: dummyUserIds } } },
    });
    await prisma.candidateSkill.deleteMany({
      where: { candidate: { userId: { in: dummyUserIds } } },
    });
    await prisma.candidateCertification.deleteMany({
      where: { candidate: { userId: { in: dummyUserIds } } },
    });
    await prisma.candidateLanguage.deleteMany({
      where: { candidate: { userId: { in: dummyUserIds } } },
    });
    await prisma.candidateResume.deleteMany({
      where: { candidate: { userId: { in: dummyUserIds } } },
    });
    await prisma.candidateProfile.deleteMany({
      where: { userId: { in: dummyUserIds } },
    });

    await prisma.notification.deleteMany({ where: { userId: { in: dummyUserIds } } });
    await prisma.notificationPreference.deleteMany({
      where: { userId: { in: dummyUserIds } },
    });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: dummyUserIds } } });
    await prisma.passwordResetToken.deleteMany({
      where: { userId: { in: dummyUserIds } },
    });
    await prisma.userRole.deleteMany({ where: { userId: { in: dummyUserIds } } });

    const deletedUsers = await prisma.user.deleteMany({
      where: { id: { in: dummyUserIds } },
    });
    console.log(`✔ Deleted ${deletedUsers.count} fake candidate / mock users.`);
  }

  // 5. Clean up any dummy files in File table
  if (dummyUserIds.length > 0) {
    await prisma.file.deleteMany({
      where: {
        category: { not: 'company_logo' },
        ownerUserId: { in: dummyUserIds },
      },
    });
  }

  console.log('==> Cleanup complete! Only the 3 demo accounts and taxonomy remain.');
}

main()
  .catch((err) => {
    console.error('Failed to clear fake data:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
