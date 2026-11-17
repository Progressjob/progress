import ExcelJS from 'exceljs';
import { readOfficeSheet, SHEET_HEADERS } from './office-import';

async function workbook(rows: string[][]): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Office candidates');
  sheet.addRow([...SHEET_HEADERS]);
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await book.xlsx.writeBuffer());
}

describe('office excel import', () => {
  it('accepts a valid row and rejects a bad phone in the same file', async () => {
    const nameAt = SHEET_HEADERS.indexOf('Candidate Name');
    const phoneAt = SHEET_HEADERS.indexOf('Employees Phone no');
    const titleAt = SHEET_HEADERS.indexOf('Job Title');
    const blank = () => SHEET_HEADERS.map(() => '');
    const good = blank();
    good[nameAt] = 'Abebe Kebede';
    good[phoneAt] = '0911223344';
    good[titleAt] = 'Nurse';
    const bad = blank();
    bad[nameAt] = 'No Phone';
    bad[phoneAt] = '123';
    const rows = await readOfficeSheet(await workbook([good, bad]), new Set(), new Set());
    expect(rows[0]).toMatchObject({ status: 'ok', data: { firstName: 'Abebe', lastName: 'Kebede', phone: '+251911223344', headline: 'Nurse', consent: true } });
    expect(rows[1].status).toBe('error');
    expect(rows[1].errors).toContain('Invalid phone number');
  });

  it('flags a FAN already stored in the database', async () => {
    const fanAt = SHEET_HEADERS.indexOf('FAN NO');
    const nameAt = SHEET_HEADERS.indexOf('Candidate Name');
    const phoneAt = SHEET_HEADERS.indexOf('Employees Phone no');
    const row = SHEET_HEADERS.map(() => '');
    row[nameAt] = 'Marta Bekele';
    row[phoneAt] = '+251922334455';
    row[fanAt] = 'FAN-9';
    const rows = await readOfficeSheet(await workbook([row]), new Set(), new Set(['FAN-9']));
    expect(rows[0].errors).toContain('Duplicate FAN');
  });
});
