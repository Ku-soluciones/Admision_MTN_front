import { Navigate, Route, Routes } from 'react-router-dom';
import { PrekinderAdminGuard } from './components/PrekinderAdminGuard';
import { PrekinderIntake } from './pages/PrekinderIntake';
import { PrekinderWorkspace } from './pages/PrekinderWorkspace';

export default function PrekinderApp() {
  return (
    <Routes>
      <Route path="/prekinder" element={<PrekinderAdminGuard><PrekinderIntake /></PrekinderAdminGuard>} />
      <Route path="/prekinder/evaluaciones" element={<PrekinderAdminGuard><PrekinderWorkspace /></PrekinderAdminGuard>} />
      <Route path="*" element={<Navigate to="/prekinder" replace />} />
    </Routes>
  );
}
