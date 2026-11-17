import React, { useState } from 'react';
import { EthiopianPhoneInput } from '../EthiopianPhoneInput';
import type { OfficeCandidateInput, OfficeStatus } from '../../api/officeCandidates';

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

export const OfficeCandidateForm: React.FC<{
  value: OfficeCandidateInput;
  onChange: (value: OfficeCandidateInput) => void;
}> = ({ value, onChange }) => {
  const set = (patch: Partial<OfficeCandidateInput>) => onChange({ ...value, ...patch });
  return (
    <div className="stack">
      <section className="card stack">
        <h2>Identity</h2>
        <div className="form-input-group">
          <label htmlFor="oc-first">First name</label>
          <input id="oc-first" value={value.firstName} onChange={(e) => set({ firstName: e.target.value })} required />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-last">Last name</label>
          <input id="oc-last" value={value.lastName} onChange={(e) => set({ lastName: e.target.value })} required />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-phone">Phone</label>
          <EthiopianPhoneInput id="oc-phone" value={value.phone} onChange={(phone) => set({ phone })} required />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-fan">FAN number</label>
          <input id="oc-fan" value={value.nationalId ?? ''} onChange={(e) => set({ nationalId: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-sex">Sex</label>
          <input id="oc-sex" value={value.gender ?? ''} onChange={(e) => set({ gender: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-dob">Date of birth (Gregorian)</label>
          <input id="oc-dob" type="date" value={value.dateOfBirth ?? ''} onChange={(e) => set({ dateOfBirth: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-city">Current location</label>
          <input id="oc-city" value={value.city ?? ''} onChange={(e) => set({ city: e.target.value })} />
        </div>
      </section>

      <section className="card stack">
        <h2>Job and salary</h2>
        <div className="form-input-group">
          <label htmlFor="oc-title">Job title</label>
          <input id="oc-title" value={value.headline ?? ''} onChange={(e) => set({ headline: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-dept">Department</label>
          <input id="oc-dept" value={value.department ?? ''} onChange={(e) => set({ department: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-cat">Category</label>
          <input id="oc-cat" value={value.category ?? ''} onChange={(e) => set({ category: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-grade">Job grade</label>
          <input id="oc-grade" value={value.jobGrade ?? ''} onChange={(e) => set({ jobGrade: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-salary">Basic salary expectation (ETB)</label>
          <input
            id="oc-salary"
            inputMode="decimal"
            value={value.expectedSalary ?? ''}
            onChange={(e) => set({ expectedSalary: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-transport">Transport allowance</label>
          <input id="oc-transport" value={value.transportAllowance ?? ''} onChange={(e) => set({ transportAllowance: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-house">House / other allowance</label>
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
        <div className="form-input-group">
          <label htmlFor="oc-status">Status</label>
          <select id="oc-status" value={value.officeStatus ?? 'new'} onChange={(e) => set({ officeStatus: e.target.value as OfficeStatus })}>
            {STATUSES.map((status) => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="card stack">
        <h2>Education, languages and experience</h2>
        <div className="form-input-group">
          <label htmlFor="oc-edu">Education level</label>
          <input id="oc-edu" value={value.qualification ?? ''} onChange={(e) => set({ qualification: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-stream">Stream</label>
          <input id="oc-stream" value={value.fieldOfStudy ?? ''} onChange={(e) => set({ fieldOfStudy: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-school">Graduated school</label>
          <input id="oc-school" value={value.institution ?? ''} onChange={(e) => set({ institution: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-lang">Language skills</label>
          <input id="oc-lang" value={value.languages ?? ''} onChange={(e) => set({ languages: e.target.value })} placeholder="Amharic, English" />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-exp">Experience in other companies</label>
          <textarea id="oc-exp" rows={4} value={value.summary ?? ''} onChange={(e) => set({ summary: e.target.value })} />
        </div>
      </section>

      <section className="card stack">
        <h2>Personal, emergency contact and guarantor</h2>
        <p className="muted">These details stay in the office record. Employers never see them.</p>
        <div className="form-input-group">
          <label htmlFor="oc-marital">Marital status</label>
          <input id="oc-marital" value={value.maritalStatus ?? ''} onChange={(e) => set({ maritalStatus: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-birth">Place of birth</label>
          <input id="oc-birth" value={value.placeOfBirth ?? ''} onChange={(e) => set({ placeOfBirth: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-blood">Blood group</label>
          <input id="oc-blood" value={value.bloodGroup ?? ''} onChange={(e) => set({ bloodGroup: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-mother">Mother's name</label>
          <input id="oc-mother" value={value.motherName ?? ''} onChange={(e) => set({ motherName: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-em-name">Emergency contact</label>
          <input id="oc-em-name" value={value.emergencyContactName ?? ''} onChange={(e) => set({ emergencyContactName: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-em-rel">Relationship</label>
          <input id="oc-em-rel" value={value.emergencyRelationship ?? ''} onChange={(e) => set({ emergencyRelationship: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-em-phone">Emergency phone</label>
          <input id="oc-em-phone" value={value.emergencyPhone ?? ''} onChange={(e) => set({ emergencyPhone: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-g-name">Guarantor name</label>
          <input id="oc-g-name" value={value.guarantorName ?? ''} onChange={(e) => set({ guarantorName: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-g-phone">Guarantor phone</label>
          <input id="oc-g-phone" value={value.guarantorPhone ?? ''} onChange={(e) => set({ guarantorPhone: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-g-fan">Guarantor FAN</label>
          <input id="oc-g-fan" value={value.guarantorNationalId ?? ''} onChange={(e) => set({ guarantorNationalId: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-bank">Bank account</label>
          <input id="oc-bank" value={value.bankAccount ?? ''} onChange={(e) => set({ bankAccount: e.target.value })} />
        </div>
        <div className="form-input-group">
          <label htmlFor="oc-notes">Notes</label>
          <textarea id="oc-notes" rows={3} value={value.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
        </div>
        <label>
          <input type="checkbox" checked={value.consent} onChange={(e) => set({ consent: e.target.checked })} />{' '}
          The candidate agreed to be shared with employers
        </label>
      </section>
    </div>
  );
};

export function useOfficeForm(initial?: OfficeCandidateInput) {
  return useState<OfficeCandidateInput>(initial ?? emptyOfficeCandidate());
}
