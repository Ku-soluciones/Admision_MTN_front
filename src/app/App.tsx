import { Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AppLoading } from './components/AppLoading';
import { selectFeatureApp } from './routing/selectFeatureApp';

export function App() {
  const { pathname } = useLocation();
  const FeatureApp = selectFeatureApp(pathname);

  return (
    <Suspense fallback={<AppLoading />}>
      {FeatureApp ? <FeatureApp /> : <Navigate to="/" replace />}
    </Suspense>
  );
}
