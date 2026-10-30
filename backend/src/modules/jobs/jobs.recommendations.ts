/** Deterministic matching of professional terms; no demographic data is used. */
const ignored = new Set('a an and or the in of for with to at as senior junior lead assistant officer specialist professional experienced experience years bachelor bachelors master masters degree diploma science arts certified general manager management'.split(' '));
const aliases: Record<string, string> = {
  nursing: 'nurse', nurses: 'nurse', accounting: 'accountant', accountants: 'accountant',
  engineering: 'engineer', engineers: 'engineer', development: 'developer', developers: 'developer',
  teaching: 'teacher', teachers: 'teacher', pharmaceutical: 'pharmacy', pharmacist: 'pharmacy',
};
export function professionalTerms(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[\p{L}\p{N}+#]+/gu) ?? [])
    .filter((term) => term.length > 1 && !ignored.has(term))
    .map((term) => aliases[term] ?? term));
}
export interface RecommendationProfile {
  headline: string | null;
  educations: { fieldOfStudy: string | null }[];
  experiences: { jobTitle: string }[];
  skills: { skillId: string }[];
}
export function profileTerms(profile: RecommendationProfile): Set<string> {
  return professionalTerms([profile.headline, ...profile.educations.map((e) => e.fieldOfStudy),
    ...profile.experiences.map((e) => e.jobTitle)].filter(Boolean).join(' '));
}
export function recommendationScore(terms: Set<string>, skillIds: Set<string>, job: {
  title: string;
  educationRequirement: string | null;
  category: { name: string };
  skills: { skillId: string }[];
}): number {
  const title = professionalTerms(job.title);
  const field = professionalTerms(`${job.category.name} ${job.educationRequirement ?? ''}`);
  let score = 0;
  for (const term of terms) {
    if (title.has(term)) score += 4;
    else if (field.has(term)) score += 3;
  }
  for (const skill of job.skills) if (skillIds.has(skill.skillId)) score += 6;
  return score;
}
