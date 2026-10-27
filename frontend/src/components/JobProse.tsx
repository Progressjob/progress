import React from 'react';

type Block =
  | { type: 'h'; level: 2 | 3 | 4; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

const BULLET_RE = /^(?:[-*•●○▪►▸–—]|\d+[.)])\s+/;
const ORDERED_RE = /^\d+[.)]\s+/;
const MD_HEADING_RE = /^(#{1,4})\s+(.+)$/;
const TABLE_ROW_RE = /^\|.+\|?\s*$/;
const ALIGN_ROW_RE = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const IMAGE_LINE_RE = /^!\[|^\[image\]|^<img\b/i;
const KNOWN_HEADING_RE =
  /^(job summary|summary|about (the|this) role|job description|(key |job )?responsibilities|duties|qualifications|required qualifications( and skills)?|education|experience|work experience|(required )?skills( and competencies)?|key performance indicators(\s*\(kpis?\))?|kpis?|reporting line|reports to|how to apply|benefits|what we offer|female applicants only)$/i;

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripNoise(value: string): string {
  return decodeEntities(value)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\\&/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .trimEnd();
}

function isSafeUrl(url: string): boolean {
  return /^(https?:|mailto:)/i.test(url.trim());
}

function titleCaseHeading(value: string): string {
  const cleaned = value.replace(/:$/, '').trim();
  if (cleaned !== cleaned.toUpperCase() || cleaned.length > 48) return cleaned;
  return cleaned
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function headingOf(line: string): { level: 2 | 3 | 4; text: string } | null {
  const trimmed = line.trim();
  const md = trimmed.match(MD_HEADING_RE);
  if (md) {
    const level = Math.min(Math.max(md[1].length, 2), 4) as 2 | 3 | 4;
    return { level, text: stripNoise(md[2]).trim() };
  }
  const plain = trimmed.replace(/:$/, '');
  if (KNOWN_HEADING_RE.test(plain)) {
    return { level: 3, text: titleCaseHeading(plain) };
  }
  if (
    plain.length >= 3 &&
    plain.length <= 56 &&
    plain === plain.toUpperCase() &&
    /[A-Z]/.test(plain) &&
    !BULLET_RE.test(plain) &&
    !plain.includes('http')
  ) {
    return { level: 3, text: titleCaseHeading(plain) };
  }
  return null;
}

function looksLikeSubheading(line: string): boolean {
  const trimmed = line.trim().replace(/:$/, '');
  if (!trimmed || BULLET_RE.test(trimmed) || headingOf(trimmed)) return false;
  if (trimmed.length > 72 || /[.!?]$/.test(trimmed)) return false;
  if (!/^[A-Z]/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/);
  return words.length >= 1 && words.length <= 10;
}

function splitTableRow(line: string): string[] {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return inner.split('|').map((cell) => stripNoise(cell).trim());
}

function commaList(text: string): string[] | null {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact.includes(',') || compact.length > 220) return null;
  const withoutEnd = compact.replace(/[.;]+$/, '');
  if (/[.!?]/.test(withoutEnd)) return null;
  const parts = withoutEnd
    .split(/,\s*(?:and\s+)?/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && part.length < 90);
  if (parts.length < 2) return null;
  // "Lead X, supervise Y, and keep Z" is a sentence, not a skill list.
  const laterLowercase = parts.slice(1).some((part) => /^[a-z]/.test(part));
  if (/^[A-Z]/.test(parts[0]) && laterLowercase) return null;
  return parts;
}

function parseBlocks(text: string, preferList: boolean): Block[] {
  const lines = stripNoise(text).replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  const peekNext = (from: number): string => {
    for (let j = from; j < lines.length; j += 1) {
      const next = stripNoise(lines[j]).trim();
      if (next) return next;
    }
    return '';
  };

  while (i < lines.length) {
    const raw = stripNoise(lines[i]);
    const trimmed = raw.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (IMAGE_LINE_RE.test(trimmed) || trimmed === '---' || ALIGN_ROW_RE.test(trimmed)) {
      i += 1;
      continue;
    }

    const heading = headingOf(trimmed);
    if (heading && heading.text) {
      blocks.push({ type: 'h', level: heading.level, text: heading.text });
      i += 1;
      continue;
    }

    if (TABLE_ROW_RE.test(trimmed) && trimmed.includes('|')) {
      const rows: string[][] = [];
      while (i < lines.length) {
        const rowLine = stripNoise(lines[i]).trim();
        if (!rowLine) break;
        if (ALIGN_ROW_RE.test(rowLine)) {
          i += 1;
          continue;
        }
        if (!TABLE_ROW_RE.test(rowLine)) break;
        rows.push(splitTableRow(rowLine));
        i += 1;
      }
      if (rows.length >= 2) {
        blocks.push({ type: 'table', headers: rows[0], rows: rows.slice(1) });
      } else if (rows.length === 1) {
        blocks.push({ type: 'p', text: rows[0].join(' — ') });
      }
      continue;
    }

    if (BULLET_RE.test(trimmed)) {
      const ordered = ORDERED_RE.test(trimmed);
      const items: string[] = [];
      while (i < lines.length) {
        const itemLine = stripNoise(lines[i]).trim();
        if (!itemLine) {
          const following = peekNext(i + 1);
          if (BULLET_RE.test(following)) {
            i += 1;
            continue;
          }
          break;
        }
        if (!BULLET_RE.test(itemLine)) break;
        items.push(itemLine.replace(BULLET_RE, '').trim());
        i += 1;
      }
      if (items.length) {
        blocks.push({ type: ordered ? 'ol' : 'ul', items });
      }
      continue;
    }

    const next = peekNext(i + 1);
    if (looksLikeSubheading(trimmed) && (BULLET_RE.test(next) || headingOf(next))) {
      blocks.push({ type: 'h', level: 4, text: trimmed.replace(/:$/, '') });
      i += 1;
      continue;
    }

    const paraLines = [trimmed];
    i += 1;
    while (i < lines.length) {
      const more = stripNoise(lines[i]);
      const moreTrim = more.trim();
      if (!moreTrim) break;
      if (headingOf(moreTrim) || BULLET_RE.test(moreTrim) || TABLE_ROW_RE.test(moreTrim)) break;
      if (looksLikeSubheading(moreTrim) && BULLET_RE.test(peekNext(i + 1))) break;
      paraLines.push(moreTrim);
      i += 1;
    }
    blocks.push({ type: 'p', text: paraLines.join(' ') });
  }

  if (!preferList) return blocks;

  const onlyCopy = blocks.every((block) => block.type === 'p');
  if (!onlyCopy) return blocks;

  const items: string[] = [];
  for (const block of blocks) {
    if (block.type !== 'p') continue;
    const split = commaList(block.text);
    if (split) items.push(...split);
    else items.push(block.text);
  }
  return items.length ? [{ type: 'ul', items }] : blocks;
}

function InlineText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const pattern =
    /(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|`[^`\n]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('`')) {
      parts.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link && isSafeUrl(link[2])) {
        parts.push(
          <a key={key} href={link[2]} target="_blank" rel="noreferrer">
            {link[1]}
          </a>,
        );
      } else {
        parts.push(link ? link[1] : token);
      }
    }
    key += 1;
    last = match.index + token.length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export function JobProse({
  text,
  preferList = false,
}: {
  text: string;
  preferList?: boolean;
}) {
  const blocks = parseBlocks(text, preferList);
  if (!blocks.length) return null;

  return (
    <div className="jd-prose">
      {blocks.map((block, index) => {
        if (block.type === 'h') {
          const Tag = (block.level === 2 ? 'h3' : block.level === 3 ? 'h3' : 'h4') as 'h3' | 'h4';
          return (
            <Tag key={index} className={block.level === 4 ? 'jd-subhead' : 'jd-heading'}>
              {block.text}
            </Tag>
          );
        }
        if (block.type === 'p') {
          return (
            <p key={index}>
              <InlineText text={block.text} />
            </p>
          );
        }
        if (block.type === 'ul' || block.type === 'ol') {
          const Tag = block.type === 'ol' ? 'ol' : 'ul';
          return (
            <Tag key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <InlineText text={item} />
                </li>
              ))}
            </Tag>
          );
        }
        return (
          <div key={index} className="jd-table-wrap">
            <table>
              <thead>
                <tr>
                  {block.headers.map((header, headerIndex) => (
                    <th key={headerIndex}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>
                        <InlineText text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export function textHasHeadings(text: string): boolean {
  return /^(#{1,4}\s+|.+:\s*$)/m.test(text) || KNOWN_HEADING_RE.test(text.split('\n')[0]?.trim() ?? '');
}
