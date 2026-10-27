import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { PROGRESS_HIRE_EMAIL } from '../src/common/progress-contact';

const prisma = new PrismaClient();

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main(): Promise<void> {
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

  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@example.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      firstName: 'System',
      lastName: 'Administrator',
      passwordHash: await argon2.hash(adminPassword, { type: argon2.argon2id }),
    },
    update: {},
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: roles.get('admin')! } },
    create: { userId: admin.id, roleId: roles.get('admin')! },
    update: {},
  });

  const industryNames = [
    'Information Technology',
    'Banking and Financial Services',
    'Manufacturing',
    'Healthcare',
    'Education',
    'Non-Governmental Organization',
    'Construction',
    'Hospitality and Tourism',
  ];
  for (const name of industryNames) {
    const slug = slugify(name);
    await prisma.industry.upsert({
      where: { slug },
      create: { name, slug },
      update: { name, isActive: true },
    });
  }

  const categoryNames = [
    'Accounting and Finance',
    'Business and Administration',
    'Management',
    'Health Care',
    'Engineering',
    'Information Technology',
    'NGO and Development',
    'Education',
    'Sales and Marketing',
    'Human Resources',
    'Logistics and Supply Chain',
    'Legal',
    'Agriculture',
    'Hospitality',
  ];
  for (const [sortOrder, name] of categoryNames.entries()) {
    const slug = slugify(name);
    await prisma.jobCategory.upsert({
      where: { slug },
      create: { name, slug, sortOrder },
      update: { name, sortOrder, isActive: true },
    });
  }

  const locations = [
    ['Addis Ababa', 'Addis Ababa'],
    ['Bahir Dar', 'Amhara'],
    ['Gondar', 'Amhara'],
    ['Debre Birhan', 'Amhara'],
    ['Adama', 'Oromia'],
    ['Jimma', 'Oromia'],
    ['Hawassa', 'Sidama'],
    ['Mekelle', 'Tigray'],
    ['Dire Dawa', 'Dire Dawa'],
    ['Jigjiga', 'Somali'],
    ['Semera', 'Afar'],
    ['Assosa', 'Benishangul-Gumuz'],
    ['Gambella', 'Gambella'],
    ['Harar', 'Harari'],
  ] as const;
  for (const [name, region] of locations) {
    const slug = slugify(`${name}-${region}`);
    await prisma.location.upsert({
      where: { slug },
      create: { country: 'Ethiopia', region, city: name, name, slug },
      update: { region, city: name, name },
    });
  }

  const skillNames = [
    'Microsoft Excel',
    'Communication',
    'Project Management',
    'Accounting',
    'JavaScript',
    'TypeScript',
    'Node.js',
    'React',
    'PostgreSQL',
    'Monitoring and Evaluation',
    'Sales',
    'Human Resources',
  ];
  for (const name of skillNames) {
    await prisma.skill.upsert({ where: { name }, create: { name }, update: {} });
  }

  if ((process.env.NODE_ENV ?? 'development') !== 'production') {
    await seedDevelopmentData(roles, admin.id);
  }
}

async function seedDevelopmentData(roles: Map<string, number>, adminId: string): Promise<void> {
  const employer = await prisma.user.upsert({
    where: { email: 'employer@example.com' },
    create: {
      email: 'employer@example.com',
      firstName: 'Demo',
      lastName: 'Employer',
      passwordHash: await argon2.hash('Employer123!', { type: argon2.argon2id }),
    },
    update: {},
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: employer.id, roleId: roles.get('employer')! } },
    create: { userId: employer.id, roleId: roles.get('employer')! },
    update: {},
  });
  const industry = await prisma.industry.findUniqueOrThrow({
    where: { slug: 'information-technology' },
  });
  const company = await prisma.company.upsert({
    where: { slug: 'demo-technology-plc' },
    create: {
      name: 'Demo Technology PLC',
      slug: 'demo-technology-plc',
      industryId: industry.id,
      description: 'Development-only sample employer.',
      verificationStatus: 'verified',
      verifiedAt: new Date(),
    },
    update: { canSelfPublishJobs: false },
  });
  await prisma.companyMember.upsert({
    where: { companyId_userId: { companyId: company.id, userId: employer.id } },
    create: {
      companyId: company.id,
      userId: employer.id,
      memberRole: 'owner',
      invitedBy: adminId,
    },
    update: { status: 'active' },
  });

  const candidate = await prisma.user.upsert({
    where: { email: 'candidate@example.com' },
    create: {
      email: 'candidate@example.com',
      firstName: 'Demo',
      lastName: 'Candidate',
      passwordHash: await argon2.hash('Candidate123!', { type: argon2.argon2id }),
    },
    update: {},
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: candidate.id, roleId: roles.get('candidate')! } },
    create: { userId: candidate.id, roleId: roles.get('candidate')! },
    update: {},
  });
  await prisma.candidateProfile.upsert({
    where: { userId: candidate.id },
    create: { userId: candidate.id, headline: 'Demo Candidate' },
    update: {},
  });

  const category = await prisma.jobCategory.findUniqueOrThrow({
    where: { slug: 'information-technology' },
  });
  const location = await prisma.location.findUniqueOrThrow({
    where: { slug: 'addis-ababa-addis-ababa' },
  });
  await prisma.job.updateMany({
    where: { educationRequirement: { in: ['Bachelor degree', 'Bachelors degree'] } },
    data: { educationRequirement: "Bachelor's Degree" },
  });

  const sample = await prisma.job.findFirst({
    where: { companyId: company.id, referenceCode: 'DEV-001' },
  });
  const hireThroughProgress = {
    applicationMethod: 'admin' as const,
    applicationEmail: PROGRESS_HIRE_EMAIL,
  };
  if (!sample) {
    const deadline = new Date();
    deadline.setUTCDate(deadline.getUTCDate() + 30);
    await prisma.job.create({
      data: {
        companyId: company.id,
        createdBy: adminId,
        categoryId: category.id,
        locationId: location.id,
        title: 'Junior Backend Developer',
        slug: 'junior-backend-developer-demo',
        referenceCode: 'DEV-001',
        description: 'Development-only sample vacancy.',
        educationRequirement: "Bachelor's Degree",
        employmentType: 'full_time',
        workplaceType: 'hybrid',
        ...hireThroughProgress,
        applicationDeadline: deadline,
        status: 'published',
        postedAt: new Date(),
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });
  } else {
    await prisma.job.update({
      where: { id: sample.id },
      data: {
        ...hireThroughProgress,
        educationRequirement: sample.educationRequirement ?? "Bachelor's Degree",
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
