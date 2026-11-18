import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { OfficeCandidateFieldsDto } from './office-candidates.dto';
import { toEthiopianE164 } from './ethiopian-phone';

export const SHEET_HEADERS = [
  'NO',
  'FAN NO',
  'Candidate Name',
  'Date of Register',
  'Job Title',
  'Department',
  'Category',
  'Job Grade 2026',
  'Basic Salary Expectation',
  'Bank Account',
  'Transport Allowance',
  'House /other Allowance',
  'Mobile Allowance',
  'Food Coupon',
  'Language Skills',
  'Employees Phone no',
  'Marital Status',
  'SeX',
  'D.B in GC',
  'Age',
  'Experience in other company',
  'Education Level',
  'Stream',
  'Graduated School',
  "Mother's Name",
  'Emergency contact person',
  'Relationship status',
  'Phone number',
  'Current Location',
  'Place of birth',
  'Blood Group/Type',
  'Guarantee name',
  'Mobile No',
  'Guaranter FAN NO',
  'Status',
  'Notes',
] as const;

export interface OfficeSheetRow {
  no: number;
  nationalId: string;
  name: string;
  registeredAt: string;
  headline: string;
  department: string;
  category: string;
  jobGrade: string;
  salary: string;
  bankAccount: string;
  transportAllowance: string;
  houseAllowance: string;
  mobileAllowance: string;
  foodCoupon: string;
  languages: string;
  phone: string;
  maritalStatus: string;
  gender: string;
  dateOfBirth: string;
  age: string;
  summary: string;
  qualification: string;
  fieldOfStudy: string;
  institution: string;
  motherName: string;
  emergencyContactName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  city: string;
  placeOfBirth: string;
  bloodGroup: string;
  guarantorName: string;
  guarantorPhone: string;
  guarantorNationalId: string;
  officeStatus: string;
  notes: string;
}

const DATE_FIELDS = new Set(['date of register', 'd.b in gc']);

function norm(header: string): string {
  return header.trim().replace(/\s+/g, ' ').toLowerCase();
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if ('text' in value && value.text) return String(value.text).trim();
    if ('result' in value) return cellText(value.result as ExcelJS.CellValue);
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('').trim();
    }
  }
  return String(value).trim();
}

function excelDate(value: ExcelJS.CellValue): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const date = new Date(Math.round((value - 25569) * 86_400_000));
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  const text = cellText(value);
  if (!text) return undefined;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return undefined;
}

