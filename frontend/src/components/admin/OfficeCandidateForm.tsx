import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EthiopianPhoneInput } from '../EthiopianPhoneInput';
import { isValidEthiopianMobile } from '../../utils/ethiopianPhone';
import { officeCandidateFieldErrors } from '../../utils/officeCandidateValidation';
import { taxonomyApi } from '../../api/taxonomy';
import { EXPERIENCE_STAGES } from '../../constants/candidateProfile';
import {
  EDUCATION_LEVELS,
  NO_FORMAL_SCHOOLING,
  educationPlaceKind,
} from '../../constants/educationLevels';
import type { Category } from '../../types/api';
import type { OfficeCandidateInput, OfficeStatus } from '../../api/officeCandidates';

function categoryNames(categories: Category[]): string[] {
  const names: string[] = [];
  const walk = (items: Category[]) => {
    for (const item of items) {
      if (item.isActive === false) continue;
      names.push(item.name);
      if (item.children?.length) walk(item.children);
    }
  };
  walk(categories);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

function nationalIdDigits(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 16);
}

const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
function ChoiceSelect({
  id,
  value,
  options,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
      {value && !options.includes(value) ? <option value={value}>{value}</option> : null}
    </select>
  );
}

const STATUSES: { id: OfficeStatus; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'negotiating', label: 'Negotiating' },
  { id: 'ready', label: 'Ready' },
  { id: 'placed', label: 'Placed' },
];

export const emptyOfficeCandidate = (): OfficeCandidateInput => ({
  firstName: '',
  lastName: '',
  phone: '',
  consent: false,
  officeStatus: 'new',
});

function OfficeOptionalSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(() => !window.matchMedia('(max-width: 768px)').matches);
  return (
    <details className="office-form-section office-optional-section" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary><h2>{title}</h2><span className="office-section-optional">Optional</span></summary>
      {hint && <p className="office-form-hint">{hint}</p>}
      {children}
    </details>
  );
}

