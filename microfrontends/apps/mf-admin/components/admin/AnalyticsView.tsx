/**
 * Analytics View Component
 * Advanced analytics and insights for admissions process
 */

import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiUsers, FiAward, FiClock } from 'react-icons/fi';
import Card from '../ui/Card';
import { BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardClient } from '../../src/api/dashboard.client';

export const AnalyticsView: React.FC = () => {
    const [evaluatorData, setEvaluatorData] = useState<any[]>([]);
    const [performanceData, setPerformanceData] = useState<any>(null);
    const [insights, setInsights] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalyticsData();
    }, []);

    const loadAnalyticsData = async () => {
        try {
            setLoading(true);

            const [
                evaluatorAnalysis,
                performanceMetrics,
                analyticsInsights
            ] = await Promise.all([
                dashboardClient.getEvaluatorAnalysis(),
                dashboardClient.getPerformanceMetrics(),
                dashboardClient.getInsights()
            ]);

            setEvaluatorData(evaluatorAnalysis);
            setPerformanceData(performanceMetrics);
            setInsights(analyticsInsights);
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando análisis...</p>
                </div>
            </div>
        );
    }

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Análisis Avanzado</h2>
                <p className="text-gray-600 mt-1">Insights y métricas de desempeño del proceso de admisión</p>
            </div>

            {/* Key Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {insights.slice(0, 3).map((insight, idx) => (
                    <Card key={idx} className={`p-6 border-l-4 ${
                        insight.severity === 'high' ? 'border-red-500' :
                        insight.severity === 'medium' ? 'border-yellow-500' :
                        'border-green-500'
                    }`}>
                        <div className="flex items-start gap-3">
                            {insight.severity === 'high' ? (
                                <FiClock className="h-6 w-6 text-red-500 flex-shrink-0" />
                            ) : insight.severity === 'medium' ? (
                                <FiTrendingUp className="h-6 w-6 text-yellow-500 flex-shrink-0" />
                            ) : (
                                <FiAward className="h-6 w-6 text-green-500 flex-shrink-0" />
                            )}
                            <div>
                                <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Performance Metrics */}
            {performanceData && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Tiempo Promedio de Procesamiento</p>
                                <p className="text-3xl font-bold text-blue-600 mt-2">{performanceData.avgProcessingTime || '0'}d</p>
                            </div>
                            <FiClock className="h-8 w-8 text-blue-500" />
                        </div>
                    </Card>
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Puntuación Promedio</p>
                                <p className="text-3xl font-bold text-green-600 mt-2">{performanceData.avgScore || '0'}</p>
                            </div>
                            <FiAward className="h-8 w-8 text-green-500" />
                        </div>
                    </Card>
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Tasa de Conversión</p>
                                <p className="text-3xl font-bold text-purple-600 mt-2">{performanceData.conversionRate || '0'}%</p>
                            </div>
                            <FiTrendingUp className="h-8 w-8 text-purple-500" />
                        </div>
                    </Card>
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Evaluadores Activos</p>
                                <p className="text-3xl font-bold text-orange-600 mt-2">{performanceData.activeEvaluators || '0'}</p>
                            </div>
                            <FiUsers className="h-8 w-8 text-orange-500" />
                        </div>
                    </Card>
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Evaluator Performance */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Rendimiento de Evaluadores</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={evaluatorData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="completed" fill="#10B981" name="Completadas" />
                            <Bar dataKey="pending" fill="#F59E0B" name="Pendientes" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                {/* Evaluator Workload Radar */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Carga de Trabajo</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={evaluatorData.slice(0, 6)}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="name" />
                            <PolarRadiusAxis />
                            <Radar name="Evaluaciones" dataKey="total" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                            <Tooltip />
                        </RadarChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* Detailed Insights Table */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Todos los Insights</h3>
                <div className="space-y-3">
                    {insights.map((insight, idx) => (
                        <div key={idx} className={`p-4 rounded-lg border ${
                            insight.severity === 'high' ? 'bg-red-50 border-red-200' :
                            insight.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                            'bg-green-50 border-green-200'
                        }`}>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                                    <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    insight.severity === 'high' ? 'bg-red-100 text-red-800' :
                                    insight.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                }`}>
                                    {insight.severity === 'high' ? 'Alta' : insight.severity === 'medium' ? 'Media' : 'Baja'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Evaluator Details Table */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalle de Evaluadores</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evaluador</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completadas</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pendientes</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasa de Completitud</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {evaluatorData.map((evaluator, idx) => {
                                const completionRate = ((evaluator.completed / evaluator.total) * 100).toFixed(1);
                                return (
                                    <tr key={idx}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{evaluator.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{evaluator.total}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{evaluator.completed}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">{evaluator.pending}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${completionRate}%` }}></div>
                                                </div>
                                                <span>{completionRate}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default AnalyticsView;
