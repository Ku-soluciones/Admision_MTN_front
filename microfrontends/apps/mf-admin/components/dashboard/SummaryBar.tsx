import React from 'react';
import { FiAlertTriangle, FiCalendar, FiCheckCircle, FiGrid } from 'react-icons/fi';
import { WeeklyOverviewResponse } from '../../types/interview';

interface SummaryBarProps {
  summary: WeeklyOverviewResponse['summary'];
}

const SummaryBar: React.FC<SummaryBarProps> = ({ summary }) => {
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
    }
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {items.map(item => {
        const Icon = item.icon;
        return (
          <div key={item.label} className={`rounded-lg border p-4 ${item.className}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-bold leading-none">{item.value}</p>
                <p className="mt-1 text-sm font-medium">{item.label}</p>
              </div>
              <Icon className="h-7 w-7 flex-shrink-0" aria-hidden="true" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SummaryBar;