export const OfficeCandidateForm: React.FC<{
  value: OfficeCandidateInput;
  onChange: (value: OfficeCandidateInput) => void;
  showErrors?: boolean;
  requireConsent?: boolean;
}> = ({ value, onChange, showErrors = false, requireConsent = true }) => {
  const set = (patch: Partial<OfficeCandidateInput>) => onChange({ ...value, ...patch });
  const categoriesQuery = useQuery({
    queryKey: ['taxonomy', 'categories'],
    queryFn: () => taxonomyApi.categories(),
  });
  const categories = useMemo(() => categoryNames(categoriesQuery.data ?? []), [categoriesQuery.data]);
  const savedCategory = value.category?.trim() ?? '';
  const categoryIsKnown = !savedCategory || categories.includes(savedCategory);
  const nationalId = nationalIdDigits(value.nationalId ?? '');
  const nationalIdShort = nationalId.length > 0 && nationalId.length < 16;
  const errors = showErrors ? officeCandidateFieldErrors(value, requireConsent) : {};
  const error = (id: string) => errors[id] ? <p id={`${id}-error`} className="office-field-error" role="alert">{errors[id]}</p> : null;
  const validationProps = (id: string) => ({ 'aria-invalid': Boolean(errors[id]), 'aria-describedby': errors[id] ? `${id}-error` : undefined });
  return (
    <div className="office-intake-sheet">
      {Object.keys(errors).length > 0 && <div className="office-validation-summary" role="alert">Please check {Object.keys(errors).length} highlighted field{Object.keys(errors).length === 1 ? '' : 's'} before saving.</div>}
      <section className="office-form-section">
        <h2>Basic details</h2>
        <p className="office-form-hint">Start with the candidate’s name and phone. Other details can be added later.</p>
        <div className="office-form-grid">
          <div className="form-input-group">
            <label htmlFor="oc-first">First name <span className="office-required">*</span></label>
            <input id="oc-first" {...validationProps('oc-first')} maxLength={100} value={value.firstName} onChange={(e) => set({ firstName: e.target.value })} required />
            {error('oc-first')}
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-last">Last name <span className="office-required">*</span></label>
            <input id="oc-last" {...validationProps('oc-last')} maxLength={100} value={value.lastName} onChange={(e) => set({ lastName: e.target.value })} required />
            {error('oc-last')}
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-phone">Phone <span className="office-required">*</span></label>
            <EthiopianPhoneInput id="oc-phone" {...validationProps('oc-phone')} value={value.phone} onChange={(phone) => set({ phone })} required />
            {error('oc-phone')}
          </div>
          <div className="form-input-group office-form-span-full">
            <label htmlFor="oc-city">Current location</label>
            <input id="oc-city" value={value.city ?? ''} onChange={(e) => set({ city: e.target.value })} />
          </div>
        </div>
      </section>

      <OfficeOptionalSection title="Job and salary">
        <p className="office-form-hint">Leave this blank at the desk. You can add or change the job, category, grade, salary, and experience after the candidate is registered.</p>
        <div className="office-form-grid">
          <div className="form-input-group">
            <label htmlFor="oc-title">Job title</label>
            <input id="oc-title" value={value.headline ?? ''} onChange={(e) => set({ headline: e.target.value })} />
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-status">Status</label>
            <select id="oc-status" value={value.officeStatus ?? 'new'} onChange={(e) => set({ officeStatus: e.target.value as OfficeStatus })}>
              {STATUSES.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-dept">Department</label>
            <input id="oc-dept" value={value.department ?? ''} onChange={(e) => set({ department: e.target.value })} />
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-cat">Category</label>
            <select
              id="oc-cat"
              value={savedCategory}
              disabled={categoriesQuery.isLoading}
              onChange={(e) => set({ category: e.target.value })}
            >
              <option value="">{categoriesQuery.isLoading ? 'Loading categories…' : 'Select category'}</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              {savedCategory && !categoryIsKnown ? (
                <option value={savedCategory}>{savedCategory} (not in the list)</option>
              ) : null}
            </select>
            {categoriesQuery.isError ? (
              <p className="office-field-error">Categories could not be loaded. Refresh and try again.</p>
            ) : savedCategory && !categoryIsKnown ? (
              <p className="office-field-error">This category is not in the system list. Pick one from the dropdown.</p>
            ) : (
              <p className="office-field-hint">Same career categories used on job posts.</p>
            )}
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-grade">Job grade</label>
            <select id="oc-grade" value={value.jobGrade ?? ''} onChange={(e) => set({ jobGrade: e.target.value })}>
              <option value="">Select job grade</option>
              {EXPERIENCE_STAGES.map((stage) => (
                <option key={stage.label} value={stage.label}>
                  {stage.label}
                </option>
              ))}
              {value.jobGrade && !EXPERIENCE_STAGES.some((stage) => stage.label === value.jobGrade) ? (
                <option value={value.jobGrade}>{value.jobGrade} (not in the list)</option>
              ) : null}
            </select>
            {value.jobGrade && !EXPERIENCE_STAGES.some((stage) => stage.label === value.jobGrade) ? (
              <p className="office-field-error">This job grade is not in the system list. Pick one from the dropdown.</p>
            ) : (
              <p className="office-field-hint">Same career levels used on candidate profiles.</p>
            )}
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-salary">Basic salary (ETB)</label>
            <input
              id="oc-salary"
              {...validationProps('oc-salary')}
              inputMode="decimal"
              value={value.expectedSalary ?? ''}
              onChange={(e) => set({ expectedSalary: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
            {error('oc-salary')}
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-transport">Transport</label>
            <input id="oc-transport" value={value.transportAllowance ?? ''} onChange={(e) => set({ transportAllowance: e.target.value })} />
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-house">House / other</label>
            <input id="oc-house" value={value.houseAllowance ?? ''} onChange={(e) => set({ houseAllowance: e.target.value })} />
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-mobile">Mobile allowance</label>
            <input id="oc-mobile" value={value.mobileAllowance ?? ''} onChange={(e) => set({ mobileAllowance: e.target.value })} />
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-food">Food coupon</label>
            <input id="oc-food" value={value.foodCoupon ?? ''} onChange={(e) => set({ foodCoupon: e.target.value })} />
          </div>
          <div className="form-input-group office-form-span-full">
            <label htmlFor="oc-exp">Experience in other companies</label>
            <textarea id="oc-exp" rows={3} value={value.summary ?? ''} onChange={(e) => set({ summary: e.target.value })} />
          </div>
        </div>
      </OfficeOptionalSection>

      <OfficeOptionalSection title="Education and languages">
        {error('oc-edu')}
        <div className="office-form-grid">
          <div className="form-input-group">
            <label htmlFor="oc-edu">Education level</label>
            <select
              id="oc-edu"
              value={value.qualification ?? ''}
              onChange={(e) => {
                const qualification = e.target.value;
                const clearsSchool = educationPlaceKind(qualification) === 'none';
                set({
                  qualification,
                  ...(clearsSchool ? { institution: '', fieldOfStudy: '' } : {}),
                });
              }}
            >
              <option value="">Select education level</option>
              <option value={NO_FORMAL_SCHOOLING}>{NO_FORMAL_SCHOOLING}</option>
              {EDUCATION_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
              {value.qualification &&
              value.qualification !== NO_FORMAL_SCHOOLING &&
              !(EDUCATION_LEVELS as readonly string[]).includes(value.qualification) ? (
                <option value={value.qualification}>{value.qualification} (not in the list)</option>
              ) : null}
            </select>
            <p className="office-field-hint">Same education levels used on candidate profiles.</p>
          </div>
          {educationPlaceKind(value.qualification) === 'none' ? (
            <p className="office-field-hint office-form-span-full">
              No graduated school is asked for this education level.
            </p>
          ) : null}
          {educationPlaceKind(value.qualification) !== 'none' ? (
            <div className="form-input-group">
              <label htmlFor="oc-stream">Stream (field of study)</label>
              <input id="oc-stream" value={value.fieldOfStudy ?? ''} onChange={(e) => set({ fieldOfStudy: e.target.value })} />
            </div>
          ) : null}
          {educationPlaceKind(value.qualification) === '' && value.qualification ? (
            <div className="form-input-group">
              <label htmlFor="oc-school">Graduated school</label>
              <input id="oc-school" value={value.institution ?? ''} onChange={(e) => set({ institution: e.target.value })} />
            </div>
          ) : null}
          {educationPlaceKind(value.qualification) === 'school' ? (
            <div className="form-input-group">
              <label htmlFor="oc-school">School</label>
              <input
                id="oc-school"
                value={value.institution ?? ''}
                onChange={(e) => set({ institution: e.target.value })}
                placeholder="Primary or high school name"
              />
            </div>
          ) : null}
          {educationPlaceKind(value.qualification) === 'higher' ? (
            <div className="form-input-group">
              <label htmlFor="oc-school">College or university</label>
              <input
                id="oc-school"
                value={value.institution ?? ''}
                onChange={(e) => set({ institution: e.target.value })}
                placeholder="College or university name"
              />
            </div>
          ) : null}
          <div className="form-input-group">
            <label htmlFor="oc-lang">Language skills</label>
            <input
              id="oc-lang"
              value={value.languages ?? ''}
              onChange={(e) => set({ languages: e.target.value })}
              placeholder="Amharic, English"
            />
          </div>
        </div>
      </OfficeOptionalSection>

      <OfficeOptionalSection title="Personal details" hint="Private office records. These details are not shared with employers.">
        <div className="office-form-grid">
          <div className="form-input-group">
            <label htmlFor="oc-fan">National ID FAN number</label>
            <input
              id="oc-fan"
              inputMode="numeric"
              autoComplete="off"
              maxLength={16}
              pattern="\d{16}"
              title="Enter exactly 16 digits"
              aria-invalid={nationalIdShort}
              aria-describedby={nationalIdShort ? 'oc-fan-error' : undefined}
              className={nationalIdShort ? 'is-invalid' : undefined}
              value={nationalId}
              onChange={(e) => set({ nationalId: nationalIdDigits(e.target.value) })}
            />
            {nationalIdShort ? (
              <p id="oc-fan-error" className="office-field-error" role="alert">
                National ID FAN number must be exactly 16 digits ({nationalId.length}/16).
              </p>
            ) : (
              <p className="office-field-hint">16 digits only. Letters are not accepted.</p>
            )}
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-sex">Sex</label>
            <select id="oc-sex" value={value.gender ?? ''} onChange={(e) => set({ gender: e.target.value })}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              {value.gender && value.gender !== 'Male' && value.gender !== 'Female' ? (
                <option value={value.gender}>{value.gender}</option>
              ) : null}
            </select>
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-dob">Date of birth</label>
            <input id="oc-dob" type="date" value={value.dateOfBirth ?? ''} onChange={(e) => set({ dateOfBirth: e.target.value })} />
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-marital">Marital status</label>
            <ChoiceSelect
              id="oc-marital"
              value={value.maritalStatus ?? ''}
              options={MARITAL_STATUSES}
              placeholder="Select marital status"
              onChange={(maritalStatus) => set({ maritalStatus })}
            />
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-birth">Place of birth</label>
            <input id="oc-birth" value={value.placeOfBirth ?? ''} onChange={(e) => set({ placeOfBirth: e.target.value })} />
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-blood">Blood group</label>
            <ChoiceSelect
              id="oc-blood"
              value={value.bloodGroup ?? ''}
              options={BLOOD_GROUPS}
              placeholder="Select blood group"
              onChange={(bloodGroup) => set({ bloodGroup })}
            />
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-mother">Mother's name</label>
            <input id="oc-mother" value={value.motherName ?? ''} onChange={(e) => set({ motherName: e.target.value })} />
          </div>
          <div className="form-input-group office-form-span-full">
            <label htmlFor="oc-bank">Bank account <span className="office-optional">Optional</span></label>
            <input id="oc-bank" value={value.bankAccount ?? ''} onChange={(e) => set({ bankAccount: e.target.value })} />
          </div>
          <div className="form-input-group office-form-span-full">
            <label htmlFor="oc-notes">Notes</label>
            <textarea id="oc-notes" rows={2} value={value.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </div>
      </OfficeOptionalSection>

      <OfficeOptionalSection title="Emergency contact">
        <div className="office-form-grid">
          <div className="form-input-group">
            <label htmlFor="oc-em-name">Emergency contact</label>
            <input id="oc-em-name" value={value.emergencyContactName ?? ''} onChange={(e) => set({ emergencyContactName: e.target.value })} />
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-em-phone">Emergency phone</label>
            <EthiopianPhoneInput
              id="oc-em-phone"
              value={value.emergencyPhone ?? ''}
              onChange={(emergencyPhone) => set({ emergencyPhone })}
              aria-invalid={Boolean(value.emergencyPhone?.trim()) && !isValidEthiopianMobile(value.emergencyPhone)}
              aria-describedby={value.emergencyPhone?.trim() && !isValidEthiopianMobile(value.emergencyPhone) ? 'oc-em-phone-error' : undefined}
            />
            {value.emergencyPhone?.trim() && !isValidEthiopianMobile(value.emergencyPhone) ? (
              <p id="oc-em-phone-error" className="office-field-error" role="alert">
                Enter 9 digits after +251. Numbers only.
              </p>
            ) : (
              <p className="office-field-hint">Same as the candidate phone: +251 and 9 digits.</p>
            )}
          </div>
        </div>
      </OfficeOptionalSection>

      <OfficeOptionalSection title="Guarantor">
        <div className="office-form-grid">
          <div className="form-input-group">
            <label htmlFor="oc-g-name">Guarantor name <span className="office-optional">Optional</span></label>
            <input id="oc-g-name" value={value.guarantorName ?? ''} onChange={(e) => set({ guarantorName: e.target.value })} />
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-g-phone">Guarantor phone <span className="office-optional">Optional</span></label>
            <input id="oc-g-phone" value={value.guarantorPhone ?? ''} onChange={(e) => set({ guarantorPhone: e.target.value })} />
          </div>
          <div className="form-input-group">
            <label htmlFor="oc-g-fan">Guarantor national ID FAN number <span className="office-optional">Optional</span></label>
            <input id="oc-g-fan" value={value.guarantorNationalId ?? ''} onChange={(e) => set({ guarantorNationalId: e.target.value })} />
          </div>
        </div>
      </OfficeOptionalSection>

      <section className="office-form-section office-consent-section">
          <label className="office-form-consent">
            <input id="oc-consent" {...validationProps('oc-consent')} type="checkbox" checked={value.consent} onChange={(e) => set({ consent: e.target.checked })} />
            <span>The candidate agreed to be shared with employers{requireConsent && <span className="office-required"> *</span>}</span>
          </label>
          <p className="office-field-hint">{requireConsent ? 'Ask for permission and tick this box before saving. Only the employer-facing profile is shared.' : 'Turn this off if the candidate withdraws permission to share their profile.'}</p>
          {error('oc-consent')}
      </section>
    </div>
  );
};

export function useOfficeForm(initial?: OfficeCandidateInput) {
  return useState<OfficeCandidateInput>(initial ?? emptyOfficeCandidate());
}