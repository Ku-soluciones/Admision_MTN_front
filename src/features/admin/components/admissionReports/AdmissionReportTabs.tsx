import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiBarChart2, FiCalendar, FiChevronDown, FiChevronLeft, FiRefreshCw, FiUsers } from 'react-icons/fi';
import { useAdmissionReports } from './useAdmissionReports';
import { ApplicantKpiCards } from './ApplicantKpiCards';
import { AdmissionReportCharts } from './AdmissionReportCharts';
import { CourseListView } from './CourseListView';
import { ApplicantCardModal } from './ApplicantCardModal';

const getInitialYear = (searchParams: URLSearchParams) => {
  const candidate = Number(searchParams.get('year'));
  const currentYear = new Date().getFullYear();
  return Number.isInteger(candidate) && candidate >= currentYear - 1 && candidate <= currentYear + 3
    ? candidate
    : currentYear + 1;
};

export const AdmissionReportTabs: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialYear] = useState(() => getInitialYear(searchParams));
  const [gradeFilter, setGradeFilter] = useState(() => searchParams.get('grade') || '');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '');
  const [needsActionOnly, setNeedsActionOnly] = useState(() => searchParams.get('action') === 'pending');
  const {
    academicYear,
    setAcademicYear,
    rows,
    loading,
    error,
    refresh,
    selectedCard,
    cardLoading,
    cardError,
    openCard,
    closeCard,
    retryCard,
    refreshedAt
  } = useAdmissionReports(initialYear);

  const availableYears = useMemo(
    () => Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i - 1),
    []
  );

  const updateUrl = useCallback((updates: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    next.set('section', 'admision');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const focusList = useCallback(() => {
    document.getElementById('admission-list')?.scrollIntoView({ block: 'start' });
  }, []);

  const selectStatus = useCallback((status: string) => {
    const nextStatus = statusFilter === status ? '' : status;
    setStatusFilter(nextStatus);
    setNeedsActionOnly(false);
    updateUrl({ status: nextStatus, action: null });
    requestAnimationFrame(focusList);
  }, [focusList, statusFilter, updateUrl]);

  const selectGrade = useCallback((grade: string) => {
    const nextGrade = gradeFilter === grade ? '' : grade;
    setGradeFilter(nextGrade);
    updateUrl({ grade: nextGrade });
    requestAnimationFrame(focusList);
  }, [focusList, gradeFilter, updateUrl]);

  const showNeedsAction = useCallback(() => {
    const nextNeedsAction = !needsActionOnly;
    setStatusFilter('');
    setNeedsActionOnly(nextNeedsAction);
    updateUrl({ status: null, action: nextNeedsAction ? 'pending' : null });
    requestAnimationFrame(focusList);
  }, [focusList, needsActionOnly, updateUrl]);

  const clearOperationalFilters = useCallback(() => {
    setGradeFilter('');
    setStatusFilter('');
    setNeedsActionOnly(false);
    updateUrl({ grade: null, status: null, action: null });
  }, [updateUrl]);

  const handleYearChange = (year: number) => {
    setAcademicYear(year);
    clearOperationalFilters();
    updateUrl({ year, grade: null, status: null, action: null });
  };

  const lastUpdated = refreshedAt
    ? new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' }).format(refreshedAt)
    : null;

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="px-1 py-2 sm:py-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-[-0.04em] text-slate-950">Admisión</h1>
              <span className="rounded-full bg-[#efe6cc] px-3 py-1 text-sm font-bold text-[#715614]">{academicYear}</span>
            </div>
            <p className="mt-1.5 text-sm text-slate-500">
              Seguimiento de postulantes y decisiones
              {lastUpdated && <span className="text-slate-400"> · actualizado {lastUpdated}</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
              <FiCalendar className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <label htmlFor="admissionAcademicYear" className="text-sm text-slate-600">Año</label>
              <select
                id="admissionAcademicYear"
                value={academicYear}
                onChange={(event) => handleYearChange(Number(event.target.value))}
                className="cursor-pointer border-none bg-transparent py-2 text-sm font-bold text-slate-950 focus:ring-0"
              >
                {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-blue-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              aria-label="Actualizar resumen de admisión"
            >
              <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              {loading && rows.length ? 'Actualizando' : 'Actualizar'}
            </button>
          </div>
        </div>
      </header>

      {loading && !rows.length ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : rows.length === 0 ? (
        <EmptyYearState
          academicYear={academicYear}
          canGoBack={availableYears.includes(academicYear - 1)}
          onGoBack={() => handleYearChange(academicYear - 1)}
        />
      ) : (
        <>
          <ApplicantKpiCards
            rows={rows}
            selectedStatus={statusFilter}
            needsActionSelected={needsActionOnly}
            onStatusSelect={selectStatus}
            onNeedsAction={showNeedsAction}
          />
          <CourseListView
            id="admission-list"
            rows={rows}
            loading={loading}
            academicYear={academicYear}
            gradeFilter={gradeFilter}
            statusFilter={statusFilter}
            needsActionOnly={needsActionOnly}
            onGradeFilterChange={(grade) => {
              setGradeFilter(grade);
              updateUrl({ grade });
            }}
            onStatusFilterChange={(status) => {
              setStatusFilter(status);
              setNeedsActionOnly(false);
              updateUrl({ status, action: null });
            }}
            onClearOperationalFilters={clearOperationalFilters}
            onOpenCard={openCard}
          />
          <AnalysisDisclosure>
            <AdmissionReportCharts
              rows={rows}
              selectedStatus={statusFilter}
              selectedGrade={gradeFilter}
              needsActionOnly={needsActionOnly}
              onStatusSelect={selectStatus}
              onGradeSelect={selectGrade}
            />
          </AnalysisDisclosure>
        </>
      )}

      {(selectedCard || cardLoading || cardError) && (
        <ApplicantCardModal
          card={selectedCard}
          loading={cardLoading}
          error={cardError}
          onRetry={retryCard}
          onClose={closeCard}
        />
      )}
    </div>
  );
};

const AnalysisDisclosure: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <details className="group rounded-xl border border-slate-200 bg-white">
    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-xl px-4 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 sm:px-5 [&::-webkit-details-marker]:hidden">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        <FiBarChart2 className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-bold text-slate-950">Análisis visual</strong>
        <span className="block truncate text-xs text-slate-500">Estado del proceso, carga por curso y calidad de datos</span>
      </span>
      <span className="hidden text-xs font-semibold text-slate-500 sm:block">Ver gráficos</span>
      <FiChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ease-out group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
    </summary>
    <div className="border-t border-slate-200 p-4 sm:p-5">
      {children}
    </div>
  </details>
);

const LoadingState = () => (
  <div className="space-y-4" role="status" aria-live="polite" aria-label="Cargando resumen de admisión">
    <span className="sr-only">Cargando resumen de admisión</span>
    <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="h-24 animate-pulse border-b border-slate-200 bg-slate-50" />
      <div className="space-y-px bg-slate-100">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-16 animate-pulse bg-white" />)}
      </div>
    </div>
  </div>
);

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert">
    <h2 className="font-bold text-rose-950">No pudimos cargar el resumen de admisión</h2>
    <p className="mt-1 text-sm text-rose-800">{message}</p>
    <button type="button" onClick={onRetry} className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2">
      Reintentar
    </button>
  </div>
);

const EmptyYearState: React.FC<{ academicYear: number; canGoBack: boolean; onGoBack: () => void }> = ({ academicYear, canGoBack, onGoBack }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
      <FiUsers className="h-6 w-6" aria-hidden="true" />
    </span>
    <h2 className="mt-4 text-lg font-bold text-slate-950">Aún no hay postulantes para {academicYear}</h2>
    <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-600">El proceso seleccionado todavía no registra postulaciones. Puedes actualizar o consultar el año anterior.</p>
    {canGoBack && (
      <button type="button" onClick={onGoBack} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-transform duration-150 ease-out active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
        <FiChevronLeft className="h-4 w-4" aria-hidden="true" />
        Ver {academicYear - 1}
      </button>
    )}
  </div>
);
