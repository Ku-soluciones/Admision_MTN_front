import React, { useState, useEffect } from 'react';
import { FiUser, FiFileText, FiAward, FiTrendingUp, FiFilter, FiDownload, FiX } from 'react-icons/fi';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { dashboardClient } from '../../src/api/dashboard.client';
import type { ApplicantMetric, ApplicantMetricsFilters } from '../../src/api/dashboard.types';
import type { EChartsOption } from 'echarts';
import EChart from '../charts/EChart';

// Version: 2025-11-11 - Added overallOpinionScore display
export const ApplicantMetricsView: React.FC = () => {
  const [applicants, setApplicants] = useState<ApplicantMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ApplicantMetricsFilters>({
    academicYear: new Date().getFullYear()
  });
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [subjectDistribution, setSubjectDistribution] = useState<any[]>([]);

  useEffect(() => {
    loadApplicantMetrics();
  }, [filters]);

  const loadApplicantMetrics = async () => {
    try {
      // 
      setLoading(true);
      const response = await dashboardClient.getApplicantMetrics(filters);
      // 
      // 
      setApplicants(response.data || []);
    } catch (error) {
    } finally {
      setLoading(false);
      // 
    }
  };

  const exportToExcel = () => {
    const excelData = applicants.map(app => ({
      'ID Aplicación': app.applicationId,
      'Nombre Estudiante': app.studentName,
      'Curso': app.gradeApplied,
      'Estado': app.applicationStatus,
      'Matemáticas (%)': app.examScores?.mathematics?.percentage || 'Pendiente',
      'Matemáticas (Score)': app.examScores?.mathematics?.score ? `${app.examScores.mathematics.score}/${app.examScores.mathematics.maxScore}` : '-',
      'Lenguaje (%)': app.examScores?.language?.percentage || 'Pendiente',
      'Lenguaje (Score)': app.examScores?.language?.score ? `${app.examScores.language.score}/${app.examScores.language.maxScore}` : '-',
      'Inglés (%)': app.examScores?.english?.percentage || 'Pendiente',
      'Inglés (Score)': app.examScores?.english?.score ? `${app.examScores.english.score}/${app.examScores.english.maxScore}` : '-',
      'Completitud Exámenes (%)': app.examScores?.completionRate || '0%',
      'Entrevistas Realizadas': app.familyInterviews?.length || 0,
      'Entrevistas (Detalle)': app.familyInterviews?.map(i =>
        `${i.interviewerName}: ${i.result || 'Pendiente'} (${i.score || 'N/A'}/10)`
      ).join('; ') || 'Sin entrevistas',
      'Documentos Aprobados': app.documents ? `${app.documents.approved}/${app.documents.total}` : '0/0',
      'Completitud Documentos (%)': app.documents?.completionRate || '0%'
    }));

    const headers = Object.keys(excelData[0] || {});
    const csvContent = [
      headers.join(','),
      ...excelData.map(row => headers.map(header => {
        const value = String(row[header as keyof typeof row] || '');
        return value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `metricas_postulantes_${filters.academicYear || new Date().getFullYear()}.csv`;
    link.click();
  };

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { bg: string; text: string; dot: string; label: string }> = {
      APPROVED:     { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Aprobado' },
      REJECTED:     { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Rechazado' },
      UNDER_REVIEW: { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'En Revisión' },
      SUBMITTED:    { bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500',     label: 'Enviado' },
      WAITLIST:     { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400',   label: 'Lista de Espera' },
      IN_PROGRESS:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-500',  label: 'En Progreso' },
      PENDING:      { bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-400',    label: 'Pendiente' },
    };
    const c = cfg[status] || { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', label: status };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {c.label}
      </span>
    );
  };

  const getScoreCell = (percentage: string | null, score: number | null | undefined, maxScore: number | null | undefined, examStatus: string) => {
    // Sin datos / pendiente
    if (!examStatus || examStatus === 'PENDING' || examStatus === 'NOT_SCHEDULED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-dashed border-gray-300 text-[11px] text-gray-400 bg-white">
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" />
          </svg>
          Sin rendir
        </span>
      );
    }
    // Agendada o en curso sin score
    if (examStatus !== 'COMPLETED' || !percentage) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-amber-300 text-[11px] text-amber-600 bg-amber-50">
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Por rendir
        </span>
      );
    }
    // Completada con score
    const pct = parseFloat(percentage);
    const c = pct >= 70
      ? { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'M5 13l4 4L19 7', label: `${Math.round(pct)}%` }
      : pct >= 50
      ? { bar: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   icon: 'M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: `${Math.round(pct)}%` }
      : { bar: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     icon: 'M6 18L18 6M6 6l12 12', label: `${Math.round(pct)}%` };
    return (
      <div className="space-y-1">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-semibold ${c.bg} ${c.text} ${c.border}`}>
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={c.icon} />
          </svg>
          {c.label}
        </span>
        {score != null && (
          <div className="flex items-center gap-1">
            <div className="w-14 h-1 rounded-full bg-gray-200">
              <div className={`h-1 rounded-full ${c.bar}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-gray-400">{score}/{maxScore}</span>
          </div>
        )}
      </div>
    );
  };

  const getInterviewResultBadge = (result: string | null) => {
    if (!result) return <span className="text-xs text-gray-400">—</span>;
    const cfg: Record<string, { bg: string; text: string; label: string }> = {
      POSITIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Positivo' },
      NEGATIVE: { bg: 'bg-red-50',     text: 'text-red-700',     label: 'Negativo' },
      NEUTRAL:  { bg: 'bg-gray-100',   text: 'text-gray-600',    label: 'Neutral' },
    };
    const c = cfg[result] || { bg: 'bg-gray-100', text: 'text-gray-600', label: result };
    return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  const getChartData = () => {
    const examPerformance = applicants.reduce((acc, app) => {
      const mathScore = parseFloat(app.examScores?.mathematics?.percentage || '0');
      const langScore = parseFloat(app.examScores?.language?.percentage || '0');
      const engScore = parseFloat(app.examScores?.english?.percentage || '0');

      // Count only exams with scores (not 0)
      const scores = [mathScore, langScore, engScore].filter(score => score > 0);

      // If no scores at all, mark as pending
      if (scores.length === 0) {
        acc.pendiente++;
        return acc;
      }

      // Calculate average only from exams with scores
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      if (avgScore >= 80) acc.excelente++;
      else if (avgScore >= 60) acc.bueno++;
      else acc.regular++;

      return acc;
    }, { excelente: 0, bueno: 0, regular: 0, pendiente: 0 });

    const performanceData = [
      { name: 'Excelente (≥80%)', value: examPerformance.excelente, color: '#10B981' },
      { name: 'Bueno (60-79%)', value: examPerformance.bueno, color: '#F59E0B' },
      { name: 'Regular (<60%)', value: examPerformance.regular, color: '#EF4444' },
      { name: 'Pendiente', value: examPerformance.pendiente, color: '#9CA3AF' }
    ];

    const examAverages = {
      mathematics: 0,
      language: 0,
      english: 0,
      count: 0
    };

    applicants.forEach(app => {
      if (app.examScores?.mathematics?.percentage) {
        examAverages.mathematics += parseFloat(app.examScores.mathematics.percentage);
        examAverages.count++;
      }
      if (app.examScores?.language?.percentage) {
        examAverages.language += parseFloat(app.examScores.language.percentage);
      }
      if (app.examScores?.english?.percentage) {
        examAverages.english += parseFloat(app.examScores.english.percentage);
      }
    });

    const avgData = [
      { name: 'Matemáticas', promedio: examAverages.count > 0 ? Math.round(examAverages.mathematics / examAverages.count) : 0 },
      { name: 'Lenguaje', promedio: examAverages.count > 0 ? Math.round(examAverages.language / examAverages.count) : 0 },
      { name: 'Inglés', promedio: examAverages.count > 0 ? Math.round(examAverages.english / examAverages.count) : 0 }
    ];

    return { performanceData, avgData };
  };

  const { performanceData, avgData } = getChartData();

  const performanceDistributionOption: EChartsOption = {
    color: performanceData.map(item => item.color),
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['42%', '70%'],
      center: ['50%', '44%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { formatter: '{d}%' },
      data: performanceData.map(item => ({ name: item.name, value: item.value }))
    }]
  };

  const examAverageOption: EChartsOption = {
    color: ['#3B82F6'],
    tooltip: { trigger: 'axis', valueFormatter: value => `${value}%` },
    legend: { bottom: 0 },
    grid: { left: 8, right: 8, top: 24, bottom: 48, containLabel: true },
    xAxis: { type: 'category', data: avgData.map(item => item.name) },
    yAxis: { type: 'value', min: 0, max: 100 },
    series: [{
      name: 'Promedio (%)',
      type: 'bar',
      data: avgData.map(item => item.promedio),
      barMaxWidth: 48,
      label: { show: true, position: 'top', formatter: '{c}%' }
    }]
  };

  const subjectDistributionOption: EChartsOption = {
    color: subjectDistribution.map(item => item.color),
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['42%', '72%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { formatter: '{b}: {d}%' },
      data: subjectDistribution.map(item => ({ name: item.name, value: item.value }))
    }]
  };

  const uniqueGrades = [...new Set(applicants.map(a => a.gradeApplied))].sort();
  const uniqueStatuses = [...new Set(applicants.map(a => a.applicationStatus))];

  // ─── Table local search + pagination ───
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);

  // Reset page when search changes
  React.useEffect(() => { setTablePage(1); }, [tableSearch, applicants]);

  const tableFiltered = React.useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return applicants;
    return applicants.filter(a =>
      a.studentName?.toLowerCase().includes(q) ||
      String(a.applicationId).includes(q) ||
      a.gradeApplied?.toLowerCase().includes(q) ||
      a.applicationStatus?.toLowerCase().includes(q)
    );
  }, [applicants, tableSearch]);

  const tableTotalPages = Math.ceil(tableFiltered.length / tablePageSize);
  const tablePaged = tableFiltered.slice((tablePage - 1) * tablePageSize, tablePage * tablePageSize);

  const handleSubjectClick = (subjectName: string) => {
    // Map display name to exam key
    const subjectKeyMap: Record<string, 'mathematics' | 'language' | 'english'> = {
      'Matemáticas': 'mathematics',
      'Lenguaje': 'language',
      'Inglés': 'english'
    };

    const subjectKey = subjectKeyMap[subjectName];
    if (!subjectKey) return;

    // Calculate distribution for this subject
    const distribution = applicants.reduce((acc, app) => {
      const exam = app.examScores?.[subjectKey];
      if (!exam || !exam.percentage) {
        acc.pendiente++;
      } else {
        const score = parseFloat(exam.percentage);
        if (score >= 80) acc.excelente++;
        else if (score >= 60) acc.bueno++;
        else acc.regular++;
      }
      return acc;
    }, { excelente: 0, bueno: 0, regular: 0, pendiente: 0 });

    const distributionData = [
      { name: 'Excelente (≥80%)', value: distribution.excelente, color: '#10B981' },
      { name: 'Bueno (60-79%)', value: distribution.bueno, color: '#F59E0B' },
      { name: 'Regular (<60%)', value: distribution.regular, color: '#EF4444' },
      { name: 'Pendiente', value: distribution.pendiente, color: '#9CA3AF' }
    ].filter(item => item.value > 0);

    setSubjectDistribution(distributionData);
    setSelectedSubject(subjectName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando métricas de postulantes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Métricas Detalladas de Postulantes</h2>
          <p className="text-gray-600 mt-1">
            Rendimiento académico y entrevistas de cada postulante
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <FiFilter className="h-4 w-4" />
            {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </Button>
          <Button
            variant="primary"
            onClick={exportToExcel}
            disabled={applicants.length === 0}
            className="flex items-center gap-2"
          >
            <FiDownload className="h-4 w-4" />
            Exportar a Excel
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Año Académico
              </label>
              <select
                value={filters.academicYear || ''}
                onChange={(e) => setFilters({ ...filters, academicYear: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Curso
              </label>
              <select
                value={filters.grade || ''}
                onChange={(e) => setFilters({ ...filters, grade: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los cursos</option>
                {uniqueGrades.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>
                    {status === 'APPROVED' ? 'Aprobado' :
                     status === 'REJECTED' ? 'Rechazado' :
                     status === 'UNDER_REVIEW' ? 'En Revisión' :
                     status === 'WAITLIST' ? 'Lista de Espera' :
                     status === 'SUBMITTED' ? 'Enviado' : status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(filters.grade || filters.status) && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">Filtros activos:</span>
              {filters.grade && (
                <Badge variant="info">
                  Curso: {filters.grade}
                  <button
                    onClick={() => setFilters({ ...filters, grade: undefined })}
                    className="ml-2 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filters.status && (
                <Badge variant="info">
                  Estado: {filters.status}
                  <button
                    onClick={() => setFilters({ ...filters, status: undefined })}
                    className="ml-2 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <button
                onClick={() => setFilters({ academicYear: filters.academicYear })}
                className="text-sm text-blue-600 hover:text-blue-800 underline ml-2"
              >
                Limpiar todos
              </button>
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Postulantes</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{applicants.length}</p>
            </div>
            <FiUser className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Evaluaciones Completadas</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {applicants.length > 0 ? Math.round(
                  applicants.reduce((sum, a) => {
                    const completed = [a.examScores?.mathematics, a.examScores?.language, a.examScores?.english]
                      .filter(e => e && e.status === 'COMPLETED').length;
                    return sum + (completed / 3) * 100;
                  }, 0) / applicants.length
                ) : 0}%
              </p>
            </div>
            <FiAward className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Entrevistas Realizadas</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {applicants.reduce((sum, a) => sum + (a.familyInterviews?.length || 0), 0)}
              </p>
            </div>
            <FiFileText className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Documentos Aprobados</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {applicants.length > 0 ? Math.round(
                  applicants.reduce((sum, a) => sum + parseFloat(String(a.documents?.completionRate || '0')), 0) / applicants.length
                ) : 0}%
              </p>
            </div>
            <FiTrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Rendimiento</h3>
          <EChart option={performanceDistributionOption} height={300} />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Promedio por Examen</h3>
          <p className="text-sm text-gray-500 mb-2">Haz clic en una barra para ver la distribución detallada</p>
          <EChart
            option={examAverageOption}
            height={300}
            onEvents={{ click: params => params.name && handleSubjectClick(String(params.name)) }}
          />
        </Card>
      </div>

      <Card className="p-6">
        {/* Header + buscador */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Detalle por Postulante
            <span className="ml-2 text-sm font-normal text-gray-400">
              {tableFiltered.length} resultado{tableFiltered.length !== 1 ? 's' : ''}
              {tableSearch && applicants.length !== tableFiltered.length && ` de ${applicants.length}`}
            </span>
          </h3>
        </div>

        {/* Buscador */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={tableSearch}
            onChange={e => setTableSearch(e.target.value)}
            placeholder="Buscar por nombre, ID, curso o estado…"
            className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {tableSearch && (
            <button
              onClick={() => setTableSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Postulante</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Curso</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Matemáticas</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Lenguaje</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Inglés</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Entrevistas</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Documentos</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {tablePaged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <FiUser className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      {tableSearch ? 'Sin resultados para la búsqueda' : 'No se encontraron postulantes para los filtros seleccionados'}
                    </p>
                    {tableSearch && (
                      <button onClick={() => setTableSearch('')} className="mt-2 text-xs text-blue-600 hover:underline">
                        Limpiar búsqueda
                      </button>
                    )}
                  </td>
                </tr>
              ) : tablePaged.map((applicant) => {
                const parts = (applicant.studentName || '').split(/\s+/).filter(Boolean);
                const initials = parts.length > 1
                  ? `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`
                  : (parts[0] || 'N').slice(0, 2);

                return (
                  <tr key={applicant.applicationId} className="hover:bg-gray-50 transition-colors">
                    {/* Postulante */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 h-9 w-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold uppercase">
                          {initials.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{applicant.studentName}</div>
                          <div className="text-xs text-gray-400">ID: {applicant.applicationId}</div>
                        </div>
                      </div>
                    </td>

                    {/* Curso */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 hidden sm:table-cell">
                      {applicant.gradeApplied}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(applicant.applicationStatus)}
                    </td>

                    {/* Matemáticas */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {getScoreCell(
                        applicant.examScores?.mathematics?.percentage || null,
                        applicant.examScores?.mathematics?.score,
                        applicant.examScores?.mathematics?.maxScore,
                        applicant.examScores?.mathematics?.status || 'PENDING'
                      )}
                    </td>

                    {/* Lenguaje */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {getScoreCell(
                        applicant.examScores?.language?.percentage || null,
                        applicant.examScores?.language?.score,
                        applicant.examScores?.language?.maxScore,
                        applicant.examScores?.language?.status || 'PENDING'
                      )}
                    </td>

                    {/* Inglés */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {getScoreCell(
                        applicant.examScores?.english?.percentage || null,
                        applicant.examScores?.english?.score,
                        applicant.examScores?.english?.maxScore,
                        applicant.examScores?.english?.status || 'PENDING'
                      )}
                    </td>

                    {/* Entrevistas */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {(() => {
                        const ivs = applicant.familyInterviews;

                        // Estado 1: sin ninguna entrevista asignada
                        if (!ivs || ivs.length === 0) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                              Sin asignar
                            </span>
                          );
                        }

                        const done = ivs.filter(i => i.status === 'COMPLETED' && i.score != null);
                        const total = ivs.length;

                        // Estado 2: asignadas pero ninguna completada
                        if (done.length === 0) {
                          return (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Pendiente
                              </span>
                              <div className="text-[10px] text-gray-400 pl-0.5">{total} asignada{total !== 1 ? 's' : ''}</div>
                            </div>
                          );
                        }

                        // Estado 3: al menos una completada
                        const avgPct = done.reduce((s, i) => s + ((i.score || 0) / (i.maxScore || 10)) * 100, 0) / done.length;
                        const color = avgPct >= 80
                          ? { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' }
                          : avgPct >= 60
                          ? { pill: 'bg-amber-50 text-amber-700 border-amber-200',   bar: 'bg-amber-400' }
                          : { pill: 'bg-red-50 text-red-700 border-red-200',         bar: 'bg-red-400' };
                        return (
                          <div className="space-y-1.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${color.pill}`}>
                              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              {avgPct.toFixed(0)}%
                            </span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1 rounded-full bg-gray-200">
                                <div className={`h-1 rounded-full ${color.bar}`} style={{ width: `${done.length / total * 100}%` }} />
                              </div>
                              <span className="text-[10px] text-gray-400">{done.length}/{total}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Documentos */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(() => {
                        const approved = applicant.documents?.approved || 0;
                        const total    = applicant.documents?.total    || 0;
                        const pending  = total - approved;

                        // Estado 1: sin documentos
                        if (total === 0) {
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-dashed border-gray-300 text-[11px] text-gray-400 bg-white">
                              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Sin docs
                            </span>
                          );
                        }

                        // Estado 2: adjuntados, ninguno aprobado → en revisión
                        if (approved === 0) {
                          return (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-blue-300 text-[11px] text-blue-600 bg-blue-50">
                                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                En revisión
                              </span>
                              <div className="text-[10px] text-gray-400 pl-0.5">{total} adjunto{total !== 1 ? 's' : ''}</div>
                            </div>
                          );
                        }

                        // Estado 3: parcialmente aprobados
                        if (pending > 0) {
                          return (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-amber-300 text-[11px] font-medium text-amber-700 bg-amber-50">
                                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Parcial
                              </span>
                              <div className="flex items-center gap-1">
                                <div className="w-14 h-1 rounded-full bg-gray-200">
                                  <div className="h-1 rounded-full bg-amber-400" style={{ width: `${(approved / total) * 100}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-400">{approved}/{total}</span>
                              </div>
                            </div>
                          );
                        }

                        // Estado 4: todos aprobados
                        return (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-semibold text-emerald-700 bg-emerald-50">
                              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              Validado
                            </span>
                            <div className="text-[10px] text-gray-400 pl-0.5">{total}/{total} docs</div>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer: contador + selector + paginación */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 px-1">
          <span className="text-xs text-gray-400">
            {tableFiltered.length > 0
              ? `${Math.min((tablePage - 1) * tablePageSize + 1, tableFiltered.length)}–${Math.min(tablePage * tablePageSize, tableFiltered.length)} de ${tableFiltered.length}`
              : '0 resultados'}
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Por página:</span>
              <select
                value={tablePageSize}
                onChange={e => { setTablePageSize(Number(e.target.value)); setTablePage(1); }}
                className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            {tableTotalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setTablePage(1)} disabled={tablePage === 1} className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-100">«</button>
                <button onClick={() => setTablePage(p => p - 1)} disabled={tablePage === 1} className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-100">‹</button>
                <span className="px-3 py-1 rounded border text-xs bg-blue-600 text-white">{tablePage} / {tableTotalPages}</span>
                <button onClick={() => setTablePage(p => p + 1)} disabled={tablePage === tableTotalPages} className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-100">›</button>
                <button onClick={() => setTablePage(tableTotalPages)} disabled={tablePage === tableTotalPages} className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-100">»</button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Modal de distribución por asignatura */}
      {selectedSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Distribución de Rendimiento - {selectedSubject}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Basado en {applicants.length} postulantes
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSubject(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6">
                <EChart option={subjectDistributionOption} height={350} />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Desglose Detallado</h4>
                <div className="grid grid-cols-2 gap-4">
                  {subjectDistribution.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                      style={{ borderColor: item.color }}
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">{item.name}</p>
                        <p className="text-lg font-bold" style={{ color: item.color }}>
                          {item.value} estudiantes
                        </p>
                        <p className="text-xs text-gray-500">
                          {Math.round((item.value / applicants.length) * 100)}% del total
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedSubject(null)}
                  className="flex items-center gap-2"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicantMetricsView;
