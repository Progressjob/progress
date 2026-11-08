import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { candidateApi } from '../api/candidate';
import { apiDownloadFile, apiOpenFile } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  EXPERIENCE_STAGES,
  GENDER_OPTIONS,
  MANAGERIAL_EXPERIENCE_OPTIONS,
  WORK_STATUS_OPTIONS,
} from '../constants/candidateProfile';
import { EDUCATION_LEVELS } from '../constants/educationLevels';
import { EthiopianPhoneInput } from '../components/EthiopianPhoneInput';
import {
  experienceStageSelectValue,
  hasNoExperienceFlag,
  workStatusSelectValue,
} from '../utils/candidateProfile';
import { isValidEthiopianMobile, toEthiopianE164 } from '../utils/ethiopianPhone';
import type {
  CandidateCertification,
  CandidateEducation,
  CandidateExperience,
  CandidateLanguage,
  CandidateProfile,
  CandidateResume,
} from '../types/api';

type OpenPanel =
  | null
  | { section: 'profile' | 'summary' }
  | { section: 'experience' | 'education' | 'certification' | 'language'; id: string | 'new' };

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1969 }, (_, i) => String(CURRENT_YEAR - i));
const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];
const EMPLOYMENT_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Freelance'];
const SALARY_OPTIONS = [
  'Confidential',
  'Negotiable',
  'Below 5,000 ETB',
  '5,000 – 10,000 ETB',
  '10,000 – 15,000 ETB',
  '15,000 – 20,000 ETB',
  '20,000 – 30,000 ETB',
  '30,000 – 50,000 ETB',
  '50,000 – 80,000 ETB',
  'Above 80,000 ETB',
];
const PROFICIENCIES = ['Native', 'Fluent', 'Intermediate', 'Basic'];
const MAX_CV_BYTES = 5 * 1024 * 1024;

function partsFromDate(value?: string | null): { year: string; month: string } {
  if (!value) return { year: '', month: '' };
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return { year: '', month: '' };
  return {
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1).padStart(2, '0'),
  };
}

function yearFromDate(value?: string | null): string {
  return partsFromDate(value).year;
}

function yearToDate(year: string, month = '01'): string | undefined {
  return year ? `${year}-${month || '01'}-01` : undefined;
}

function formatRange(start?: string | null, end?: string | null, current?: boolean): string {
  const fmt = (value: string) =>
    new Date(value).toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const left = start ? fmt(start) : '';
  const right = current ? 'Present' : end ? fmt(end) : '';
  return [left, right].filter(Boolean).join(' – ');
}

function wrapText(value: string, start: number, end: number, before: string, after = before) {
  const selected = value.slice(start, end) || 'text';
  return value.slice(0, start) + before + selected + after + value.slice(end);
}

function prefixLines(value: string, start: number, end: number, marker: string) {
  const from = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const to = end;
  const block = value.slice(from, to) || 'item';
  const next = block
    .split('\n')
    .map((line) => (line.startsWith(marker) ? line : `${marker}${line || 'item'}`))
    .join('\n');
  return value.slice(0, from) + next + value.slice(to);
}

function resumeFileName(resume: CandidateResume): string {
  return resume.file?.originalFilename || resume.file?.originalName || resume.title;
}

function isCvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx');
}

function IconPlus() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M12 20h9" strokeWidth="2" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" strokeWidth="2" />
    </svg>
  );
}

const ComposerActions: React.FC<{
  onCancel: () => void;
  pending?: boolean;
  saveLabel?: string;
  disabled?: boolean;
}> = ({ onCancel, pending, saveLabel = 'Save', disabled }) => (
  <div className="pb-composer-actions">
    <button type="button" className="btn btn-secondary" onClick={onCancel}>
      Cancel
    </button>
    {!disabled && (
      <button type="submit" className="btn" disabled={pending}>
        {pending ? 'Saving…' : saveLabel}
      </button>
    )}
  </div>
);

