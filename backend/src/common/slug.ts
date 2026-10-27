export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 240);
}

export async function nextUniqueSlug(
  name: string,
  taken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(name) || 'employer';
  let slug = base;
  let count = 1;
  while (await taken(slug)) slug = `${base}-${++count}`;
  return slug;
}
