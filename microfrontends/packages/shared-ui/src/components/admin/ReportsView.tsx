/**
 * Reports View Component
 * Comprehensive reporting interface for admissions process
 */

import React, { useState, useEffect } from 'react';
import { FiDownload, FiFilter, FiCalendar, FiBarChart2, FiPieChart, FiTrendingUp } from 'react-icons/fi';
import Card from '../ui/Card';
import Button from '../ui/Button';
import type { EChartsOption } from 'echarts';
import EChart from '../charts/EChart';
import { dashboardClient } from '../../src/api/dashboard.client';

interface ReportFilters {
    academicYear: number;
    startDate?: string;
    endDate?: string;
    grade?: string;
    status?: string;
}

export const ReportsView: React.FC = () => {
    const [filters, setFilters] = useState<ReportFilters>({
        academicYear: new Date().getFullYear() + 1
    });
    const [statusData, setStatusData] = useState<any[]>([]);
    const [gradeData, setGradeData] = useState<any[]>([]);
    const [temporalData, setTemporalData] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<'status' | 'grade' | 'temporal' | 'complete'>('status');

    useEffect(() => {
        loadReportData();
    }, [filters]);

    const loadReportData = async () => {
        try {
            setLoading(true);

            const [
                statusDistribution,
                gradeDistribution,
                temporalTrends,
                dashboardMetrics
            ] = await Promise.all([
                dashboardClient.getStatusDistribution(),
                dashboardClient.getGradeDistribution(),
                dashboardClient.getTemporalTrends(),
                dashboardClient.getDashboardMetrics()
            ]);

            setStatusData(statusDistribution);
            setGradeData(gradeDistribution);
            setTemporalData(temporalTrends);
            setMetrics(dashboardMetrics);
        } catch (error) {
            console.error('Error loading report data:', error);
        } finally {
            setLoading(false);
        }
    };

    const exportReport = () => {
        // Create CSV export
        const csvData = {
            status: statusData,
            grade: gradeData,
            temporal: temporalData
        };

        const csvContent = "data:text/csv;charset=utf-8," +
            Object.entries(csvData).map(([key, data]) => {
                const headers = Object.keys(data[0] || {}).join(',');
                const rows = data.map((row: any) => Object.values(row).join(','));
                return `\\n${key.toUpperCase()}\\n${headers}\\n${rows.join('\\n')}`;
            }).join('\\n\\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reporte_admisiones_${filters.academicYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    const statusBarOption: EChartsOption = {
        color: ['#3B82F6'],
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { bottom: 0 },
        grid: { left: 8, right: 8, top: 16, bottom: 48, containLabel: true },
        xAxis: { type: 'category', data: statusData.map(item => item.name) },
        yAxis: { type: 'value' },
        series: [{ name: 'Cantidad', type: 'bar', data: statusData.map(item => item.value), barMaxWidth: 44 }]
    };

    const statusPieOption: EChartsOption = {
        color: COLORS,
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        series: [{
            type: 'pie',
            radius: ['42%', '70%'],
            itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
            label: { formatter: '{b}: {c}' },
            data: statusData.map(item => ({ name: item.name, value: item.value }))
        }]
    };

    const gradeBarOption: EChartsOption = {
        color: ['#10B981'],
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { bottom: 0 },
        grid: { left: 8, right: 8, top: 16, bottom: 48, containLabel: true },
        xAxis: { type: 'category', data: gradeData.map(item => item.grade) },
        yAxis: { type: 'value' },
        series: [{ name: 'Postulaciones', type: 'bar', data: gradeData.map(item => item.count), barMaxWidth: 44 }]
    };

    const gradePieOption: EChartsOption = {
        color: COLORS,
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        series: [{
            type: 'pie',
            radius: ['42%', '70%'],
            itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
            label: { formatter: '{b}: {c}' },
            data: gradeData.map(item => ({ name: item.grade, value: item.count }))
        }]
    };

    const temporalOption: EChartsOption = {
        color: ['#3B82F6', '#10B981', '#EF4444'],
        tooltip: { trigger: 'axis' },
        legend: { bottom: 0 },
        grid: { left: 8, right: 8, top: 24, bottom: 48, containLabel: true },
        xAxis: { type: 'category', data: temporalData.map(item => item.month) },
        yAxis: { type: 'value' },
        series: [
            { name: 'Postulaciones', type: 'line', smooth: true, data: temporalData.map(item => item.applications) },
            { name: 'Aprobadas', type: 'line', smooth: true, data: temporalData.map(item => item.approved) },
            { name: 'Rechazadas', type: 'line', smooth: true, data: temporalData.map(item => item.rejected) }
        ]
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando reportes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Reportes del Sistema</h2>
                    <p className="text-gray-600 mt-1">Análisis detallado del proceso de admisión {filters.academicYear}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={filters.academicYear}
                        onChange={(e) => setFilters({ ...filters, academicYear: parseInt(e.target.value) })}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                        <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
                        <option value={new Date().getFullYear() + 2}>{new Date().getFullYear() + 2}</option>
                    </select>
                    <Button
                        variant="primary"
                        onClick={exportReport}
                        className="flex items-center gap-2"
                    >
                        <FiDownload className="h-4 w-4" />
                        Exportar CSV
                    </Button>
                </div>
            </div>

            {/* Metrics Summary */}
            {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Postulaciones</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.totalApplications || 0}</p>
                            </div>
                            <FiBarChart2 className="h-8 w-8 text-blue-500" />
                        </div>
                    </Card>
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Tasa de Aceptación</p>
                                <p className="text-3xl font-bold text-green-600 mt-2">{metrics.acceptanceRate || 0}%</p>
                            </div>
                            <FiTrendingUp className="h-8 w-8 text-green-500" />
                        </div>
                    </Card>
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Entrevistas Completadas</p>
                                <p className="text-3xl font-bold text-purple-600 mt-2">{metrics.interviewsCompleted || 0}</p>
                            </div>
                            <FiCalendar className="h-8 w-8 text-purple-500" />
                        </div>
                    </Card>
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Evaluaciones Pendientes</p>
                                <p className="text-3xl font-bold text-orange-600 mt-2">{metrics.evaluationsPending || 0}</p>
                            </div>
                            <FiPieChart className="h-8 w-8 text-orange-500" />
                        </div>
                    </Card>
                </div>
            )}

            {/* Report Type Selector */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setSelectedReport('status')}
                    className={`px-4 py-2 font-medium ${selectedReport === 'status' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                    Distribución por Estado
                </button>
                <button
                    onClick={() => setSelectedReport('grade')}
                    className={`px-4 py-2 font-medium ${selectedReport === 'grade' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                    Distribución por Grado
                </button>
                <button
                    onClick={() => setSelectedReport('temporal')}
                    className={`px-4 py-2 font-medium ${selectedReport === 'temporal' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                    Tendencias Temporales
                </button>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {selectedReport === 'status' && (
                    <>
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Estado (Barras)</h3>
                            <EChart option={statusBarOption} height={300} />
                        </Card>
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Estado (Pastel)</h3>
                            <EChart option={statusPieOption} height={300} />
                        </Card>
                    </>
                )}

                {selectedReport === 'grade' && (
                    <>
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Postulaciones por Grado (Barras)</h3>
                            <EChart option={gradeBarOption} height={300} />
                        </Card>
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Postulaciones por Grado (Pastel)</h3>
                            <EChart option={gradePieOption} height={300} />
                        </Card>
                    </>
                )}

                {selectedReport === 'temporal' && (
                    <Card className="p-6 lg:col-span-2">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencias Temporales de Postulaciones</h3>
                        <EChart option={temporalOption} height={400} />
                    </Card>
                )}
            </div>

            {/* Data Table */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos Detallados</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {selectedReport === 'status' && (
                                    <>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Porcentaje</th>
                                    </>
                                )}
                                {selectedReport === 'grade' && (
                                    <>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Postulaciones</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aceptados</th>
                                    </>
                                )}
                                {selectedReport === 'temporal' && (
                                    <>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mes</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Postulaciones</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aprobadas</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rechazadas</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {selectedReport === 'status' && statusData.map((row, idx) => {
                                const total = statusData.reduce((sum, r) => sum + r.value, 0);
                                const percentage = ((row.value / total) * 100).toFixed(1);
                                return (
                                    <tr key={idx}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.value}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{percentage}%</td>
                                    </tr>
                                );
                            })}
                            {selectedReport === 'grade' && gradeData.map((row, idx) => (
                                <tr key={idx}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.grade}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.count}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.approved || 0}</td>
                                </tr>
                            ))}
                            {selectedReport === 'temporal' && temporalData.map((row, idx) => (
                                <tr key={idx}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.month}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.applications}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.approved}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.rejected}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default ReportsView;
