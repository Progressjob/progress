import { useQuery } from '@tanstack/react-query';
import { jobsApi, type FeaturedJobsResponse } from '../api/jobs';
import { useAuth } from '../auth/AuthContext';

export function useFeaturedJobs() {
  const { user, hasRole } = useAuth();
  const candidate = Boolean(user && hasRole('candidate'));
  const query = useQuery({
    queryKey: ['featured-jobs', candidate ? user?.id : 'public'],
    queryFn: async (): Promise<FeaturedJobsResponse> => candidate
      ? jobsApi.recommendations()
      : { data: (await jobsApi.list({ limit: 8 })).data, personalized: false, reason: null },
    staleTime: 0,
  });
  const title = query.data?.personalized ? 'Recommended for you' : 'Featured vacancies';
  const description = query.data?.personalized
    ? 'Open roles matched to your profession, field of study, and skills.'
    : query.data?.reason === 'incomplete_profile'
      ? 'Complete your profession, education, or skills to get recommendations. Here are featured vacancies.'
      : query.data?.reason === 'no_matches'
        ? 'No matching roles right now. Explore these featured vacancies or update your profile.'
        : 'Top opportunities for you';
  return { ...query, title, description, showProfileLink: Boolean(query.data?.reason) };
}
