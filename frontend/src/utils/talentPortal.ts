import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../api/admin';
import { employerApi } from '../api/employer';
import { talentApi } from '../api/talent';
import { useAuth } from '../auth/AuthContext';
import { employerCvPath } from '../auth/workspace';
import type { TalentDetail, TalentSearchResponse, TalentSpotlightResponse } from '../types/api';

export function useTalentPortal() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setWorkspace } = useAuth();
  const { companyId, candidateId } = useParams<{ companyId?: string; candidateId?: string }>();
  const isAdmin = location.pathname.startsWith('/admin');
  const isBrowse = location.pathname === '/cv-search' || location.pathname.startsWith('/cv-search/');
  const listPath = isAdmin
    ? '/admin/cv-search'
    : isBrowse
      ? '/cv-search'
      : companyId
        ? `/company/${companyId}/cv-search`
        : '/company';
  const accessLabel = isAdmin ? 'Admin' : isBrowse ? 'Candidate' : 'Employer';

  const openProfile = (id: string) => {
    if (isAdmin) {
      navigate(`/admin/cv-search/${id}`);
      return;
    }
    const hiringCompanyId = companyId || user?.companyMemberships[0]?.companyId;
    if (user?.roles.includes('employer') && hiringCompanyId) {
      setWorkspace('employer');
      navigate(employerCvPath(hiringCompanyId, id));
      return;
    }
    setWorkspace('employer');
    navigate(`/employer/setup?next=${encodeURIComponent(`/cv-search/${id}`)}`);
  };

  return {
    isAdmin,
    isBrowse,
    companyId,
    candidateId,
    listPath,
    accessLabel,
    canQuery: isAdmin || isBrowse || Boolean(companyId),
    detailPath: (id: string) =>
      isAdmin ? `/admin/cv-search/${id}` : `/company/${companyId}/cv-search/${id}`,
    openProfile,
    spotlight: (): Promise<TalentSpotlightResponse> => {
      if (isAdmin) return adminApi.talentSpotlight();
      if (isBrowse) return talentApi.spotlight();
      return employerApi.talentSpotlight(companyId!);
    },
    search: (params: { q?: string; page?: number; limit?: number }): Promise<TalentSearchResponse> => {
      if (isAdmin) return adminApi.searchTalent(params);
      if (isBrowse) return talentApi.search(params);
      return employerApi.searchTalent(companyId!, params);
    },
    get: (id: string): Promise<TalentDetail> =>
      isAdmin ? adminApi.getTalent(id) : employerApi.getTalent(companyId!, id),
  };
}
