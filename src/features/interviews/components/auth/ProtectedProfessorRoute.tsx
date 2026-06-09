/**
 * Re-export del guard unificado de `shared-ui`, con el `useAuth` del
 * coordinator context (que es el `AuthProvider` envolviendo este feature
 * según `interviews/App.tsx`). Cierra el spoof anterior y respeta el
 * bootstrap del AuthContext.
 */
import React from 'react';
import SharedProtectedProfessorRoute from
  '../../../../packages/shared-ui/src/components/auth/ProtectedProfessorRoute';
import { useAuth } from '../../../coordinator/context/AuthContext';

const ProtectedProfessorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SharedProtectedProfessorRoute useAuthHook={useAuth}>
    {children}
  </SharedProtectedProfessorRoute>
);

export default ProtectedProfessorRoute;

