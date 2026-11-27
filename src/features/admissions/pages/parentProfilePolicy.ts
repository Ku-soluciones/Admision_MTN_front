export type ParentProfileSource = {
  fullName?: string | null;
  firstName?: string | null;
  paternalLastName?: string | null;
  maternalLastName?: string | null;
  maritalStatus?: string | null;
};

export type ParentProfile = {
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  maritalStatus: string;
  fullName: string;
  legacyOnly: boolean;
};

const clean = (value?: string | null) => value?.trim() ?? '';

export function composeParentFullName(profile: Pick<ParentProfile, 'firstName' | 'paternalLastName' | 'maternalLastName'>): string {
  return [profile.firstName, profile.paternalLastName, profile.maternalLastName]
    .map(clean).filter(Boolean).join(' ');
}

export function normalizeParentProfile(source?: ParentProfileSource | null): ParentProfile {
  const explicit = {
    firstName: clean(source?.firstName),
    paternalLastName: clean(source?.paternalLastName),
    maternalLastName: clean(source?.maternalLastName),
  };
  const legacyOnly = !explicit.firstName && !explicit.paternalLastName && !explicit.maternalLastName;
  if (!legacyOnly) {
    return {
      ...explicit,
      maritalStatus: clean(source?.maritalStatus),
      fullName: composeParentFullName(explicit) || clean(source?.fullName),
      legacyOnly: false,
    };
  }
  const parts = clean(source?.fullName).split(/\s+/).filter(Boolean);
  const maternalLastName = parts.length >= 3 ? parts.pop() ?? '' : '';
  const paternalLastName = parts.length >= 2 ? parts.pop() ?? '' : '';
  const firstName = parts.join(' ');
  return {
    firstName,
    paternalLastName,
    maternalLastName,
    maritalStatus: clean(source?.maritalStatus),
    fullName: clean(source?.fullName),
    legacyOnly: true,
  };
}

export function normalizeAccountParentProfile(firstName?: string | null, lastName?: string | null): ParentProfile {
  return normalizeParentProfile({ fullName: [clean(firstName), clean(lastName)].filter(Boolean).join(' ') });
}

export function parentPayload(profile: Pick<ParentProfile, 'firstName' | 'paternalLastName' | 'maternalLastName' | 'maritalStatus'>) {
  return { ...profile, fullName: composeParentFullName(profile) };
}

export type NormalizedParentFormData = Record<string, unknown> & {
  parent1FirstName: string; parent1PaternalLastName: string; parent1MaternalLastName: string;
  parent1MaritalStatus: string; parent1Name: string;
  parent2FirstName: string; parent2PaternalLastName: string; parent2MaternalLastName: string;
  parent2MaritalStatus: string; parent2Name: string; parentsSeparated: boolean;
};

export function normalizeParentFormData(data: Record<string, any>): NormalizedParentFormData {
  const normalized: Record<string, unknown> = { ...data };
  for (const prefix of ['parent1', 'parent2'] as const) {
    const profile = normalizeParentProfile({
      fullName: data[`${prefix}Name`],
      firstName: data[`${prefix}FirstName`],
      paternalLastName: data[`${prefix}PaternalLastName`],
      maternalLastName: data[`${prefix}MaternalLastName`],
      maritalStatus: data[`${prefix}MaritalStatus`],
    });
    normalized[`${prefix}FirstName`] = profile.firstName;
    normalized[`${prefix}PaternalLastName`] = profile.paternalLastName;
    normalized[`${prefix}MaternalLastName`] = profile.maternalLastName;
    normalized[`${prefix}MaritalStatus`] = profile.maritalStatus;
    normalized[`${prefix}Name`] = profile.fullName;
  }
  normalized.parentsSeparated = data.parentsSeparated === true;
  return normalized as NormalizedParentFormData;
}

function parentComplete(data: Record<string, any>, prefix: 'parent1' | 'parent2'): boolean {
  return ['FirstName', 'PaternalLastName', 'MaternalLastName', 'MaritalStatus']
    .every((suffix) => String(data[`${prefix}${suffix}`] || '').trim());
}

export function safeParentResumeStep(data: Record<string, any>, requestedStep: number): number {
  if (requestedStep > 3 && !parentComplete(data, 'parent1')) return 3;
  if (requestedStep > 4 && !parentComplete(data, 'parent2')) return 4;
  return requestedStep;
}
