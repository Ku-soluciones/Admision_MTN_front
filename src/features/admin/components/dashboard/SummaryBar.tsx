import React from 'react';
import { FiAlertOctagon, FiAlertTriangle, FiCalendar, FiCheckCircle, FiGrid } from 'react-icons/fi';
import { WeeklyOverviewResponse } from '../../types/interview';

interface SummaryBarProps {
  summary: WeeklyOverviewResponse['summary'];
  rejectedCount?: number;
}

const SummaryBar: React.FC<SummaryBarProps> = ({ summary, rejectedCount = 0 }) => {
  const items = [
    {
      label: 'Agendadas',
      value: summary.scheduledCount,
      icon: FiCalendar,
      className: 'border-blue-200 bg-blue-50 text-blue-700'
    },
    {
      label: 'Completadas',
      value: summary.completedCount,
      icon: FiCheckCircle,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700'
    },
    {
      label: 'Slots libres',
      value: summary.availableSlotsCount,
      icon: FiGrid,
      className: 'border-teal-200 bg-teal-50 text-teal-700'
    },
    {
      label: 'Sin pareja',
      value: summary.singleInterviewerSlotsCount,
      icon: FiAlertTriangle,
      className: 'border-amber-200 bg-amber-50 text-amber-700'
    },
    {
      label: 'Rechazadas',
      value: rejectedCount,
      icon: FiAlertOctagon,
      className: rejectedCount > 0
        ? 'border-red-200 bg-red-50 text-red-700 ring-1 ring-red-100'
        : 'border-gray-200 bg-gray-50 text-gray-500'
    }
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Resumen operativo de entrevistas">
      {items.map(item => {
        const Icon = item.icon;
        return (
          <div key={item.label} className={`min-w-[132px] rounded-lg border px-3 py-2 ${item.className}`}>
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <p className="min-w-0 truncate text-xs font-semibold">{item.label}</p>
              <p className="ml-auto text-lg font-bold leading-none">{item.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SummaryBar;
