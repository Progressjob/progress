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

function svgMonogram(name: string, color: string): string {
  const initial = (name.trim().charAt(0) || 'C').toUpperCase();
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="48" fill="${color}"/>
  <text x="128" y="172" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="132" font-weight="700" fill="#ffffff">${initial}</text>
</svg>`;
}

function brandAssetPath(slug: string): string {
  return path.resolve(__dirname, 'seed-assets', 'logos', `${slug}.svg`);
}

async function readBrandAsset(slug: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(brandAssetPath(slug));
  } catch {
    return null;
  }
}

export async function ensureCompanyLogo(
  client: PrismaClient,
  company: { id: string; name: string; slug: string; logoFileId: string | null },
): Promise<void> {
  const brandSvg = await readBrandAsset(company.slug);
  // Keep existing monogram logos unless a brand asset is available to upgrade them.
  if (company.logoFileId && !brandSvg) return;

  const storageRoot = path.resolve(process.env.STORAGE_ROOT ?? './storage');
  const year = String(new Date().getUTCFullYear());
  const key = `logo/${year}/${randomUUID()}.svg`;
  const absolute = path.resolve(storageRoot, key);
  await fs.mkdir(path.dirname(absolute), { recursive: true });

  const payload = brandSvg ?? Buffer.from(svgMonogram(company.name, colorForSlug(company.slug)), 'utf8');
  await fs.writeFile(absolute, payload);

  const file = await client.file.create({
    data: {
      storageKey: key,
      originalFilename: `${company.slug}-logo.svg`,
      mimeType: 'image/svg+xml',
      sizeBytes: BigInt(payload.byteLength),
      fileCategory: 'logo',
      isPrivate: false,
    },
  });

  await client.company.update({
    where: { id: company.id },
    data: { logoFileId: file.id },
  });
}
