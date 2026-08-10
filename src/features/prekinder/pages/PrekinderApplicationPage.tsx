import { Navigate } from "react-router-dom";

/**
 * Compatibilidad para enlaces antiguos. La postulación Prekínder usa el mismo
 * formulario y la misma experiencia que el resto de los cursos.
 */
export function PrekinderApplicationPage() {
  return <Navigate to="/postulacion?proceso=prekinder" replace />;
}
