import { Navigate, Route, Routes } from 'react-router-dom';
import { PrekinderAdminGuard } from './components/PrekinderAdminGuard';
import { PrekinderWorkspace } from './pages/PrekinderWorkspace';

export default function PrekinderApp() {
  return (
    <Routes>
      <Route path="/prekinder" element={<PrekinderAdminGuard><PrekinderWorkspace /></PrekinderAdminGuard>} />
      <Route path="*" element={<Navigate to="/prekinder" replace />} />
    </Routes>
  );
}
