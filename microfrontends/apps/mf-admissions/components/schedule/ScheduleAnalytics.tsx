import React, { useState, useEffect } from 'react';
import { interviewerScheduleService, User } from '../../services/interviewerScheduleService';
import { BarChart3, TrendingUp, Clock, Users, Calendar, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

interface ScheduleAnalyticsProps {
    year?: number;
}

interface WorkloadStatistic {
    interviewerId: number;
    firstName: string;
    lastName: string;
    scheduleCount: number;
    totalMinutes: number;
    role?: string;
}

const ScheduleAnalytics: React.FC<ScheduleAnalyticsProps> = ({ 
    year = new Date().getFullYear() 
}) => {
    const [workloadStats, setWorkloadStats] = useState<WorkloadStatistic[]>([]);
    const [interviewersWithSchedules, setInterviewersWithSchedules] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState(year);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadAnalytics();
    }, [selectedYear]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            const [statsData, interviewersData] = await Promise.all([
                interviewerScheduleService.getWorkloadStatistics(selectedYear),
                interviewerScheduleService.getInterviewersWithSchedules(selectedYear)
            ]);

            // Transform the raw statistics data
            const transformedStats: WorkloadStatistic[] = statsData.map((stat: any) => ({
                interviewerId: stat[0],
                firstName: stat[1],
                lastName: stat[2],
                scheduleCount: stat[3],
                totalMinutes: stat[4] || 0
            }));

            setWorkloadStats(transformedStats);
            setInterviewersWithSchedules(interviewersData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar analíticas');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadAnalytics();
    };

    const formatDuration = (minutes: number): string => {
        if (minutes < 60) return `${minutes}min`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
    };

    const calculateTotalStats = () => {
        const totalSchedules = workloadStats.reduce((sum, stat) => sum + stat.scheduleCount, 0);
        const totalMinutes = workloadStats.reduce((sum, stat) => sum + stat.totalMinutes, 0);
        const averageSchedulesPerInterviewer = workloadStats.length > 0 
            ? Math.round(totalSchedules / workloadStats.length) 
            : 0;
        const averageMinutesPerInterviewer = workloadStats.length > 0 
            ? Math.round(totalMinutes / workloadStats.length) 
            : 0;

        return {
            totalInterviewers: interviewersWithSchedules.length,
            totalSchedules,
            totalMinutes,
            totalHours: Math.round(totalMinutes / 60 * 10) / 10,
            averageSchedulesPerInterviewer,
            averageMinutesPerInterviewer,
            interviewersWithoutSchedules: Math.max(0, interviewersWithSchedules.length - workloadStats.length)
        };
    };

    const getWorkloadLevel = (minutes: number): { level: string; color: string; variant: any } => {
        if (minutes === 0) return { level: 'Sin configurar', color: 'bg-gray-100', variant: 'secondary' };
        if (minutes < 480) return { level: 'Baja carga', color: 'bg-green-100', variant: 'success' };
        if (minutes < 960) return { level: 'Carga normal', color: 'bg-blue-100', variant: 'info' };
        if (minutes < 1440) return { level: 'Alta carga', color: 'bg-yellow-100', variant: 'warning' };
        return { level: 'Sobrecarga', color: 'bg-red-100', variant: 'danger' };
    };

    const generateReport = () => {
        const stats = calculateTotalStats();
        const reportData = {
            year: selectedYear,
            generatedAt: new Date().toISOString(),
            summary: stats,
            interviewers: workloadStats.map(stat => ({
                ...stat,
                workloadLevel: getWorkloadLevel(stat.totalMinutes).level,
                hoursPerWeek: Math.round(stat.totalMinutes / 60 * 10) / 10
            }))
        };

        const dataStr = JSON.stringify(reportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte-horarios-${selectedYear}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="text-center">
                    <BarChart3 className="w-8 h-8 text-azul-monte-tabor mx-auto mb-2 animate-pulse" />
                    <p className="text-gris-piedra">Cargando analíticas...</p>
                </div>
            </div>
        );
    }

    const stats = calculateTotalStats();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-azul-monte-tabor mb-2">
                        Analíticas de Horarios de Entrevistadores
                    </h2>
                    <p className="text-gris-piedra">
                        Análisis de carga de trabajo y disponibilidad por entrevistador
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gris-piedra" />
                        <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-md"
                        >
                            {[2024, 2025, 2026].map(yr => (
                                <option key={yr} value={yr}>{yr}</option>
                            ))}
                        </select>
                    </div>

                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        leftIcon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
                    >
                        {refreshing ? 'Actualizando...' : 'Actualizar'}
                    </Button>

                    <Button
                        size="sm"
                        onClick={generateReport}
                        leftIcon={<Download className="w-4 h-4" />}
                    >
                        Exportar Reporte
                    </Button>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <Card className="p-4 border-red-200 bg-red-50">
                    <div className="flex items-center gap-2 text-red-800">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{error}</span>
                    </div>
                </Card>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gris-piedra">Total Entrevistadores</h3>
                        <Users className="w-5 h-5 text-azul-monte-tabor" />
                    </div>
                    <div className="text-2xl font-bold text-azul-monte-tabor">{stats.totalInterviewers}</div>
                    <div className="text-xs text-gris-piedra mt-1">
                        {workloadStats.length} con horarios configurados
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gris-piedra">Total Horarios</h3>
                        <Calendar className="w-5 h-5 text-verde-esperanza" />
                    </div>
                    <div className="text-2xl font-bold text-verde-esperanza">{stats.totalSchedules}</div>
                    <div className="text-xs text-gris-piedra mt-1">
                        Promedio: {stats.averageSchedulesPerInterviewer} por entrevistador
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gris-piedra">Horas Totales</h3>
                        <Clock className="w-5 h-5 text-dorado-nazaret" />
                    </div>
                    <div className="text-2xl font-bold text-dorado-nazaret">{stats.totalHours}h</div>
                    <div className="text-xs text-gris-piedra mt-1">
                        {formatDuration(stats.averageMinutesPerInterviewer)} promedio
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gris-piedra">Cobertura</h3>
                        <TrendingUp className="w-5 h-5 text-rojo-nazaret" />
                    </div>
                    <div className="text-2xl font-bold text-rojo-nazaret">
                        {stats.totalInterviewers > 0 
                            ? Math.round((workloadStats.length / stats.totalInterviewers) * 100)
                            : 0
                        }%
                    </div>
                    <div className="text-xs text-gris-piedra mt-1">
                        {stats.interviewersWithoutSchedules} sin configurar
                    </div>
                </Card>
            </div>

            {/* Workload Distribution Chart */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4">
                    Distribución de Carga de Trabajo
                </h3>
                
                {workloadStats.length === 0 ? (
                    <div className="text-center py-8">
                        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-gris-piedra mb-2">
                            No hay datos de carga de trabajo
                        </h4>
                        <p className="text-gris-piedra">
                            No hay entrevistadores con horarios configurados para {selectedYear}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {workloadStats
                            .sort((a, b) => b.totalMinutes - a.totalMinutes)
                            .map((stat, index) => {
                                const workload = getWorkloadLevel(stat.totalMinutes);
                                const percentage = stats.totalMinutes > 0 
                                    ? (stat.totalMinutes / stats.totalMinutes) * 100 
                                    : 0;
                                
                                return (
                                    <div key={stat.interviewerId} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-azul-monte-tabor text-white text-sm font-semibold">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-azul-monte-tabor">
                                                        {stat.firstName} {stat.lastName}
                                                    </h4>
                                                    <p className="text-sm text-gris-piedra">
                                                        ID: {stat.interviewerId}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="text-right">
                                                <Badge variant={workload.variant} size="sm">
                                                    {workload.level}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-azul-monte-tabor">
                                                    {stat.scheduleCount}
                                                </div>
                                                <div className="text-xs text-gris-piedra">Horarios</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-dorado-nazaret">
                                                    {formatDuration(stat.totalMinutes)}
                                                </div>
                                                <div className="text-xs text-gris-piedra">Tiempo total</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-verde-esperanza">
                                                    {Math.round(percentage * 10) / 10}%
                                                </div>
                                                <div className="text-xs text-gris-piedra">Del total</div>
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                                className={`h-2 rounded-full transition-all duration-300 ${
                                                    percentage < 10 ? 'bg-green-500' :
                                                    percentage < 25 ? 'bg-blue-500' :
                                                    percentage < 40 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}
                                                style={{ width: `${Math.max(percentage, 2)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}
            </Card>

            {/* Insights and Recommendations */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4">
                    Insights y Recomendaciones
                </h3>
                
                <div className="space-y-4">
                    {stats.interviewersWithoutSchedules > 0 && (
                        <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-yellow-800">
                                    Entrevistadores sin horarios configurados
                                </h4>
                                <p className="text-yellow-700 text-sm">
                                    {stats.interviewersWithoutSchedules} entrevistadores no tienen horarios configurados. 
                                    Esto puede limitar la disponibilidad para programar entrevistas.
                                </p>
                            </div>
                        </div>
                    )}

                    {workloadStats.some(stat => getWorkloadLevel(stat.totalMinutes).level === 'Sobrecarga') && (
                        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-red-800">
                                    Sobrecarga de trabajo detectada
                                </h4>
                                <p className="text-red-700 text-sm">
                                    Algunos entrevistadores tienen una carga excesiva de horarios. 
                                    Considera redistribuir la carga o agregar más entrevistadores.
                                </p>
                            </div>
                        </div>
                    )}

                    {stats.totalSchedules > 0 && workloadStats.length > 0 && (
                        <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-green-800">
                                    Sistema funcionando correctamente
                                </h4>
                                <p className="text-green-700 text-sm">
                                    Hay {workloadStats.length} entrevistadores activos con un total de {stats.totalSchedules} horarios configurados. 
                                    El sistema está listo para programar entrevistas automáticamente.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default ScheduleAnalytics;