import React from 'react';
import Card from '../ui/Card';
import { FiAlertTriangle, FiClock, FiCheckCircle, FiTrendingUp } from 'react-icons/fi';

interface InterviewSummaryProps {
  urgentCount: number;
  upcomingCount: number;
  completedCount: number;
  completionRate: number;
  className?: string;
}

const InterviewSummary: React.FC<InterviewSummaryProps> = ({
  urgentCount,
  upcomingCount,
  completedCount,
  completionRate,
  className = ''
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${className}`}>
      {/* Urgente */}
      <Card className={`p-4 ${urgentCount > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
        <div className="flex items-center">
          <div className="p-2 rounded-full bg-red-100">
            <FiAlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-red-800">
              {urgentCount > 0 ? '🚨 URGENTE' : '✅ Al día'}
            </p>
            <p className="text-2xl font-bold text-red-600">
              {urgentCount}
            </p>
            <p className="text-xs text-red-600">Sin entrevistas</p>
          </div>
        </div>
      </Card>

      {/* Próximas */}
      <Card className="p-4 border-yellow-200">
        <div className="flex items-center">
          <div className="p-2 rounded-full bg-yellow-100">
            <FiClock className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-yellow-800">Esta semana</p>
            <p className="text-2xl font-bold text-yellow-600">
              {upcomingCount}
            </p>
            <p className="text-xs text-yellow-600">Próximas</p>
          </div>
        </div>
      </Card>

      {/* Completadas */}
      <Card className="p-4 border-green-200">
        <div className="flex items-center">
          <div className="p-2 rounded-full bg-green-100">
            <FiCheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-green-800">Realizadas</p>
            <p className="text-2xl font-bold text-green-600">
              {completedCount}
            </p>
            <p className="text-xs text-green-600">Completadas</p>
          </div>
        </div>
      </Card>

      {/* Tasa de completión */}
      <Card className="p-4 border-blue-200">
        <div className="flex items-center">
          <div className="p-2 rounded-full bg-blue-100">
            <FiTrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-blue-800">Eficiencia</p>
            <p className="text-2xl font-bold text-blue-600">
              {Math.round(completionRate)}%
            </p>
            <p className="text-xs text-blue-600">Completión</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InterviewSummary;