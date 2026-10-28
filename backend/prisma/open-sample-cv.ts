import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const target = args[0]?.toLowerCase();

  const storageRoot = path.resolve(process.env.STORAGE_ROOT ?? './storage');
  const demoDir = path.resolve(storageRoot, 'cv', 'demo');

  console.log('======================================================================');
  console.log('  PROGRESS MANPOWER PLC - DEMO CV INSPECTOR & SAMPLE OPENER');
  console.log('======================================================================');
  console.log(`Storage root: ${storageRoot}`);
  console.log(`Demo CV path: ${demoDir}\n`);

  if (!fs.existsSync(demoDir)) {
    console.log('Demo directory does not exist yet. Run `npm run seed:demo` first.');
    return;
  }

  const files = fs.readdirSync(demoDir).filter((f) => f.endsWith('.pdf'));

  if (files.length === 0) {
    console.log('No demo CV PDF files found. Run `npm run seed:demo` to generate sample CVs.');
    return;
  }

  const candidates = await prisma.user.findMany({
    where: {
      email: { endsWith: '@example.com' },
      candidateProfile: { isNot: null },
    },
    include: {
      candidateProfile: {
        include: {
          resumes: { include: { file: true } },
          experiences: true,
          educations: true,
        },
      },
    },
    orderBy: { firstName: 'asc' },
  });

  console.log(`Available Sample Candidate CVs (${candidates.length} profiles):\n`);
  candidates.forEach((c, idx) => {
    const resume = c.candidateProfile?.resumes[0];
    const exp = c.candidateProfile?.experiences[0]?.jobTitle || 'Entry Level';
    const edu = c.candidateProfile?.educations[0]?.institution || 'N/A';
    console.log(` [${idx + 1}] ${c.firstName} ${c.lastName} (${c.email})`);
    console.log(`     Role: ${c.candidateProfile?.headline || exp}`);
    console.log(`     Education: ${edu}`);
    console.log(`     CV File: ${resume?.file.storageKey || 'None'}`);
    console.log('----------------------------------------------------------------------');
  });

  // If a target is provided or default to opening the first sample
  let fileToOpen: string | null = null;

  if (target) {
    const matched = candidates.find(
      (c) =>
        c.email.toLowerCase().includes(target) ||
        c.firstName.toLowerCase().includes(target) ||
        c.lastName.toLowerCase().includes(target),
    );
    if (matched && matched.candidateProfile?.resumes[0]?.file.storageKey) {
      fileToOpen = path.resolve(storageRoot, matched.candidateProfile.resumes[0].file.storageKey);
    } else {
      const directMatch = files.find((f) => f.toLowerCase().includes(target));
      if (directMatch) fileToOpen = path.resolve(demoDir, directMatch);
    }
  } else if (files.length > 0) {
    fileToOpen = path.resolve(demoDir, files[0]);
  }

  if (fileToOpen && fs.existsSync(fileToOpen)) {
    console.log(`\nOpening sample CV file: ${fileToOpen}`);
    const cmd =
      process.platform === 'win32'
        ? `start "" "${fileToOpen}"`
        : process.platform === 'darwin'
        ? `open "${fileToOpen}"`
        : `xdg-open "${fileToOpen}"`;
    exec(cmd, (err) => {
      if (err) {
        console.log(`Could not auto-open in viewer: ${err.message}`);
        console.log(`You can manually open it at: ${fileToOpen}`);
      } else {
        console.log('Sample CV opened successfully in your default PDF viewer!');
      }
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

