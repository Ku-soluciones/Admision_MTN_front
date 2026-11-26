type ApplicationNavigationState = {
  editMode?: unknown;
  applicationId?: unknown;
};

export function resolveApplicationEditMode(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false;
  const navigationState = state as ApplicationNavigationState;
  return navigationState.editMode === true && navigationState.applicationId != null;
}
