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
  const title = query.data?.personalized ? 'Recommended for you' : 'Top picks';
  const description = query.data?.personalized
    ? 'Open roles matched to your profession, field of study, and skills.'
    : query.data?.reason === 'incomplete_profile'
      ? 'Complete your profession, education, or skills to get recommendations. Here are general top picks.'
      : query.data?.reason === 'no_matches'
        ? 'No matching roles right now. Explore these general top picks or update your profile.'
        : 'Featured and recently posted opportunities from employers.';
  return { ...query, title, description, showProfileLink: Boolean(query.data?.reason) };
}
