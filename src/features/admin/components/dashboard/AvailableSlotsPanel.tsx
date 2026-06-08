import React from 'react';
import { FiAlertTriangle, FiArrowRight } from 'react-icons/fi';
import { InterviewerInfo, WeeklyOverviewDay } from '../../types/interview';
import { getPairLabel } from './dashboardTypes';

interface AvailableSlotsPanelProps {
  days: WeeklyOverviewDay[];
  onSlotClick: (date: string, time: string, availableInterviewers: InterviewerInfo[]) => void;
}

const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isHourlySlot = (time: string): boolean => time.endsWith(':00');

const AvailableSlotsPanel: React.FC<AvailableSlotsPanelProps> = ({ days, onSlotClick }) => {
  const slots = days
    .flatMap(day => day.available.map(slot => ({ ...slot, date: day.date, dayLabel: day.dayLabel })))
    .filter(slot => slot.interviewerCount >= 2 && slot.date >= getTodayDateString() && isHourlySlot(slot.time))
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    .slice(0, 8);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">Proximos slots libres</h3>
        <p className="text-xs text-gray-500">Ordenados por disponibilidad inmediata</p>
      </div>

      {slots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
          No hay slots libres para mostrar en este rango.
        </div>
      ) : (
        <div className="space-y-2">
          {slots.map(slot => (
            <button
              key={`${slot.date}-${slot.time}`}
              type="button"
              onClick={() => onSlotClick(slot.date, slot.time, slot.availableInterviewers)}
              className="w-full rounded-lg border border-gray-100 p-3 text-left transition-colors hover:border-teal-300 hover:bg-teal-50"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{slot.dayLabel} · {slot.time}</p>
                  <p className="truncate text-xs text-gray-600">{getPairLabel(slot.availableInterviewers)}</p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {slot.interviewerCount > 2 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                      <FiAlertTriangle className="h-3 w-3" aria-hidden="true" />
                      {slot.interviewerCount}
                    </span>
                  )}
                  <FiArrowRight className="h-4 w-4 text-gray-500" aria-hidden="true" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default AvailableSlotsPanel;
