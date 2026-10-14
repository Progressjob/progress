export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 240);
}
