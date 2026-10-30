import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const LOGO_COLORS = ['#0B57D0', '#0F766E', '#B45309', '#7C3AED', '#BE123C', '#0369A1', '#15803D'];

function colorForSlug(slug: string): string {
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return LOGO_COLORS[hash % LOGO_COLORS.length];
}

function svgLogo(name: string, color: string): string {
  const initial = (name.trim().charAt(0) || 'C').toUpperCase();
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="48" fill="${color}"/>
  <text x="128" y="172" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="132" font-weight="700" fill="#ffffff">${initial}</text>
</svg>`;
}

export async function ensureCompanyLogo(
  client: PrismaClient,
  company: { id: string; name: string; slug: string; logoFileId: string | null },
): Promise<void> {
  if (company.logoFileId) return;

  const storageRoot = path.resolve(process.env.STORAGE_ROOT ?? './storage');
  const year = String(new Date().getUTCFullYear());
  const key = `logo/${year}/${randomUUID()}.svg`;
  const svg = svgLogo(company.name, colorForSlug(company.slug));
  const absolute = path.resolve(storageRoot, key);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, svg, 'utf8');

  const file = await client.file.create({
    data: {
      storageKey: key,
      originalFilename: `${company.slug}-logo.svg`,
      mimeType: 'image/svg+xml',
      sizeBytes: BigInt(Buffer.byteLength(svg)),
      fileCategory: 'logo',
      isPrivate: false,
    },
  });

  await client.company.update({
    where: { id: company.id },
    data: { logoFileId: file.id },
  });
}
