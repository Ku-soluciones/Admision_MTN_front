import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PrekinderAdminGuard } from "./components/PrekinderAdminGuard";
import { EvaluatorDesk } from "./pages/EvaluatorDesk";
import { EvaluatorReport } from "./pages/EvaluatorReport";
import { PrekinderResultPage } from "./pages/PrekinderResultPage";
import { PrekinderEvaluatorGuard } from "./components/evaluator/PrekinderEvaluatorGuard";
import { PrekinderEvaluatorLogin } from "./pages/evaluator/PrekinderEvaluatorLogin";
import { PrekinderEvaluatorDashboard } from "./pages/evaluator/PrekinderEvaluatorDashboard";
import { PrekinderEvaluatorGroupPage } from "./pages/evaluator/PrekinderEvaluatorGroupPage";

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
  </div>
);

export default function PrekinderApp() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route
          path="/prekinder"
          element={<Navigate to="/admin?section=prekinder" replace />}
        />
        <Route
          path="/prekinder/evaluaciones"
          element={<Navigate to="/prekinder/evaluador" replace />}
        />

        {/* Legacy shared evaluator desk */}
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

        {/* New individual evaluator portals */}
        <Route
          path="/prekinder/evaluador/login"
          element={<PrekinderEvaluatorLogin />}
        />
        <Route
          path="/prekinder/evaluador/academic"
          element={
            <PrekinderEvaluatorGuard profile="ACADEMIC">
              <PrekinderEvaluatorDashboard profile="ACADEMIC" />
            </PrekinderEvaluatorGuard>
          }
        />
        <Route
          path="/prekinder/evaluador/academic/grupo/:groupId"
          element={
            <PrekinderEvaluatorGuard profile="ACADEMIC">
              <PrekinderEvaluatorGroupPage profile="ACADEMIC" />
            </PrekinderEvaluatorGuard>
          }
        />
        <Route
          path="/prekinder/evaluador/psychomotor"
          element={
            <PrekinderEvaluatorGuard profile="PSYCHOMOTOR">
              <PrekinderEvaluatorDashboard profile="PSYCHOMOTOR" />
            </PrekinderEvaluatorGuard>
          }
        />
        <Route
          path="/prekinder/evaluador/psychomotor/grupo/:groupId"
          element={
            <PrekinderEvaluatorGuard profile="PSYCHOMOTOR">
              <PrekinderEvaluatorGroupPage profile="PSYCHOMOTOR" />
            </PrekinderEvaluatorGuard>
          }
        />
        <Route
          path="/prekinder/evaluador/psychology"
          element={
            <PrekinderEvaluatorGuard profile="PSYCHOLOGY">
              <PrekinderEvaluatorDashboard profile="PSYCHOLOGY" />
            </PrekinderEvaluatorGuard>
          }
        />
        <Route
          path="/prekinder/evaluador/psychology/grupo/:groupId"
          element={
            <PrekinderEvaluatorGuard profile="PSYCHOLOGY">
              <PrekinderEvaluatorGroupPage profile="PSYCHOLOGY" />
            </PrekinderEvaluatorGuard>
          }
        />
        <Route
          path="/prekinder/evaluador/indicators"
          element={
            <PrekinderEvaluatorGuard profile="INDICATORS">
              <PrekinderEvaluatorDashboard profile="INDICATORS" />
            </PrekinderEvaluatorGuard>
          }
        />
        <Route
          path="/prekinder/evaluador/indicators/grupo/:groupId"
          element={
            <PrekinderEvaluatorGuard profile="INDICATORS">
              <PrekinderEvaluatorGroupPage profile="INDICATORS" />
            </PrekinderEvaluatorGuard>
          }
        />
        <Route
          path="/prekinder/evaluador/group-observation"
          element={
            <PrekinderEvaluatorGuard profile="GROUP_OBSERVATION">
              <PrekinderEvaluatorDashboard profile="GROUP_OBSERVATION" />
            </PrekinderEvaluatorGuard>
          }
        />
        <Route
          path="/prekinder/evaluador/group-observation/grupo/:groupId"
          element={
            <PrekinderEvaluatorGuard profile="GROUP_OBSERVATION">
              <PrekinderEvaluatorGroupPage profile="GROUP_OBSERVATION" />
            </PrekinderEvaluatorGuard>
          }
        />
        <Route
          path="/prekinder/evaluador/support"
          element={
            <PrekinderEvaluatorGuard profile="SUPPORT">
              <PrekinderEvaluatorDashboard profile="SUPPORT" />
            </PrekinderEvaluatorGuard>
          }
        />
        <Route
          path="/prekinder/evaluador/support/grupo/:groupId"
          element={
            <PrekinderEvaluatorGuard profile="SUPPORT">
              <PrekinderEvaluatorGroupPage profile="SUPPORT" />
            </PrekinderEvaluatorGuard>
          }
        />
        <Route
          path="/prekinder/evaluador/dap"
          element={
            <PrekinderEvaluatorGuard profile="DAP">
              <PrekinderEvaluatorDashboard profile="DAP" />
            </PrekinderEvaluatorGuard>
          }
        />
        <Route
          path="/prekinder/evaluador/dap/grupo/:groupId"
          element={
            <PrekinderEvaluatorGuard profile="DAP">
              <PrekinderEvaluatorGroupPage profile="DAP" />
            </PrekinderEvaluatorGuard>
          }
        />

        <Route
          path="/prekinder/postular"
          element={<Navigate to="/postulacion?proceso=prekinder" replace />}
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
