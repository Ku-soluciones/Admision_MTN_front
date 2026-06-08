import { featureRoutes } from './featureRoutes';

export function selectFeatureApp(pathname: string) {
  return featureRoutes.find((route) => route.matches(pathname))?.app ?? null;
}
