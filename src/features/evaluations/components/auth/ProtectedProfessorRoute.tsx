/**
 * Re-export del guard unificado de `shared-ui`, con el `useAuth` de
 * `evaluations` ya inyectado. Cierra el spoof anterior (lectura pura
 * de localStorage `currentProfessor`) y respeta el bootstrap del
 * AuthContext del feature.
 */
import React from 'react';
import SharedProtectedProfessorRoute from
  '../../../../packages/shared-ui/src/components/auth/ProtectedProfessorRoute';
import { useAuth } from '../../context/AuthContext';

const ProtectedProfessorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SharedProtectedProfessorRoute useAuthHook={useAuth}>
    {children}
  </SharedProtectedProfessorRoute>
);

export default ProtectedProfessorRoute;
