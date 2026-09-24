export type SpecialtyProfile =
  | "ACADEMIC"
  | "PSYCHOMOTOR"
  | "PSYCHOLOGY"
  | "INDICATORS"
  | "GROUP_OBSERVATION"
  | "FAMILY_INTERVIEW"
  | "LEARNING_SUPPORT"
  | "DAP";

export const PROFILE_LABELS: Record<SpecialtyProfile, string> = {
  ACADEMIC: "Evaluador Académico",
  PSYCHOMOTOR: "Psicomotricidad",
  PSYCHOLOGY: "Psicología",
  INDICATORS: "Indicadores de Ingreso",
  GROUP_OBSERVATION: "Observación Grupal",
  FAMILY_INTERVIEW: "Entrevista Familiar",
  LEARNING_SUPPORT: "Apoyo al Aprendizaje",
  DAP: "DAP",
};

export const PROFILE_ROLES: Record<SpecialtyProfile, string> = {
  ACADEMIC: "PK_EVALUATOR_ACADEMIC",
  PSYCHOMOTOR: "PK_EVALUATOR_PSYCHOMOTOR",
  PSYCHOLOGY: "PK_EVALUATOR_PSYCHOLOGY",
  INDICATORS: "PK_EVALUATOR_ENTRY_INDICATORS",
  GROUP_OBSERVATION: "PK_EVALUATOR_GROUP_OBSERVATION",
  FAMILY_INTERVIEW: "PK_EVALUATOR_FAMILY_INTERVIEW",
  LEARNING_SUPPORT: "PK_EVALUATOR_LEARNING_SUPPORT",
  DAP: "PK_EVALUATOR_DAP",
};

export const INSTRUMENT_TO_PROFILE: Record<string, SpecialtyProfile> = {
  // Full codes (from backend API)
  PK_EVALUATOR_ACADEMIC: "ACADEMIC",
  PK_EVALUATOR_PSYCHOMOTOR: "PSYCHOMOTOR",
  PK_EVALUATOR_PSYCHOLOGY: "PSYCHOLOGY",
  PK_EVALUATOR_ENTRY_INDICATORS: "INDICATORS",
  PK_EVALUATOR_GROUP_OBSERVATION: "GROUP_OBSERVATION",
  PK_EVALUATOR_FAMILY_INTERVIEW: "FAMILY_INTERVIEW",
  PK_EVALUATOR_LEARNING_SUPPORT: "LEARNING_SUPPORT",
  PK_EVALUATOR_DAP: "DAP",
  // Short codes (from workspace API)
  ACADEMIC: "ACADEMIC",
  PSYCHOMOTOR: "PSYCHOMOTOR",
  PSYCHOLOGY: "PSYCHOLOGY",
  ENTRY_INDICATORS: "INDICATORS",
  GROUP_OBSERVATION: "GROUP_OBSERVATION",
  FAMILY_INTERVIEW: "FAMILY_INTERVIEW",
  LEARNING_SUPPORT: "LEARNING_SUPPORT",
  DAP: "DAP",
};

export const PROFILE_TO_INSTRUMENT: Record<SpecialtyProfile, string> = {
  ACADEMIC: "PK_EVALUATOR_ACADEMIC",
  PSYCHOMOTOR: "PK_EVALUATOR_PSYCHOMOTOR",
  PSYCHOLOGY: "PK_EVALUATOR_PSYCHOLOGY",
  INDICATORS: "PK_EVALUATOR_ENTRY_INDICATORS",
  GROUP_OBSERVATION: "PK_EVALUATOR_GROUP_OBSERVATION",
  FAMILY_INTERVIEW: "PK_EVALUATOR_FAMILY_INTERVIEW",
  LEARNING_SUPPORT: "PK_EVALUATOR_LEARNING_SUPPORT",
  DAP: "PK_EVALUATOR_DAP",
};

// Short codes returned by the workspace API (used for comparison)
export const PROFILE_TO_SHORT_INSTRUMENT: Record<SpecialtyProfile, string> = {
  ACADEMIC: "ACADEMIC",
  PSYCHOMOTOR: "PSYCHOMOTOR",
  PSYCHOLOGY: "PSYCHOLOGY",
  INDICATORS: "ENTRY_INDICATORS",
  GROUP_OBSERVATION: "GROUP_OBSERVATION",
  FAMILY_INTERVIEW: "FAMILY_INTERVIEW",
  LEARNING_SUPPORT: "LEARNING_SUPPORT",
  DAP: "DAP",
};

export type ProfileStyle = {
  gradient: string;
  border: string;
  text: string;
  badge: string;
};

// Mirrors the literal Tailwind classes hardcoded in each pages/evaluator/Connected*Console.tsx
// so that admin previews render with the exact same colors evaluators see.
export const PROFILE_STYLES: Record<SpecialtyProfile, ProfileStyle> = {
  ACADEMIC: { gradient: "from-emerald-800 to-emerald-900", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-900" },
  PSYCHOMOTOR: { gradient: "from-[#1e3a5f] to-[#2d5a87]", border: "border-[#2d5a87]", text: "text-cyan-700", badge: "bg-[#1e3a5f]" },
  PSYCHOLOGY: { gradient: "from-[#1e3a8a] to-[#1e4a9a]", border: "border-blue-200", text: "text-blue-700", badge: "bg-[#1e3a8a]" },
  INDICATORS: { gradient: "from-teal-800 to-teal-900", border: "border-teal-200", text: "text-teal-700", badge: "bg-teal-900" },
  GROUP_OBSERVATION: { gradient: "from-amber-800 to-amber-900", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-900" },
  FAMILY_INTERVIEW: { gradient: "from-[#1e3a8a] to-[#1e4a9a]", border: "border-blue-200", text: "text-blue-700", badge: "bg-[#1e3a8a]" },
  LEARNING_SUPPORT: { gradient: "from-blue-800 to-blue-900", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-900" },
  DAP: { gradient: "from-violet-800 to-violet-900", border: "border-violet-200", text: "text-violet-700", badge: "bg-violet-900" },
};
