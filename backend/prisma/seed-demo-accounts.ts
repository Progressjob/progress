import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { ensureCompanyLogo } from './seed-company-logos';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('==> Seeding Demo Accounts (Zero Fake Data)...');

  // 1. Ensure core roles exist
  const roleNames = ['admin', 'moderator', 'employer', 'candidate'];
  const roles = new Map<string, number>();
  for (const name of roleNames) {
    const role = await prisma.role.upsert({
      where: { name },
      create: { name, description: `${name} portal role` },
      update: {},
    });
    roles.set(name, role.id);
  }

  // 2. Demo Admin Account
  const adminEmail = 'admin@example.com';
  const adminPassword = 'ChangeMe123!';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      firstName: 'System',
      lastName: 'Administrator',
      passwordHash: await argon2.hash(adminPassword, { type: argon2.argon2id }),
    },
    update: {
      passwordHash: await argon2.hash(adminPassword, { type: argon2.argon2id }),
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: roles.get('admin')! } },
    create: { userId: admin.id, roleId: roles.get('admin')! },
    update: {},
  });
  console.log(`✔ Admin:     ${adminEmail} / ${adminPassword}`);

  // 3. Ensure a baseline industry for the demo company
  let itIndustry = await prisma.industry.findUnique({
    where: { slug: 'information-technology' },
  });
  if (!itIndustry) {
    itIndustry = await prisma.industry.create({
      data: {
        name: 'Information Technology',
        slug: 'information-technology',
      },
    });
  }

  // 4. Demo Employer Account & Demo Company
  const employerEmail = 'employer@example.com';
  const employerPassword = 'Employer123!';
  const employer = await prisma.user.upsert({
    where: { email: employerEmail },
    create: {
      email: employerEmail,
      firstName: 'Demo',
      lastName: 'Employer',
      passwordHash: await argon2.hash(employerPassword, { type: argon2.argon2id }),
    },
    update: {
      passwordHash: await argon2.hash(employerPassword, { type: argon2.argon2id }),
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: employer.id, roleId: roles.get('employer')! } },
    create: { userId: employer.id, roleId: roles.get('employer')! },
    update: {},
  });

  const company = await prisma.company.upsert({
    where: { slug: 'demo-technology-plc' },
    create: {
      name: 'Demo Technology PLC',
      slug: 'demo-technology-plc',
      industryId: itIndustry.id,
      description: 'Demo company for employer testing.',
      verificationStatus: 'verified',
      verifiedAt: new Date(),
    },
    update: {},
  });
  await ensureCompanyLogo(prisma, company);

  await prisma.companyMember.upsert({
    where: { companyId_userId: { companyId: company.id, userId: employer.id } },
    create: {
      companyId: company.id,
      userId: employer.id,
      memberRole: 'owner',
      invitedBy: admin.id,
      status: 'active',
    },
    update: { status: 'active', memberRole: 'owner' },
  });
  console.log(`✔ Employer:  ${employerEmail} / ${employerPassword} (Company: ${company.name})`);

  // 5. Demo Candidate Account & Candidate Profile
  const candidateEmail = 'candidate@example.com';
  const candidatePassword = 'Candidate123!';
  const candidate = await prisma.user.upsert({
    where: { email: candidateEmail },
    create: {
      email: candidateEmail,
      firstName: 'Demo',
      lastName: 'Candidate',
      passwordHash: await argon2.hash(candidatePassword, { type: argon2.argon2id }),
    },
    update: {
      passwordHash: await argon2.hash(candidatePassword, { type: argon2.argon2id }),
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: candidate.id, roleId: roles.get('candidate')! } },
    create: { userId: candidate.id, roleId: roles.get('candidate')! },
    update: {},
  });

  await prisma.candidateProfile.upsert({
    where: { userId: candidate.id },
    create: {
      userId: candidate.id,
      headline: 'Demo Candidate - Fullstack Developer',
      summary: 'Demo candidate profile for testing application and profile features.',
    },
    update: {},
  });
  console.log(`✔ Candidate: ${candidateEmail} / ${candidatePassword}`);
  console.log('==> Demo accounts successfully seeded without any fake job postings.');
}

main()
  .catch((err) => {
    console.error('Failed to seed demo accounts:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
