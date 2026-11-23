export const APPLICATIONS_CLOSED_MESSAGE =
  'El período de nuevas postulaciones se encuentra cerrado.';

export function resolveNewApplicationsOpen(value: unknown): boolean {
  return typeof value === 'string' && value.trim().toLowerCase() === 'true';
}

export function canAccessApplicationForm({
  newApplicationsOpen,
  editMode,
}: {
  newApplicationsOpen: boolean;
  editMode: boolean;
}): boolean {
  return newApplicationsOpen || editMode;
}

const viteEnv = (import.meta as ImportMeta & {
  env?: Record<string, string | boolean | undefined>;
}).env;

/**
 * Bandera pública incorporada al bundle durante el build de Vite.
 * Solo el valor explícito `true` abre la creación de postulaciones.
 */
export const NEW_APPLICATIONS_OPEN = resolveNewApplicationsOpen(
  viteEnv?.VITE_SHOW_POSTULACION,
);