export const CandidateProfilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const cvInputRef = useRef<HTMLInputElement | null>(null);
  const openedForEdit = useRef(false);

  const [open, setOpen] = useState<OpenPanel>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cvDrag, setCvDrag] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [headline, setHeadline] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [careerLevel, setCareerLevel] = useState('');
  const [managerialExperience, setManagerialExperience] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [workStatus, setWorkStatus] = useState('');
  const [summary, setSummary] = useState('');
  const [skillName, setSkillName] = useState('');

  const dutiesRef = useRef<HTMLTextAreaElement | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [workingCity, setWorkingCity] = useState('');
  const [salary, setSalary] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [expStartMonth, setExpStartMonth] = useState('');
  const [expStart, setExpStart] = useState('');
  const [expEndMonth, setExpEndMonth] = useState('');
  const [expEnd, setExpEnd] = useState('');
  const [expCurrent, setExpCurrent] = useState(false);
  const [expNone, setExpNone] = useState(false);
  const [expDescription, setExpDescription] = useState('');

  const [institution, setInstitution] = useState('');
  const [qualification, setQualification] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [eduStart, setEduStart] = useState('');
  const [eduEnd, setEduEnd] = useState('');
  const [eduCurrent, setEduCurrent] = useState(false);

  const [certName, setCertName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issuedYear, setIssuedYear] = useState('');
  const [credentialId, setCredentialId] = useState('');

  const [languageName, setLanguageName] = useState('');
  const [speaking, setSpeaking] = useState('Fluent');
  const [reading, setReading] = useState('Fluent');
  const [writing, setWriting] = useState('Fluent');
  const [listening, setListening] = useState('Fluent');

  const profileQuery = useQuery({
    queryKey: ['candidate', 'profile'],
    queryFn: () => candidateApi.getProfile(),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['candidate', 'profile'] });
    await queryClient.invalidateQueries({ queryKey: ['featured-jobs'] });
  };

  const closePanel = () => {
    setOpen(null);
    if (searchParams.get('edit') === '1') {
      const next = new URLSearchParams(searchParams);
      next.delete('edit');
      setSearchParams(next, { replace: true });
    }
  };

  const saveProfile = useMutation({
    mutationFn: () => {
      const normalizedPhone = phone.trim() ? toEthiopianE164(phone) : '';
      if (phone.trim() && (!normalizedPhone || !isValidEthiopianMobile(phone))) {
        throw new Error('Enter a valid Ethiopian mobile number (9 digits starting with 7 or 9).');
      }
      return candidateApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender: gender.trim() || null,
        headline: headline.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        careerLevel: careerLevel.trim() || null,
        managerialExperience: managerialExperience.trim() || null,
        yearsExperience: EXPERIENCE_STAGES.find((stage) => stage.label === careerLevel)?.years ?? null,
        city: city.trim() || null,
        region: region.trim() || null,
        country: country.trim() || null,
        phone: normalizedPhone || '',
        availabilityStatus: workStatus || null,
      });
    },
    onSuccess: async () => {
      setActionError(null);
      closePanel();
      await invalidate();
      await refreshUser();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const saveSummary = useMutation({
    mutationFn: () => candidateApi.updateProfile({ summary: summary.trim() || undefined }),
    onSuccess: async () => {
      setActionError(null);
      closePanel();
      await invalidate();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const saveExperience = useMutation({
    mutationFn: async () => {
      const editingId = open && open.section === 'experience' && open.id !== 'new' ? open.id : null;
      if (expNone && !editingId) {
        return candidateApi.updateProfile({ yearsExperience: 0 });
      }
      const payload = {
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        workingCity: workingCity.trim() || undefined,
        salary: salary || undefined,
        employmentType: employmentType || undefined,
        startDate: yearToDate(expStart, expStartMonth),
        endDate: expCurrent ? undefined : yearToDate(expEnd, expEndMonth),
        isCurrent: expCurrent,
        description: expDescription.trim() || undefined,
      };
      if (editingId) return candidateApi.updateExperience(editingId, payload);
      const created = await candidateApi.addExperience(payload);
      await candidateApi.updateProfile({ yearsExperience: null });
      return created;
    },
    onSuccess: async () => {
      setActionError(null);
      closePanel();
      await invalidate();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const markNoExperience = useMutation({
    mutationFn: () => candidateApi.updateProfile({ yearsExperience: 0 }),
    onSuccess: async () => {
      setActionError(null);
      closePanel();
      await invalidate();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const clearNoExperience = useMutation({
    mutationFn: () => candidateApi.updateProfile({ yearsExperience: null }),
    onSuccess: async () => {
      setActionError(null);
      await invalidate();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const saveEducation = useMutation({
    mutationFn: () => {
      const payload = {
        institution: institution.trim(),
        qualification: qualification.trim() || undefined,
        fieldOfStudy: fieldOfStudy.trim() || undefined,
        startDate: yearToDate(eduStart),
        endDate: eduCurrent ? undefined : yearToDate(eduEnd),
        isCurrent: eduCurrent,
      };
      const editingId = open && open.section === 'education' && open.id !== 'new' ? open.id : null;
      return editingId
        ? candidateApi.updateEducation(editingId, payload)
        : candidateApi.addEducation(payload);
    },
    onSuccess: async () => {
      setActionError(null);
      closePanel();
      await invalidate();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const saveCertification = useMutation({
    mutationFn: () => {
      const payload = {
        name: certName.trim(),
        issuer: issuer.trim() || undefined,
        issuedDate: yearToDate(issuedYear),
        credentialId: credentialId.trim() || undefined,
      };
      const editingId = open && open.section === 'certification' && open.id !== 'new' ? open.id : null;
      return editingId
        ? candidateApi.updateCertification(editingId, payload)
        : candidateApi.addCertification(payload);
    },
    onSuccess: async () => {
      setActionError(null);
      closePanel();
      await invalidate();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const saveLanguage = useMutation({
    mutationFn: () => {
      const payload = {
        name: languageName.trim(),
        proficiency: speaking,
        reading,
        writing,
        listening,
      };
      const editingId = open && open.section === 'language' && open.id !== 'new' ? open.id : null;
      return editingId
        ? candidateApi.updateLanguage(editingId, payload)
        : candidateApi.addLanguage(payload);
    },
    onSuccess: async () => {
      setActionError(null);
      closePanel();
      await invalidate();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const saveSkill = useMutation({
    mutationFn: async () => {
      const current = profileQuery.data?.skills ?? [];
      const next: Array<{ name: string }> = [];
      const seen = new Set<string>();
      for (const name of [...current.map((s) => s.skill.name), skillName.trim()]) {
        const key = name.toLowerCase();
        if (!name || seen.has(key)) continue;
        seen.add(key);
        next.push({ name });
      }
      return candidateApi.replaceSkills(next);
    },
    onSuccess: async () => {
      setActionError(null);
      setSkillName('');
      await invalidate();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (input: { kind: string; id: string }) => {
      if (input.kind === 'experience') return candidateApi.deleteExperience(input.id);
      if (input.kind === 'education') return candidateApi.deleteEducation(input.id);
      if (input.kind === 'certification') return candidateApi.deleteCertification(input.id);
      if (input.kind === 'language') return candidateApi.deleteLanguage(input.id);
      if (input.kind === 'skill') {
        const current = profileQuery.data?.skills ?? [];
        return candidateApi.replaceSkills(
          current.filter((s) => s.skillId !== input.id).map((s) => ({ name: s.skill.name })),
        );
      }
      return Promise.resolve();
    },
    onSuccess: async () => {
      setActionError(null);
      await invalidate();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const cvMutation = useMutation({
    mutationFn: (file: File) => {
      if (!isCvFile(file)) throw new Error('Please upload a PDF, DOC, or DOCX file.');
      if (file.size > MAX_CV_BYTES) throw new Error('CV must be 5 MB or smaller.');
      return candidateApi.uploadResume(file, file.name.replace(/\.[^.]+$/, ''));
    },
    onSuccess: async () => {
      setActionError(null);
      if (cvInputRef.current) cvInputRef.current.value = '';
      await invalidate();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const pending =
    saveProfile.isPending ||
    saveSummary.isPending ||
    saveExperience.isPending ||
    saveEducation.isPending ||
    saveCertification.isPending ||
    saveLanguage.isPending ||
    saveSkill.isPending ||
    cvMutation.isPending ||
    markNoExperience.isPending;

  const openProfile = (profile: CandidateProfile) => {
    setFirstName(profile.user?.firstName ?? '');
    setLastName(profile.user?.lastName ?? '');
    setGender(profile.gender ?? '');
    setHeadline(profile.headline ?? '');
    setWebsiteUrl(profile.websiteUrl ?? '');
    setCareerLevel(experienceStageSelectValue(profile));
    setManagerialExperience(profile.managerialExperience ?? '');
    setCity(profile.city ?? '');
    setRegion(profile.region ?? '');
    setCountry(profile.country ?? '');
    setPhone(profile.user?.phone ?? '');
    setWorkStatus(workStatusSelectValue(profile));
    setOpen({ section: 'profile' });
  };

  const openSummary = (profile: CandidateProfile) => {
    setSummary(profile.summary ?? '');
    setOpen({ section: 'summary' });
  };

  const openExperience = (item?: CandidateExperience) => {
    const start = partsFromDate(item?.startDate);
    const end = partsFromDate(item?.endDate);
    setJobTitle(item?.jobTitle ?? '');
    setCompanyName(item?.companyName ?? '');
    setWorkingCity(item?.workingCity ?? '');
    setSalary(item?.salary ?? '');
    setEmploymentType(item?.employmentType ?? '');
    setExpStartMonth(start.month);
    setExpStart(start.year);
    setExpEndMonth(end.month);
    setExpEnd(end.year);
    setExpCurrent(item?.isCurrent ?? false);
    setExpNone(!item && hasNoExperienceFlag(profileQuery.data!));
    setExpDescription(item?.description ?? '');
    setOpen({ section: 'experience', id: item?.id ?? 'new' });
  };

  const openEducation = (item?: CandidateEducation) => {
    setInstitution(item?.institution ?? '');
    setQualification(item?.qualification ?? '');
    setFieldOfStudy(item?.fieldOfStudy ?? '');
    setEduStart(yearFromDate(item?.startDate));
    setEduEnd(yearFromDate(item?.endDate));
    setEduCurrent(item?.isCurrent ?? false);
    setOpen({ section: 'education', id: item?.id ?? 'new' });
  };

  const openCertification = (item?: CandidateCertification) => {
    setCertName(item?.name ?? '');
    setIssuer(item?.issuer ?? '');
    setIssuedYear(yearFromDate(item?.issuedDate));
    setCredentialId(item?.credentialId ?? '');
    setOpen({ section: 'certification', id: item?.id ?? 'new' });
  };

  const openLanguage = (item?: CandidateLanguage) => {
    setLanguageName(item?.name ?? '');
    setSpeaking(item?.proficiency ?? 'Fluent');
    setReading(item?.reading ?? item?.proficiency ?? 'Fluent');
    setWriting(item?.writing ?? item?.proficiency ?? 'Fluent');
    setListening(item?.listening ?? item?.proficiency ?? 'Fluent');
    setOpen({ section: 'language', id: item?.id ?? 'new' });
  };

  const handleCvFile = (file?: File | null) => {
    if (!file) return;
    setActionError(null);
    cvMutation.mutate(file);
  };

  useEffect(() => {
    if (searchParams.get('edit') !== '1') {
      openedForEdit.current = false;
      return;
    }
    if (!profileQuery.data) return;
    if (!openedForEdit.current) {
      openedForEdit.current = true;
      openProfile(profileQuery.data);
    }
  }, [searchParams, profileQuery.data]);

  useEffect(() => {
    if (open?.section !== 'profile') return;
    const panel = document.getElementById('profile-edit');
    if (!panel) return;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const field = panel.querySelector<HTMLElement>('input, select, textarea');
    field?.focus({ preventScroll: true });
  }, [open?.section]);

  if (profileQuery.isLoading) {
    return <div className="pb-card">Loading your profile…</div>;
  }

  if (profileQuery.isError) {
    return (
      <div className="pb-card alert-error">
        Failed to load profile: {(profileQuery.error as Error).message}
      </div>
    );
  }

  const profile = profileQuery.data!;
  const resumes = profile.resumes ?? [];
  const activeCv = resumes.find((r) => r.isDefault) ?? resumes[0];
  const noExperience = hasNoExperienceFlag(profile);
  const experiences = profile.experiences ?? [];
  const educations = profile.educations ?? [];
  const certifications = profile.certifications ?? [];
  const languages = profile.languages ?? [];
  const skills = profile.skills ?? [];

  const profileDirty =
    firstName !== (profile.user?.firstName ?? '') ||
    lastName !== (profile.user?.lastName ?? '') ||
    gender !== (profile.gender ?? '') ||
    headline !== (profile.headline ?? '') ||
    websiteUrl !== (profile.websiteUrl ?? '') ||
    careerLevel !== experienceStageSelectValue(profile) ||
    managerialExperience !== (profile.managerialExperience ?? '') ||
    city !== (profile.city ?? '') ||
    region !== (profile.region ?? '') ||
    country !== (profile.country ?? '') ||
    phone !== (profile.user?.phone ?? '') ||
    workStatus !== workStatusSelectValue(profile);
  const summaryDirty = summary !== (profile.summary ?? '');
  const applyDutyFormat = (kind: 'bold' | 'italic' | 'underline' | 'ul' | 'ol') => {
    const area = dutiesRef.current;
    if (!area) return;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const next =
      kind === 'bold'
        ? wrapText(expDescription, start, end, '**')
        : kind === 'italic'
          ? wrapText(expDescription, start, end, '*')
          : kind === 'underline'
            ? wrapText(expDescription, start, end, '_')
            : kind === 'ul'
              ? prefixLines(expDescription, start, end, '- ')
              : prefixLines(expDescription, start, end, '1. ');
    setExpDescription(next);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start, start + (next.length - expDescription.length) + (end - start));
    });
  };

  const experienceReady = expNone || Boolean(jobTitle.trim() && companyName.trim());
  const educationReady = Boolean(institution.trim());
  const certificationReady = Boolean(certName.trim());
  const languageReady = Boolean(languageName.trim());

  const experienceComposer = (
    <form
      className="pb-composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (experienceReady) saveExperience.mutate();
      }}
    >
      {open?.section === 'experience' && open.id === 'new' && (
        <label className="pb-check">
          <input
            type="checkbox"
            checked={expNone}
            onChange={(e) => setExpNone(e.target.checked)}
          />
          I do not have any work experience
        </label>
      )}
      {!expNone && (
        <>
          <div className="field">
            <label htmlFor="pb-job">Position title *</label>
            <input
              id="pb-job"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Frontend Engineer"
            />
          </div>
          <div className="pb-composer-grid">
            <div className="field">
              <label htmlFor="pb-co">Company name *</label>
              <input
                id="pb-co"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Wegagen Bank"
              />
            </div>
            <div className="field">
              <label htmlFor="pb-city-work">Working city</label>
              <input
                id="pb-city-work"
                value={workingCity}
                onChange={(e) => setWorkingCity(e.target.value)}
                placeholder="e.g. Addis Ababa"
              />
            </div>
            <div className="field">
              <label htmlFor="pb-salary">Salary</label>
              <select id="pb-salary" value={salary} onChange={(e) => setSalary(e.target.value)}>
                <option value="">Salary</option>
                {SALARY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pb-etype">Employment type</label>
              <select id="pb-etype" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
                <option value="">Select type</option>
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="pb-check">
            <input type="checkbox" checked={expCurrent} onChange={(e) => setExpCurrent(e.target.checked)} />
            I currently work here
          </label>
          <div className="pb-composer-grid">
            <div className="field">
              <label htmlFor="pb-exp-start-month">Start month</label>
              <select
                id="pb-exp-start-month"
                value={expStartMonth}
                onChange={(e) => setExpStartMonth(e.target.value)}
              >
                <option value="">Month</option>
                {MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pb-exp-start">Start year</label>
              <select id="pb-exp-start" value={expStart} onChange={(e) => setExpStart(e.target.value)}>
                <option value="">Year</option>
                {YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            {!expCurrent && (
              <>
                <div className="field">
                  <label htmlFor="pb-exp-end-month">End month</label>
                  <select
                    id="pb-exp-end-month"
                    value={expEndMonth}
                    onChange={(e) => setExpEndMonth(e.target.value)}
                  >
                    <option value="">Month</option>
                    {MONTHS.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="pb-exp-end">End year</label>
                  <select id="pb-exp-end" value={expEnd} onChange={(e) => setExpEnd(e.target.value)}>
                    <option value="">Year</option>
                    {YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
          <div className="field">
            <label htmlFor="pb-exp-desc">Job duties</label>
            <div className="pb-duty-box">
              <div className="pb-duty-toolbar" aria-label="Formatting">
                <button type="button" onClick={() => applyDutyFormat('bold')} title="Bold">
                  <strong>B</strong>
                </button>
                <button type="button" onClick={() => applyDutyFormat('italic')} title="Italic">
                  <em>I</em>
                </button>
                <button type="button" onClick={() => applyDutyFormat('underline')} title="Underline">
                  <span style={{ textDecoration: 'underline' }}>U</span>
                </button>
                <button type="button" onClick={() => applyDutyFormat('ul')} title="Bulleted list">
                  ≡
                </button>
                <button type="button" onClick={() => applyDutyFormat('ol')} title="Numbered list">
                  ☰
                </button>
              </div>
              <textarea
                id="pb-exp-desc"
                ref={dutiesRef}
                rows={5}
                value={expDescription}
                onChange={(e) => setExpDescription(e.target.value)}
                placeholder="Key responsibilities..."
              />
            </div>
          </div>
        </>
      )}
      <ComposerActions
        onCancel={closePanel}
        pending={pending}
        disabled={!experienceReady}
        saveLabel="Save experience"
      />
      {!experienceReady && !expNone && (
        <div className="pb-composer-hint">Add a title and company, then Save will appear.</div>
      )}
    </form>
  );

  const educationComposer = (
    <form
      className="pb-composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (educationReady) saveEducation.mutate();
      }}
    >
      <div className="pb-composer-grid">
        <div className="field pb-span-2">
          <label htmlFor="pb-school">School or university *</label>
          <input
            id="pb-school"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="e.g. Addis Ababa University"
          />
        </div>
        <div className="field">
          <label htmlFor="pb-field">Field of study</label>
          <input
            id="pb-field"
            value={fieldOfStudy}
            onChange={(e) => setFieldOfStudy(e.target.value)}
            placeholder="e.g. Computer Science"
          />
        </div>
        <div className="field">
          <label htmlFor="pb-qual">Level</label>
          <select id="pb-qual" value={qualification} onChange={(e) => setQualification(e.target.value)}>
            <option value="">Optional</option>
            {EDUCATION_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pb-edu-start">Start year</label>
          <select id="pb-edu-start" value={eduStart} onChange={(e) => setEduStart(e.target.value)}>
            <option value="">Optional</option>
            {YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        {!eduCurrent && (
          <div className="field">
            <label htmlFor="pb-edu-end">End year</label>
            <select id="pb-edu-end" value={eduEnd} onChange={(e) => setEduEnd(e.target.value)}>
              <option value="">Optional</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <label className="pb-check">
        <input type="checkbox" checked={eduCurrent} onChange={(e) => setEduCurrent(e.target.checked)} />
        I’m still studying here
      </label>
      <ComposerActions onCancel={closePanel} pending={pending} disabled={!educationReady} />
      {!educationReady && (
        <div className="pb-composer-hint">Type the school name and Save will appear.</div>
      )}
    </form>
  );

  const welcome = searchParams.get('welcome') === '1';

  return (
    <>
      {welcome && (
        <div className="pb-welcome">
          <p>
            Your Google email is already verified. Add a photo, CV, and a few details so employers can find you.
            Thin profiles are less likely to get hired.
          </p>
          <Link to="/jobs" className="pb-welcome-skip">
            Skip for now
          </Link>
        </div>
      )}

      {actionError && (
        <div className="alert-error" style={{ marginBottom: '1rem' }}>
          {actionError}
        </div>
      )}

      {open?.section === 'profile' && (
        <section
          id="profile-edit"
          className="pb-card"
          style={{ marginBottom: '1rem', scrollMarginTop: '1rem' }}
        >
          <form
            className="pb-composer"
            style={{ marginTop: 0 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (profileDirty) saveProfile.mutate();
            }}
          >
            <div className="pb-composer-grid">
              <div className="field">
                <label htmlFor="pb-first">First name</label>
                <input id="pb-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="pb-last">Last name</label>
                <input id="pb-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="pb-gender">Gender</label>
                <select id="pb-gender" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">Not specified</option>
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="pb-phone">Phone</label>
                <EthiopianPhoneInput id="pb-phone" value={phone} onChange={setPhone} />
              </div>
              <div className="field pb-span-2">
                <label htmlFor="pb-headline">Profession</label>
                <input
                  id="pb-headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. IT, Computer Science"
                />
              </div>
              <div className="field">
                <label htmlFor="pb-city">City</label>
                <input id="pb-city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="pb-region">Region</label>
                <input id="pb-region" value={region} onChange={(e) => setRegion(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="pb-country">Country</label>
                <input id="pb-country" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="pb-website">Website</label>
                <input
                  id="pb-website"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="www.profile.com"
                />
              </div>
              <div className="field">
                <label htmlFor="pb-career">Career level</label>
                <select id="pb-career" value={careerLevel} onChange={(e) => setCareerLevel(e.target.value)}>
                  <option value="">Not specified</option>
                  {EXPERIENCE_STAGES.map((stage) => (
                    <option key={stage.label} value={stage.label}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="pb-managerial">Managerial experience</label>
                <select
                  id="pb-managerial"
                  value={managerialExperience}
                  onChange={(e) => setManagerialExperience(e.target.value)}
                >
                  <option value="">Not specified</option>
                  {MANAGERIAL_EXPERIENCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field pb-span-2">
                <label htmlFor="pb-work-status">Work status</label>
                <select
                  id="pb-work-status"
                  value={workStatus}
                  onChange={(e) => setWorkStatus(e.target.value)}
                >
                  <option value="">Select work status</option>
                  {WORK_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <ComposerActions onCancel={closePanel} pending={pending} disabled={!profileDirty} />
            {!profileDirty && <div className="pb-composer-hint">Change any field to save.</div>}
          </form>
        </section>
      )}

      <div className="profile-builder-grid">
        <div className="profile-builder-main">
          <section className="pb-card">
            <div className="pb-card-head">
              <h3 className="pb-card-title">Professional summary</h3>
              {open?.section !== 'summary' && (
                <button type="button" className="pb-edit" onClick={() => openSummary(profile)}>
                  <IconPencil /> Edit
                </button>
              )}
            </div>
            {open?.section === 'summary' ? (
              <form
                className="pb-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (summaryDirty) saveSummary.mutate();
                }}
              >
                <div className="field">
                  <label htmlFor="pb-summary">A short intro for employers</label>
                  <textarea
                    id="pb-summary"
                    rows={5}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Who you are, what you do, and what you’re looking for."
                  />
                </div>
                <ComposerActions onCancel={closePanel} pending={pending} disabled={!summaryDirty} />
                {!summaryDirty && <div className="pb-composer-hint">Edit the text to save.</div>}
              </form>
            ) : profile.summary?.trim() ? (
              <p className="pb-body">{profile.summary}</p>
            ) : (
              <button type="button" className="pb-empty pb-empty-btn" onClick={() => openSummary(profile)}>
                Add a short summary so employers know you at a glance.
              </button>
            )}
          </section>

          <section className="pb-card">
            <div className="pb-card-head">
              <h3 className="pb-card-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="2" y="7" width="20" height="14" rx="2" strokeWidth="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" strokeWidth="2" />
                </svg>
                Work experience
              </h3>
              {!(open?.section === 'experience' && open.id === 'new') && (
                <button type="button" className="pb-add" onClick={() => openExperience()}>
                  <IconPlus /> Add
                </button>
              )}
            </div>

            {experiences.length === 0 && open?.section !== 'experience' && (
              <div className="pb-choice-row">
                <button
                  type="button"
                  className={`pb-choice ${noExperience ? 'is-active' : ''}`}
                  disabled={markNoExperience.isPending}
                  onClick={() =>
                    noExperience ? clearNoExperience.mutate() : markNoExperience.mutate()
                  }
                >
                  {noExperience ? 'No experience saved' : 'I have no work experience'}
                </button>
                <button type="button" className="pb-choice" onClick={() => openExperience()}>
                  Add a role
                </button>
              </div>
            )}

            {open?.section === 'experience' && open.id === 'new' && experienceComposer}

            {experiences.map((item) =>
              open?.section === 'experience' && open.id === item.id ? (
                <div key={item.id}>{experienceComposer}</div>
              ) : (
                <article key={item.id} className="pb-entry">
                  <div className="pb-entry-top">
                    <div>
                      <h3>{item.jobTitle}</h3>
                      <p>
                        {[item.companyName, item.workingCity, item.employmentType].filter(Boolean).join(' · ')}
                      </p>
                      <p>{formatRange(item.startDate, item.endDate, item.isCurrent)}</p>
                      {item.salary && <p>{item.salary}</p>}
                      {item.description && <p className="pb-duties">{item.description}</p>}
                    </div>
                    <div className="pb-entry-actions">
                      <button
                        type="button"
                        className="pb-icon-btn"
                        aria-label="Edit experience"
                        onClick={() => openExperience(item)}
                      >
                        <IconPencil />
                      </button>
                      <button
                        type="button"
                        className="pb-icon-btn"
                        aria-label="Remove experience"
                        onClick={() => deleteMutation.mutate({ kind: 'experience', id: item.id })}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </article>
              ),
            )}
          </section>

          <section className="pb-card">
            <div className="pb-card-head">
              <h3 className="pb-card-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" strokeWidth="2" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" strokeWidth="2" />
                </svg>
                Education
              </h3>
              {!(open?.section === 'education' && open.id === 'new') && (
                <button type="button" className="pb-add" onClick={() => openEducation()}>
                  <IconPlus /> Add
                </button>
              )}
            </div>
            {educations.length === 0 && open?.section !== 'education' && (
              <button type="button" className="pb-empty pb-empty-btn" onClick={() => openEducation()}>
                Add a school, college, or program. Only the name is required.
              </button>
            )}
            {open?.section === 'education' && open.id === 'new' && educationComposer}
            {educations.map((item) =>
              open?.section === 'education' && open.id === item.id ? (
                <div key={item.id}>{educationComposer}</div>
              ) : (
                <article key={item.id} className="pb-entry">
                  <div className="pb-entry-top">
                    <div>
                      <h3>{item.institution}</h3>
                      <p>{[item.qualification, item.fieldOfStudy].filter(Boolean).join(' · ')}</p>
                      <p>{formatRange(item.startDate, item.endDate, item.isCurrent)}</p>
                    </div>
                    <div className="pb-entry-actions">
                      <button
                        type="button"
                        className="pb-icon-btn"
                        aria-label="Edit education"
                        onClick={() => openEducation(item)}
                      >
                        <IconPencil />
                      </button>
                      <button
                        type="button"
                        className="pb-icon-btn"
                        aria-label="Remove education"
                        onClick={() => deleteMutation.mutate({ kind: 'education', id: item.id })}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </article>
              ),
            )}
          </section>

          <section className="pb-card">
            <div className="pb-card-head">
              <h3 className="pb-card-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="8" r="6" strokeWidth="2" />
                  <path d="M8.2 13.2 7 22l5-3 5 3-1.2-8.8" strokeWidth="2" />
                </svg>
                Certifications
              </h3>
              {!(open?.section === 'certification' && open.id === 'new') && (
                <button type="button" className="pb-add" onClick={() => openCertification()}>
                  <IconPlus /> Add
                </button>
              )}
            </div>
            {open?.section === 'certification' && open.id === 'new' && (
              <form
                className="pb-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (certificationReady) saveCertification.mutate();
                }}
              >
                <div className="pb-composer-grid">
                  <div className="field pb-span-2">
                    <label htmlFor="pb-cert">Certificate name *</label>
                    <input
                      id="pb-cert"
                      value={certName}
                      onChange={(e) => setCertName(e.target.value)}
                      placeholder="e.g. AWS Certified Solutions Architect"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="pb-issuer">Issued by</label>
                    <input
                      id="pb-issuer"
                      value={issuer}
                      onChange={(e) => setIssuer(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="pb-issued">Year</label>
                    <select id="pb-issued" value={issuedYear} onChange={(e) => setIssuedYear(e.target.value)}>
                      <option value="">Optional</option>
                      {YEAR_OPTIONS.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <ComposerActions onCancel={closePanel} pending={pending} disabled={!certificationReady} />
                {!certificationReady && (
                  <div className="pb-composer-hint">Type the certificate name to save.</div>
                )}
              </form>
            )}
            {certifications.map((item) =>
              open?.section === 'certification' && open.id === item.id ? (
                <form
                  key={item.id}
                  className="pb-composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (certificationReady) saveCertification.mutate();
                  }}
                >
                  <div className="pb-composer-grid">
                    <div className="field pb-span-2">
                      <label htmlFor={`pb-cert-${item.id}`}>Certificate name *</label>
                      <input
                        id={`pb-cert-${item.id}`}
                        value={certName}
                        onChange={(e) => setCertName(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`pb-issuer-${item.id}`}>Issued by</label>
                      <input
                        id={`pb-issuer-${item.id}`}
                        value={issuer}
                        onChange={(e) => setIssuer(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`pb-issued-${item.id}`}>Year</label>
                      <select
                        id={`pb-issued-${item.id}`}
                        value={issuedYear}
                        onChange={(e) => setIssuedYear(e.target.value)}
                      >
                        <option value="">Optional</option>
                        {YEAR_OPTIONS.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <ComposerActions onCancel={closePanel} pending={pending} disabled={!certificationReady} />
                  {!certificationReady && (
                    <div className="pb-composer-hint">Keep the certificate name to save.</div>
                  )}
                </form>
              ) : (
                <article key={item.id} className="pb-entry">
                  <div className="pb-entry-top">
                    <div>
                      <h3>{item.name}</h3>
                      <p>
                        {[item.issuer, item.issuedDate ? yearFromDate(item.issuedDate) : '', item.credentialId]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <div className="pb-entry-actions">
                      <button
                        type="button"
                        className="pb-icon-btn"
                        aria-label="Edit certification"
                        onClick={() => openCertification(item)}
                      >
                        <IconPencil />
                      </button>
                      <button
                        type="button"
                        className="pb-icon-btn"
                        aria-label="Remove certification"
                        onClick={() => deleteMutation.mutate({ kind: 'certification', id: item.id })}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </article>
              ),
            )}
          </section>

          <section className="pb-card">
            <div className="pb-card-head">
              <h3 className="pb-card-title">Skills</h3>
            </div>
            {skills.length > 0 && (
              <div className="pb-chips">
                {skills.map((item) => (
                  <span key={item.skillId} className="pb-chip">
                    {item.skill.name}
                    <button
                      type="button"
                      aria-label={`Remove ${item.skill.name}`}
                      onClick={() => deleteMutation.mutate({ kind: 'skill', id: item.skillId })}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <form
              className="pb-inline-add"
              onSubmit={(e) => {
                e.preventDefault();
                if (skillName.trim()) saveSkill.mutate();
              }}
            >
              <input
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="Add a skill and press Enter"
              />
              {skillName.trim() && (
                <button type="submit" className="btn" disabled={pending}>
                  {saveSkill.isPending ? 'Adding…' : 'Add'}
                </button>
              )}
            </form>
          </section>

          <section className="pb-card">
            <div className="pb-card-head">
              <h3 className="pb-card-title">Languages</h3>
              {!(open?.section === 'language' && open.id === 'new') && (
                <button type="button" className="pb-add" onClick={() => openLanguage()}>
                  <IconPlus /> Add
                </button>
              )}
            </div>
            {open?.section === 'language' && (
              <form
                className="pb-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (languageReady) saveLanguage.mutate();
                }}
              >
                <div className="pb-composer-grid">
                  <div className="field">
                    <label htmlFor="pb-lang">Language *</label>
                    <input
                      id="pb-lang"
                      value={languageName}
                      onChange={(e) => setLanguageName(e.target.value)}
                      placeholder="e.g. English, Amharic"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="pb-speaking">Speaking level</label>
                    <select id="pb-speaking" value={speaking} onChange={(e) => setSpeaking(e.target.value)}>
                      {PROFICIENCIES.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="pb-lang-skills">
                  <div className="field">
                    <label htmlFor="pb-reading">Reading</label>
                    <select id="pb-reading" value={reading} onChange={(e) => setReading(e.target.value)}>
                      {PROFICIENCIES.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="pb-writing">Writing</label>
                    <select id="pb-writing" value={writing} onChange={(e) => setWriting(e.target.value)}>
                      {PROFICIENCIES.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="pb-listening">Listening</label>
                    <select id="pb-listening" value={listening} onChange={(e) => setListening(e.target.value)}>
                      {PROFICIENCIES.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <ComposerActions
                  onCancel={closePanel}
                  pending={pending}
                  disabled={!languageReady}
                  saveLabel="Save language"
                />
                {!languageReady && (
                  <div className="pb-composer-hint">Type the language to save.</div>
                )}
              </form>
            )}
            {languages
              .filter((item) => !(open?.section === 'language' && open.id === item.id))
              .map((item) => (
                <article key={item.id} className="pb-entry">
                  <div className="pb-entry-top">
                    <div>
                      <h3>{item.name}</h3>
                      <p>
                        {[
                          item.proficiency && `Speaking ${item.proficiency}`,
                          item.reading && `Reading ${item.reading}`,
                          item.writing && `Writing ${item.writing}`,
                          item.listening && `Listening ${item.listening}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <div className="pb-entry-actions">
                      <button
                        type="button"
                        className="pb-icon-btn"
                        aria-label="Edit language"
                        onClick={() => openLanguage(item)}
                      >
                        <IconPencil />
                      </button>
                      <button
                        type="button"
                        className="pb-icon-btn"
                        aria-label="Remove language"
                        onClick={() => deleteMutation.mutate({ kind: 'language', id: item.id })}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </article>
              ))}
          </section>
        </div>

        <aside className="profile-builder-aside">
          <section className="pb-side">
            <h3>Your CV</h3>
            <p className="pb-side-sub">PDF, DOC, or DOCX · up to 5 MB</p>
            {activeCv && (
              <div className="pb-cv-file">
                <div className="pb-cv-file-icon">PDF</div>
                <div>
                  <strong>{resumeFileName(activeCv)}</strong>
                  <span>{activeCv.isDefault ? 'Default file' : 'Uploaded file'}</span>
                </div>
              </div>
            )}
            <div
              className={`pb-dropzone ${cvDrag ? 'is-drag' : ''} ${cvMutation.isPending ? 'is-busy' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setCvDrag(true);
              }}
              onDragLeave={() => setCvDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setCvDrag(false);
                handleCvFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => cvInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') cvInputRef.current?.click();
              }}
            >
              {cvMutation.isPending
                ? 'Uploading…'
                : activeCv
                  ? 'Drop a file here to replace your CV'
                  : 'Drop your CV here, or click to browse'}
            </div>
            {activeCv && (
              <div className="pb-cv-actions">
                <button
                  type="button"
                  className="pb-cv-ghost"
                  onClick={() => apiOpenFile(activeCv.fileId).catch((e: Error) => setActionError(e.message))}
                >
                  View
                </button>
                <button
                  type="button"
                  className="pb-cv-ghost"
                  onClick={() =>
                    apiDownloadFile(activeCv.fileId, resumeFileName(activeCv)).catch((e: Error) =>
                      setActionError(e.message),
                    )
                  }
                >
                  Download
                </button>
              </div>
            )}
            <input
              ref={cvInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              hidden
              onChange={(e) => {
                handleCvFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </section>
        </aside>
      </div>
    </>
  );
};