function money(raw: string): number | undefined {
  const cleaned = raw.replace(/,/g, '').replace(/[^\d.]/g, '');
  if (!cleaned) return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

function splitName(full: string): { firstName: string; lastName: string } | null {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  if (parts.length === 1) return { firstName: parts[0].slice(0, 100), lastName: '-' };
  return { firstName: parts[0].slice(0, 100), lastName: parts.slice(1).join(' ').slice(0, 100) };
}

export interface ImportRow {
  row: number;
  status: 'ok' | 'error';
  errors: string[];
  preview: { name: string; phone: string; nationalId: string; headline: string };
  data?: OfficeCandidateFieldsDto;
}

export async function readOfficeSheet(buffer: Buffer, takenPhones: Set<string>, takenFans: Set<string>): Promise<ImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new BadRequestException('The workbook has no worksheet');
  const headerRow = sheet.getRow(1);
  const columns = new Map<string, number>();
  headerRow.eachCell((cell, col) => {
    const key = norm(cellText(cell.value));
    if (key) columns.set(key, col);
  });
  if (!columns.has('candidate name') || !columns.has('employees phone no')) {
    throw new BadRequestException('The sheet must include Candidate Name and Employees Phone no columns');
  }

  const seenPhones = new Set<string>();
  const seenFans = new Set<string>();
  const rows: ImportRow[] = [];
  sheet.eachRow((excelRow, rowNumber) => {
    if (rowNumber === 1) return;
    const read = (header: string) => {
      const col = columns.get(norm(header));
      if (!col) return '';
      return cellText(excelRow.getCell(col).value);
    };
    const readDate = (header: string) => {
      const col = columns.get(norm(header));
      if (!col) return undefined;
      return excelDate(excelRow.getCell(col).value);
    };
    const values = SHEET_HEADERS.map((header) => read(header));
    if (values.every((value) => !value)) return;

    const errors: string[] = [];
    const name = splitName(read('Candidate Name'));
    if (!name) errors.push('Missing candidate name');
    const phone = toEthiopianE164(read('Employees Phone no'));
    if (!phone) errors.push('Invalid phone number');
    else if (seenPhones.has(phone) || takenPhones.has(phone)) errors.push('Duplicate phone');
    const rawFan = read('FAN NO').replace(/\s+/g, '');
    const nationalId = /^\d{16}$/.test(rawFan) ? rawFan : undefined;
    if (rawFan && !nationalId) errors.push('National ID FAN number must be exactly 16 digits');
    if (rawFan && (seenFans.has(rawFan) || takenFans.has(rawFan))) errors.push('Duplicate FAN');
    const birth = readDate('D.B in GC');
    if (read('D.B in GC') && !birth) errors.push('Invalid date of birth');
    const registered = readDate('Date of Register');
    if (read('Date of Register') && !registered) errors.push('Invalid registration date');
    for (const header of DATE_FIELDS) {
      void header;
    }

    const salary = money(read('Basic Salary Expectation'));
    const statusRaw = read('Status').trim().toLowerCase().replace(/\s+/g, '_').slice(0, 30);
    const officeStatus = (['new', 'negotiating', 'ready', 'placed'] as const).includes(statusRaw as 'new')
      ? (statusRaw as 'new' | 'negotiating' | 'ready' | 'placed')
      : statusRaw
        ? undefined
        : 'new';
    if (statusRaw && !officeStatus) errors.push('Status must be new, negotiating, ready, or placed');

    const data: OfficeCandidateFieldsDto | undefined = name && phone && !errors.length
      ? {
          firstName: name.firstName,
          lastName: name.lastName,
          phone,
          nationalId,
          headline: read('Job Title') || undefined,
          gender: read('SeX') || undefined,
          dateOfBirth: birth,
          city: read('Current Location') || undefined,
          summary: read('Experience in other company') || undefined,
          expectedSalary: salary,
          consent: true,
          officeStatus: officeStatus ?? 'new',
          registeredAt: registered,
          qualification: read('Education Level') || undefined,
          fieldOfStudy: read('Stream') || undefined,
          institution: read('Graduated School') || undefined,
          languages: read('Language Skills') || undefined,
          department: read('Department') || undefined,
          category: read('Category') || undefined,
          jobGrade: read('Job Grade 2026') || undefined,
          transportAllowance: read('Transport Allowance') || undefined,
          houseAllowance: read('House /other Allowance') || undefined,
          mobileAllowance: read('Mobile Allowance') || undefined,
          foodCoupon: read('Food Coupon') || undefined,
          maritalStatus: read('Marital Status') || undefined,
          placeOfBirth: read('Place of birth') || undefined,
          bloodGroup: read('Blood Group/Type') || undefined,
          motherName: read("Mother's Name") || undefined,
          emergencyContactName: read('Emergency contact person') || undefined,
          emergencyRelationship: read('Relationship status') || undefined,
          emergencyPhone: read('Phone number') || undefined,
          guarantorName: read('Guarantee name') || undefined,
          guarantorPhone: read('Mobile No') || undefined,
          guarantorNationalId: read('Guaranter FAN NO') || undefined,
          bankAccount: read('Bank Account') || undefined,
        }
      : undefined;
    if (phone) seenPhones.add(phone);
    if (nationalId) seenFans.add(nationalId);
    rows.push({
      row: rowNumber,
      status: errors.length ? 'error' : 'ok',
      errors,
      preview: {
        name: read('Candidate Name'),
        phone: phone ?? read('Employees Phone no'),
        nationalId: nationalId ?? '',
        headline: read('Job Title'),
      },
      data,
    });
  });
  return rows;
}

export async function officeTemplateBuffer(rows: OfficeSheetRow[] = []): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Office candidates');
  sheet.addRow([...SHEET_HEADERS]);
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow([
      row.no,
      row.nationalId,
      row.name,
      row.registeredAt,
      row.headline,
      row.department,
      row.category,
      row.jobGrade,
      row.salary,
      row.bankAccount,
      row.transportAllowance,
      row.houseAllowance,
      row.mobileAllowance,
      row.foodCoupon,
      row.languages,
      row.phone,
      row.maritalStatus,
      row.gender,
      row.dateOfBirth,
      row.age,
      row.summary,
      row.qualification,
      row.fieldOfStudy,
      row.institution,
      row.motherName,
      row.emergencyContactName,
      row.emergencyRelationship,
      row.emergencyPhone,
      row.city,
      row.placeOfBirth,
      row.bloodGroup,
      row.guarantorName,
      row.guarantorPhone,
      row.guarantorNationalId,
      row.officeStatus,
      row.notes,
    ]);
  }
  sheet.columns.forEach((column) => {
    column.width = 22;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
