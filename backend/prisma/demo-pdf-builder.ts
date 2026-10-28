/**
 * Simple, zero-dependency PDF 1.4 generator for candidate demo CVs.
 * Produces valid, standard Type-1 Helvetica PDF documents viewable in all browsers and PDF readers.
 */

function escapePdfText(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapText(text: string, maxLen = 85): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxLen) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export interface DemoCandidateCvData {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience: Array<{ role: string; company: string; period: string; desc: string }>;
  education: Array<{ degree: string; institution: string; period: string; grade?: string }>;
  skills: string[];
}

export function generateDemoPdf(candidate: DemoCandidateCvData): Buffer {
  const lines: Array<{ font: 'F1' | 'F2'; size: number; text: string; dy: number }> = [];

  // Header
  lines.push({ font: 'F1', size: 18, text: candidate.name, dy: 0 });
  lines.push({ font: 'F2', size: 12, text: candidate.title, dy: 22 });
  lines.push({
    font: 'F2',
    size: 9,
    text: `${candidate.location}   |   ${candidate.email}   |   ${candidate.phone}`,
    dy: 16,
  });
  lines.push({
    font: 'F2',
    size: 9,
    text: '------------------------------------------------------------------------------------------------------------------------',
    dy: 14,
  });

  // Summary
  lines.push({ font: 'F1', size: 11, text: 'PROFESSIONAL SUMMARY', dy: 20 });
  const summaryChunks = wrapText(candidate.summary, 85);
  for (const chunk of summaryChunks) {
    lines.push({ font: 'F2', size: 9, text: chunk, dy: 13 });
  }

  // Experience
  lines.push({ font: 'F1', size: 11, text: 'WORK EXPERIENCE', dy: 20 });
  for (const exp of candidate.experience) {
    lines.push({ font: 'F1', size: 10, text: `${exp.role}  -  ${exp.company}`, dy: 16 });
    lines.push({ font: 'F2', size: 8.5, text: exp.period, dy: 12 });
    const descChunks = wrapText(exp.desc, 82);
    for (const chunk of descChunks) {
      lines.push({ font: 'F2', size: 9, text: `* ${chunk}`, dy: 12 });
    }
  }

  // Education
  lines.push({ font: 'F1', size: 11, text: 'ACADEMIC BACKGROUND & EDUCATION', dy: 20 });
  for (const edu of candidate.education) {
    lines.push({ font: 'F1', size: 10, text: `${edu.degree}  -  ${edu.institution}`, dy: 15 });
    lines.push({
      font: 'F2',
      size: 8.5,
      text: `${edu.period}${edu.grade ? `   |   Grade: ${edu.grade}` : ''}`,
      dy: 12,
    });
  }

  // Skills
  lines.push({ font: 'F1', size: 11, text: 'CORE COMPETENCIES & SKILLS', dy: 20 });
  const skillLine = candidate.skills.join('   *   ');
  const skillChunks = wrapText(skillLine, 85);
  for (const chunk of skillChunks) {
    lines.push({ font: 'F2', size: 9, text: chunk, dy: 13 });
  }

  // Render stream instructions
  let streamContent = 'BT\n50 742 Td\n';
  let first = true;
  for (const item of lines) {
    if (first) {
      streamContent += `/${item.font} ${item.size} Tf\n(${escapePdfText(item.text)}) Tj\n`;
      first = false;
    } else {
      streamContent += `/${item.font} ${item.size} Tf\n0 -${item.dy} Td\n(${escapePdfText(item.text)}) Tj\n`;
    }
  }
  streamContent += 'ET\n';

  const streamBuf = Buffer.from(streamContent, 'utf-8');

  const obj1 = '1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n';
  const obj2 = '2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n';
  const obj3 =
    '3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R/F2 6 0 R>>>>>>\nendobj\n';
  const obj4 = `4 0 obj\n<</Length ${streamBuf.length}>>\nstream\n${streamContent}endstream\nendobj\n`;
  const obj5 = '5 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold>>\nendobj\n';
  const obj6 = '6 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>\nendobj\n';

  const header = '%PDF-1.4\n';
  const offsets: number[] = [0];

  let current = header.length;
  offsets.push(current);
  current += Buffer.byteLength(obj1);
  offsets.push(current);
  current += Buffer.byteLength(obj2);
  offsets.push(current);
  current += Buffer.byteLength(obj3);
  offsets.push(current);
  current += Buffer.byteLength(obj4);
  offsets.push(current);
  current += Buffer.byteLength(obj5);
  offsets.push(current);
  current += Buffer.byteLength(obj6);

  let xref = `xref\n0 7\n0000000000 65535 f \n`;
  for (let i = 1; i <= 6; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  const startXref = current;
  const trailer = `trailer\n<</Size 7/Root 1 0 R>>\nstartxref\n${startXref}\n%%EOF\n`;

  const fullPdf = header + obj1 + obj2 + obj3 + obj4 + obj5 + obj6 + xref + trailer;
  return Buffer.from(fullPdf, 'utf-8');
}

