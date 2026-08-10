export type SpecialtyProfile =
  | "ACADEMIC"
  | "PSYCHOMOTOR"
  | "PSYCHOLOGY"
  | "INDICATORS"
  | "GROUP_OBSERVATION"
  | "SUPPORT"
  | "DAP";

export const PROFILE_LABELS: Record<SpecialtyProfile, string> = {
  ACADEMIC: "Evaluador Académico",
  PSYCHOMOTOR: "Psicomotricidad",
  PSYCHOLOGY: "Psicología",
  INDICATORS: "Indicadores de Ingreso",
  GROUP_OBSERVATION: "Observación Grupal",
  SUPPORT: "Apoyo al Aprendizaje",
  DAP: "DAP",
};

export const PROFILE_ROLES: Record<SpecialtyProfile, string> = {
  ACADEMIC: "PREKINDER_ACADEMIC",
  PSYCHOMOTOR: "PREKINDER_PSYCHOMOTOR",
  PSYCHOLOGY: "PREKINDER_PSYCHOLOGY",
  INDICATORS: "PREKINDER_INDICATORS",
  GROUP_OBSERVATION: "PREKINDER_OBSERVER",
  SUPPORT: "PREKINDER_SUPPORT",
  DAP: "PREKINDER_DAP",
};
