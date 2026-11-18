import type { OfficeCandidateInput } from '../api/officeCandidates';
import { isValidEthiopianMobile } from './ethiopianPhone';
import { educationPlaceKind } from '../constants/educationLevels';

export function officeCandidateFieldErrors(value: OfficeCandidateInput, requireConsent = true): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!value.firstName.trim()) errors['oc-first'] = 'Enter the candidate’s first name.';
  if (!value.lastName.trim()) errors['oc-last'] = 'Enter the candidate’s last name.';
  if (!isValidEthiopianMobile(value.phone)) errors['oc-phone'] = 'Enter 9 digits starting with 7 or 9 after +251.';
  if (value.nationalId?.trim() && !/^\d{16}$/.test(value.nationalId.trim())) errors['oc-fan'] = 'National ID FAN number must be exactly 16 digits.';
  if (value.expectedSalary !== undefined && !Number.isFinite(value.expectedSalary)) errors['oc-salary'] = 'Enter a valid salary amount.';
  const educationIssue = officeEducationIssue(value);
  if (educationIssue) errors['oc-edu'] = educationIssue;
  const emergencyIssue = officeEmergencyPhoneIssue(value);
  if (emergencyIssue) errors['oc-em-phone'] = emergencyIssue;
  if (requireConsent && !value.consent) errors['oc-consent'] = 'Record the candidate’s permission before saving.';
  return errors;
}

export function focusOfficeField(form: HTMLFormElement, id: string) {
  const field = form.querySelector<HTMLElement>(`#${id}`);
  if (!field) return;
  const section = field.closest('details');
  if (section) section.open = true;
  requestAnimationFrame(() => {
    field.focus({ preventScroll: true });
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

export function officeEmergencyPhoneIssue(value: OfficeCandidateInput): string | null {
  const phone = value.emergencyPhone?.trim() ?? '';
  if (!phone || isValidEthiopianMobile(phone)) return null;
  return 'Emergency phone must start with +251 and contain 9 digits.';
}

export function officeEducationIssue(value: OfficeCandidateInput): string | null {
  const kind = educationPlaceKind(value.qualification);
  if (kind === 'none' && (value.institution?.trim() || value.fieldOfStudy?.trim())) {
    return 'Graduated school is not collected when there is no formal schooling.';
  }
  return null;
}

