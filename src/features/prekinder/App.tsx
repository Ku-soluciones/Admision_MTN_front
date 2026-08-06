import { Navigate, Route, Routes } from "react-router-dom";
import { PrekinderAdminGuard } from "./components/PrekinderAdminGuard";
import { PrekinderApplicationPage } from "./pages/PrekinderApplicationPage";
import { PrekinderOperations } from "./pages/PrekinderOperations";
import { EvaluatorDesk } from "./pages/EvaluatorDesk";
import { EvaluatorReport } from "./pages/EvaluatorReport";
import { PrekinderResultPage } from "./pages/PrekinderResultPage";

export default function PrekinderApp() {
  return (
    <Routes>
      <Route
        path="/prekinder"
        element={
          <PrekinderAdminGuard>
            <PrekinderOperations />
          </PrekinderAdminGuard>
        }
      />
      <Route
        path="/prekinder/evaluaciones"
        element={<Navigate to="/prekinder/evaluador" replace />}
      />
      <Route
        path="/prekinder/evaluador"
        element={
          <PrekinderAdminGuard
            roles={[
              "TEACHER",
              "PSYCHOLOGIST",
              "INTERVIEWER",
              "CYCLE_DIRECTOR",
              "ADMIN",
              "COORDINATOR",
            ]}
          >
            <EvaluatorDesk />
          </PrekinderAdminGuard>
        }
      />
      <Route
        path="/prekinder/evaluador/informe/:reportId"
        element={
          <PrekinderAdminGuard
            roles={[
              "TEACHER",
              "PSYCHOLOGIST",
              "INTERVIEWER",
              "CYCLE_DIRECTOR",
              "ADMIN",
              "COORDINATOR",
            ]}
          >
            <EvaluatorReport />
          </PrekinderAdminGuard>
        }
      />
      <Route
        path="/prekinder/postular"
        element={
          <PrekinderAdminGuard
            roles={["APODERADO"]}
            loginPath="/apoderado/login"
          >
            <PrekinderApplicationPage />
          </PrekinderAdminGuard>
        }
      />
      <Route
        path="/prekinder/resultado"
        element={
          <PrekinderAdminGuard
            roles={["APODERADO"]}
            loginPath="/apoderado/login"
          >
            <PrekinderResultPage />
          </PrekinderAdminGuard>
        }
      />
      <Route path="*" element={<Navigate to="/prekinder" replace />} />
    </Routes>
  );
}
