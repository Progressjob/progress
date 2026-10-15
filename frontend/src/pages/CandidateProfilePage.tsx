import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { candidateApi } from '../api/candidate';

export const CandidateProfilePage: React.FC = () => {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['candidate', 'profile'],
    queryFn: () => candidateApi.getProfile(),
  });

  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [yearsExperience, setYearsExperience] = useState<string>('');
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'employers' | 'private'>(
    'employers',
  );
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    if (profileQuery.data) {
      setHeadline(profileQuery.data.headline ?? '');
      setSummary(profileQuery.data.summary ?? '');
      setCity(profileQuery.data.city ?? '');
      setRegion(profileQuery.data.region ?? '');
      setYearsExperience(
        profileQuery.data.yearsExperience != null ? String(profileQuery.data.yearsExperience) : '',
      );
      setProfileVisibility(profileQuery.data.profileVisibility ?? 'employers');
    }
  }, [profileQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      candidateApi.updateProfile({
        headline: headline || undefined,
        summary: summary || undefined,
        city: city || undefined,
        region: region || undefined,
        yearsExperience: yearsExperience !== '' ? Number(yearsExperience) : undefined,
        profileVisibility,
      }),
    onSuccess: () => {
      setSavedBanner(true);
      void queryClient.invalidateQueries({ queryKey: ['candidate', 'profile'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedBanner(false);
    updateMutation.mutate();
  };

  if (profileQuery.isLoading) {
    return <div className="card">Loading candidate profile...</div>;
  }

  if (profileQuery.isError) {
    return (
      <div className="card alert-error">
        Failed to load profile: {(profileQuery.error as Error).message}
      </div>
    );
  }

  const profile = profileQuery.data!;

  return (
    <div className="narrow-container">
      <div className="page-header">
        <h1>Candidate Profile</h1>
        <p className="muted">
          {profile.user?.firstName} {profile.user?.lastName} ({profile.user?.email})
        </p>
      </div>

      <div className="card">
        {savedBanner && <div className="alert-success">Profile saved.</div>}
        {updateMutation.isError && (
          <div className="alert-error">{(updateMutation.error as Error).message}</div>
        )}

        <form onSubmit={handleSubmit} className="stack">
          <div className="field">
            <label htmlFor="prof-headline">Headline</label>
            <input
              id="prof-headline"
              type="text"
              placeholder="e.g. Full-Stack Developer"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="prof-summary">Professional Summary</label>
            <textarea
              id="prof-summary"
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          <div className="grid-two">
            <div className="field">
              <label htmlFor="prof-city">City</label>
              <input
                id="prof-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="prof-region">Region</label>
              <input
                id="prof-region"
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
            </div>
          </div>

          <div className="grid-two">
            <div className="field">
              <label htmlFor="prof-exp">Years of Experience</label>
              <input
                id="prof-exp"
                type="number"
                min={0}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="prof-vis">Profile Visibility</label>
              <select
                id="prof-vis"
                value={profileVisibility}
                onChange={(e) =>
                  setProfileVisibility(e.target.value as 'public' | 'employers' | 'private')
                }
              >
                <option value="public">public</option>
                <option value="employers">employers</option>
                <option value="private">private</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};
