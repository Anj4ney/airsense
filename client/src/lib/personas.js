/**
 * personas.js — the shared profile vocabulary.
 *
 * • Demo personas for one-click personalization (the judge demo)
 * • Form options for the user's own saved profile
 * • Plain-English profile descriptions used by BOTH the LLM prompt and the
 *   rule-based fallback, so both engines "talk about" the person identically.
 */

import {
  Baby,
  Building2,
  Dumbbell,
  HardHat,
  HeartPulse,
  PersonStanding,
  Stethoscope,
  User,
  Users,
  Wind,
} from 'lucide-react';

export const AGE_GROUPS = [
  { value: 'toddler', label: 'Toddler (0–4)', noun: 'a toddler (0–4 years old)', Icon: Baby },
  { value: 'child', label: 'Child (5–12)', noun: 'a child (5–12 years old)', Icon: PersonStanding },
  { value: 'teen', label: 'Teen (13–17)', noun: 'a teenager (13–17)', Icon: PersonStanding },
  { value: 'adult', label: 'Adult (18–59)', noun: 'an adult (18–59)', Icon: User },
  { value: 'senior', label: 'Senior (60+)', noun: 'a senior (60+)', Icon: Users },
];

export const HEALTH_CONDITIONS = [
  { value: 'asthma', label: 'Asthma', phrase: 'manages asthma', Icon: Wind },
  { value: 'heart', label: 'Heart condition', phrase: 'has a heart condition', Icon: HeartPulse },
  { value: 'pregnancy', label: 'Pregnancy', phrase: 'is pregnant', Icon: Baby },
  { value: 'respiratory', label: 'Respiratory issue', phrase: 'has a chronic respiratory issue', Icon: Stethoscope },
];

export const OCCUPATIONS = [
  { value: 'indoor', label: 'Indoor worker', phrase: 'works indoors most of the day', Icon: Building2 },
  { value: 'outdoor', label: 'Outdoor worker', phrase: 'works outdoors most of the day', Icon: HardHat },
  { value: 'athlete', label: 'Athlete / very active', phrase: 'trains or exercises outdoors almost daily', Icon: Dumbbell },
];

export const DEFAULT_PROFILE = {
  name: 'General Adult',
  ageGroup: 'adult',
  conditions: [],
  occupation: 'indoor',
  detail: '',
};

/** One-click demo personas — the fastest way to show personalization. */
export const PERSONAS = [
  {
    id: 'asthma',
    emoji: '🫁',
    title: 'Asthma Patient',
    subtitle: 'Adult · moderate asthma · indoor job',
    profile: {
      name: 'Priya, Asthma Patient',
      ageGroup: 'adult',
      conditions: ['asthma'],
      occupation: 'indoor',
      detail: 'manages moderate asthma and carries a reliever inhaler',
    },
  },
  {
    id: 'athlete',
    emoji: '🏃',
    title: 'Outdoor Athlete',
    subtitle: 'Adult · no conditions · daily outdoor training',
    profile: {
      name: 'Arjun, Outdoor Athlete',
      ageGroup: 'adult',
      conditions: [],
      occupation: 'athlete',
      detail: 'trains outdoors for 60–90 minutes almost every day',
    },
  },
  {
    id: 'toddler',
    emoji: '👶',
    title: 'Parent of Toddler',
    subtitle: 'Caregiver · 2-year-old at home',
    profile: {
      name: 'Meera, Parent of Toddler',
      ageGroup: 'toddler',
      conditions: [],
      occupation: 'indoor',
      detail: 'cares for a healthy 2-year-old; outdoor-play decisions are made for the child',
    },
  },
];

/** Plain-English description used in LLM prompts and fallback text. */
export function describeProfile(profile) {
  if (!profile) return 'Unknown person';
  const age = AGE_GROUPS.find((a) => a.value === profile.ageGroup);
  const conds = (profile.conditions || [])
    .map((c) => {
      const found = HEALTH_CONDITIONS.find((x) => x.value === c);
      return found ? found.phrase : null;
    })
    .filter(Boolean);
  const occ = OCCUPATIONS.find((o) => o.value === profile.occupation);
  const bits = [`age group: ${age ? age.noun : 'an adult'}`];
  bits.push(conds.length ? `health: ${conds.join(', ')}` : 'health: no chronic conditions');
  bits.push(`lifestyle: ${occ ? occ.phrase : 'works indoors'}`);
  if (profile.detail) bits.push(`context: ${profile.detail}`);
  return `${profile.name} — ${bits.join('; ')}.`;
}

/** Does this profile belong to a "sensitive group"? */
export function isSensitiveProfile(profile) {
  if (!profile) return false;
  const sensitiveAge = ['toddler', 'child', 'senior'].includes(profile.ageGroup);
  const hasCondition = (profile.conditions || []).length > 0;
  return sensitiveAge || hasCondition;
}

/** Short human phrase for banners/snippets: "an asthma patient", "a senior"... */
export function personaPhrase(profile) {
  if (!profile) return 'someone sensitive to air quality';
  const conds = profile.conditions || [];
  if (conds.includes('asthma')) return 'someone living with asthma';
  if (conds.includes('heart')) return 'someone with a heart condition';
  if (conds.includes('pregnancy')) return 'someone who is pregnant';
  if (conds.includes('respiratory')) return 'someone with a respiratory condition';
  if (profile.ageGroup === 'toddler') return 'a parent deciding for a toddler';
  if (profile.ageGroup === 'child') return 'a parent deciding for a young child';
  if (profile.ageGroup === 'senior') return 'a senior';
  if (profile.occupation === 'athlete') return 'an outdoor athlete';
  if (profile.occupation === 'outdoor') return 'an outdoor worker';
  return 'a generally healthy adult';
}
