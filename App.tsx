
import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ToastContainer from './components/ui/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';

// Protected Route Components (load eagerly as they're wrappers)
import ProtectedProfessorRoute from './components/auth/ProtectedProfessorRoute';
import ProtectedAdminRoute from './components/auth/ProtectedAdminRoute';
import ProtectedApoderadoRoute from './components/auth/ProtectedApoderadoRoute';
import ProtectedCoordinatorRoute from './components/auth/ProtectedCoordinatorRoute';

// Lazy-loaded page components
const HomePage = lazy(() => import('./pages/HomePage'));
const ApplicationForm = lazy(() => import('./pages/ApplicationForm'));
const FamilyDashboard = lazy(() => import('./pages/FamilyDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const LoginPage = lazy(() => import('./pages/AdminLoginPage'));
const ExamPortal = lazy(() => import('./pages/ExamPortal'));
const ExamSubjectDetail = lazy(() => import('./pages/ExamSubjectDetail'));
const ProfessorDashboard = lazy(() => import('./pages/ProfessorDashboard'));
const ProfessorLoginPage = lazy(() => import('./pages/ProfessorLoginPage'));
const ApoderadoLogin = lazy(() => import('./pages/ApoderadoLogin'));
const AdmissionReportForm = lazy(() => import('./components/evaluations/AdmissionReportForm'));
const CycleDirectorReportForm = lazy(() => import('./components/evaluations/CycleDirectorReportForm'));
const CycleDirectorInterviewForm = lazy(() => import('./components/evaluations/CycleDirectorInterviewForm'));
const PsychologicalInterviewForm = lazy(() => import('./components/evaluations/PsychologicalInterviewForm'));
const EvaluationForm = lazy(() => import('./pages/EvaluationForm'));
const FamilyInterviewPage = lazy(() => import('./pages/FamilyInterviewPage'));
const StudentProfile = lazy(() => import('./pages/StudentProfile'));
const CalendarNotifications = lazy(() => import('./pages/CalendarNotifications'));
const InterviewModule = lazy(() => import('./pages/InterviewModule'));
const ReportsDashboard = lazy(() => import('./pages/ReportsDashboard'));

// Coordinator Components
const CoordinatorLayout = lazy(() => import('./components/layout/CoordinatorLayout'));
const CoordinatorDashboard = lazy(() => import('./src/components/coordinator/CoordinatorDashboard'));
const TemporalTrendsView = lazy(() => import('./src/components/coordinator/TemporalTrendsView'));
const AdvancedSearchView = lazy(() => import('./src/components/coordinator/AdvancedSearchView'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azul-monte-tabor"></div>
  </div>
);

function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <AppProvider>
                    <div className="flex flex-col min-h-screen font-sans bg-blanco-pureza text-gray-800">
                        <Header />
                        <main className="flex-grow overflow-x-hidden">
                            <Suspense fallback={<LoadingFallback />}>
                                <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/apoderado/login" element={<ApoderadoLogin />} />
                            <Route path="/postulacion" element={<ApplicationForm />} />
                            <Route path="/dashboard-apoderado" element={
                                <ProtectedApoderadoRoute>
                                    <FamilyDashboard />
                                </ProtectedApoderadoRoute>
                            } />
                            <Route path="/familia" element={<FamilyDashboard />} />
                            <Route path="/familia/login" element={<ProfessorLoginPage />} />
                            <Route path="/admin" element={
                                <ProtectedAdminRoute>
                                    <AdminDashboard />
                                </ProtectedAdminRoute>
                            } />
                            <Route path="/examenes" element={<ExamPortal />} />
                            <Route path="/examenes/:subjectId" element={<ExamSubjectDetail />} />
                            <Route path="/profesor/login" element={<ProfessorLoginPage />} />
                            <Route path="/profesor" element={
                                <ProtectedProfessorRoute>
                                    <ProfessorDashboard />
                                </ProtectedProfessorRoute>
                            } />
                            <Route path="/profesor/evaluacion/:evaluationId" element={
                                <ProtectedProfessorRoute>
                                    <EvaluationForm />
                                </ProtectedProfessorRoute>
                            } />
                            <Route path="/profesor/informe/:examId" element={
                                <ProtectedProfessorRoute>
                                    <AdmissionReportForm />
                                </ProtectedProfessorRoute>
                            } />
                            <Route path="/profesor/informe-director/:evaluationId" element={
                                <ProtectedProfessorRoute>
                                    <CycleDirectorReportForm />
                                </ProtectedProfessorRoute>
                            } />
                            <Route path="/profesor/entrevista-director/:examId" element={
                                <ProtectedProfessorRoute>
                                    <CycleDirectorInterviewForm />
                                </ProtectedProfessorRoute>
                            } />
                            <Route path="/cycle-director-interview/:evaluationId" element={
                                <ProtectedProfessorRoute>
                                    <CycleDirectorInterviewForm />
                                </ProtectedProfessorRoute>
                            } />
                            <Route path="/psychological-interview/:evaluationId" element={
                                <ProtectedProfessorRoute>
                                    <PsychologicalInterviewForm />
                                </ProtectedProfessorRoute>
                            } />
                            <Route path="/profesor/entrevista-familiar/:evaluationId" element={
                                <ProtectedProfessorRoute>
                                    <FamilyInterviewPage />
                                </ProtectedProfessorRoute>
                            } />
                            <Route path="/profesor/estudiante/:studentId" element={
                                <ProtectedProfessorRoute>
                                    <StudentProfile />
                                </ProtectedProfessorRoute>
                            } />
                            {/* Nuevas rutas */}
                            <Route path="/calendario" element={<CalendarNotifications />} />
                            <Route path="/entrevistas" element={<InterviewModule />} />
                            <Route path="/reportes" element={
                                <ProtectedAdminRoute>
                                    <ReportsDashboard />
                                </ProtectedAdminRoute>
                            } />

                            {/* Coordinator Routes */}
                            <Route
                                path="/coordinador"
                                element={
                                    <ProtectedCoordinatorRoute>
                                        <CoordinatorLayout />
                                    </ProtectedCoordinatorRoute>
                                }
                            >
                                <Route index element={<CoordinatorDashboard />} />
                                <Route path="tendencias" element={<TemporalTrendsView />} />
                                <Route path="busqueda" element={<AdvancedSearchView />} />
                            </Route>
                            </Routes>
                            </Suspense>
                        </main>
                        <Footer />
                        <ToastContainer />
                    </div>
                </AppProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;