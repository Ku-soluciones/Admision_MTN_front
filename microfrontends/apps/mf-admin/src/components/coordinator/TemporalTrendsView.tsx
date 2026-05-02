/**
 * Temporal Trends View Component
 * HU-005: Visualizar comparativas de postulaciones por año/nivel
 *
 * Displays: Monthly trends, year-over-year comparison, growth rates
 */

import React, { useState, useEffect } from 'react';
import { dashboardClient } from '../../api/dashboard.client';
import type { TemporalTrend, DetailedAdminStats } from '../../api/dashboard.types';
import type { EChartsOption } from 'echarts';
import EChart from '../charts/EChart';
import { format } from 'date-fns';

export const TemporalTrendsView: React.FC = () => {
  const [trends, setTrends] = useState<TemporalTrend[]>([]);
  const [yearlyStats, setYearlyStats] = useState<Record<number, DetailedAdminStats>>({});
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrendsData();
  }, []);

  const loadTrendsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get temporal trends (last 12 months)
      const trendsData = await dashboardClient.getTemporalTrends();
      setTrends(trendsData);

      // Get available years
      const currentYear = new Date().getFullYear();
      const years = [currentYear - 1, currentYear, currentYear + 1];
      setAvailableYears(years);
      setSelectedYears([currentYear, currentYear + 1]);

      // Load stats for each year
      const statsPromises = years.map(year =>
        dashboardClient.getDetailedAdminStats({ academicYear: year })
          .then(stats => ({ year, stats }))
          .catch(() => ({ year, stats: null }))
      );

      const statsResults = await Promise.all(statsPromises);
      const statsMap: Record<number, DetailedAdminStats> = {};
      statsResults.forEach(({ year, stats }) => {
        if (stats) statsMap[year] = stats;
      });

      setYearlyStats(statsMap);
    } catch (err: any) {
      console.error('Error loading trends:', err);
      setError(err.message || 'Error al cargar tendencias');
    } finally {
      setLoading(false);
    }
  };

  const toggleYear = (year: number) => {
    setSelectedYears(prev =>
      prev.includes(year)
        ? prev.filter(y => y !== year)
        : [...prev, year]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tendencias...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  // Format trends data for charts
  const monthlyTrendsData = trends.map(t => ({
    month: `${t.month}/${t.year}`,
    total: t.totalApplications,
    approved: t.approvedApplications,
    rejected: t.rejectedApplications,
    growthRate: t.growthRate
  }));

  // Comparison data between selected years
  const comparisonData = selectedYears.map(year => {
    const stats = yearlyStats[year];
    if (!stats) return null;

    return {
      year,
      total: stats.totalApplications,
      approved: stats.statusBreakdown.approved,
      rejected: stats.statusBreakdown.rejected,
      acceptanceRate: stats.totalApplications > 0
        ? ((stats.statusBreakdown.approved / stats.totalApplications) * 100)
        : 0
    };
  }).filter(Boolean);

  const monthlyTrendsOption: EChartsOption = {
    color: ['#3B82F6', '#10B981', '#EF4444', '#F59E0B'],
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { left: 8, right: 48, top: 24, bottom: 80, containLabel: true },
    xAxis: {
      type: 'category',
      data: monthlyTrendsData.map(item => item.month),
      axisLabel: { rotate: 45 }
    },
    yAxis: [
      { type: 'value', name: 'Postulaciones' },
      { type: 'value', name: '%' }
    ],
    series: [
      { name: 'Total Postulaciones', type: 'line', smooth: true, yAxisIndex: 0, data: monthlyTrendsData.map(item => item.total) },
      { name: 'Aprobadas', type: 'line', smooth: true, yAxisIndex: 0, data: monthlyTrendsData.map(item => item.approved) },
      { name: 'Rechazadas', type: 'line', smooth: true, yAxisIndex: 0, data: monthlyTrendsData.map(item => item.rejected) },
      { name: 'Tasa de Crecimiento (%)', type: 'line', smooth: true, yAxisIndex: 1, lineStyle: { type: 'dashed' }, data: monthlyTrendsData.map(item => item.growthRate) }
    ]
  };

  const comparisonOption: EChartsOption = {
    color: ['#3B82F6', '#10B981', '#EF4444'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0 },
    grid: { left: 8, right: 8, top: 16, bottom: 48, containLabel: true },
    xAxis: { type: 'category', data: comparisonData.map((item: any) => item.year) },
    yAxis: { type: 'value' },
    series: [
      { name: 'Total', type: 'bar', data: comparisonData.map((item: any) => item.total) },
      { name: 'Aprobadas', type: 'bar', data: comparisonData.map((item: any) => item.approved) },
      { name: 'Rechazadas', type: 'bar', data: comparisonData.map((item: any) => item.rejected) }
    ]
  };

  const acceptanceRateOption: EChartsOption = {
    color: ['#10B981'],
    tooltip: { trigger: 'axis', valueFormatter: value => `${Number(value).toFixed(1)}%` },
    legend: { bottom: 0 },
    grid: { left: 8, right: 8, top: 16, bottom: 48, containLabel: true },
    xAxis: { type: 'category', data: comparisonData.map((item: any) => item.year) },
    yAxis: { type: 'value', min: 0, max: 100 },
    series: [{ name: 'Tasa de Aceptación (%)', type: 'bar', data: comparisonData.map((item: any) => item.acceptanceRate), barMaxWidth: 48 }]
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Análisis Temporal</h1>
        <p className="mt-2 text-sm text-gray-600">
          Tendencias y comparativas de postulaciones
        </p>
      </div>

      {/* Year Selector */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-3">Seleccionar Años para Comparar</h2>
        <div className="flex flex-wrap gap-2">
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => toggleYear(year)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedYears.includes(year)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly Trends Chart */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Tendencia Mensual (Últimos 12 meses)</h2>
        <EChart option={monthlyTrendsOption} height={400} />
      </div>

      {/* Year Comparison */}
      {comparisonData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Total Applications Comparison */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Comparativa de Postulaciones</h2>
            <EChart option={comparisonOption} height={300} />
          </div>

          {/* Acceptance Rate Comparison */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Tasa de Aceptación por Año</h2>
            <EChart option={acceptanceRateOption} height={300} />
          </div>
        </div>
      )}

      {/* Detailed Stats Comparison Table */}
      {selectedYears.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Comparativa Detallada</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Métrica
                  </th>
                  {selectedYears.map(year => (
                    <th
                      key={year}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Total Postulaciones
                  </td>
                  {selectedYears.map(year => (
                    <td key={year} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {yearlyStats[year]?.totalApplications || 0}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Aprobadas
                  </td>
                  {selectedYears.map(year => (
                    <td key={year} className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {yearlyStats[year]?.statusBreakdown.approved || 0}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Rechazadas
                  </td>
                  {selectedYears.map(year => (
                    <td key={year} className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {yearlyStats[year]?.statusBreakdown.rejected || 0}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Tasa de Aceptación
                  </td>
                  {selectedYears.map(year => {
                    const stats = yearlyStats[year];
                    const rate = stats && stats.totalApplications > 0
                      ? ((stats.statusBreakdown.approved / stats.totalApplications) * 100).toFixed(1)
                      : '0.0';
                    return (
                      <td key={year} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rate}%
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Entrevistas Completadas
                  </td>
                  {selectedYears.map(year => (
                    <td key={year} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {yearlyStats[year]?.interviewMetrics.completed || 0}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Evaluaciones Completadas
                  </td>
                  {selectedYears.map(year => (
                    <td key={year} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {yearlyStats[year]?.evaluationMetrics.completed || 0}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemporalTrendsView;
