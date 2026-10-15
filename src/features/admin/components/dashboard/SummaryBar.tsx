import React from 'react';
import { FiChevronRight } from 'react-icons/fi';
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
      className: 'bg-blue-50 text-blue-600'
    },
    {
      label: 'Completadas',
      value: summary.completedCount,
      className: 'bg-emerald-50 text-emerald-600'
    },
    {
      label: 'Slots libres',
      value: summary.availableSlotsCount,
      className: 'bg-teal-50 text-teal-600'
    },
    {
      label: 'Sin pareja',
      value: summary.singleInterviewerSlotsCount,
      className: 'bg-amber-50 text-amber-600'
    },
    {
      label: 'Rechazadas',
      value: rejectedCount,
      className: rejectedCount > 0 ? 'bg-red-50 text-red-600' : 'bg-white text-gray-500'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 rounded-xl border border-gray-200 divide-x divide-y sm:divide-y-0 divide-gray-200 overflow-hidden" aria-label="Resumen operativo de entrevistas">
      {items.map(item => {
        const [bgClass, textClass] = item.className.split(' ');
        return (
          <div key={item.label} className={`relative px-5 py-6 ${bgClass}`}>
            <p className="text-sm text-gray-600">{item.label}</p>
            <p className={`mt-3 text-3xl font-bold ${textClass}`}>{item.value}</p>
            <FiChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" aria-hidden="true" />
          </div>
        );
      })}
    </div>
  );
};

export default SummaryBar;
