import React from 'react';
import { FiArrowRight } from 'react-icons/fi';
import { AvailableInterviewerPair, InterviewerInfo, WeeklyOverviewDay } from '../../types/interview';
import { countFamilyInterviewerPairs } from '../../../../packages/shared-ui/src/utils/interviewerEligibility';

interface AvailableSlotsPanelProps {
  days: WeeklyOverviewDay[];
  onSlotClick: (date: string, time: string, availableInterviewers: InterviewerInfo[], availablePairs?: AvailableInterviewerPair[]) => void;
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
    .filter(slot => {
      const familyPairCount = slot.familyPairCount ?? countFamilyInterviewerPairs(slot.availableInterviewers);
      const cyclePairCount = slot.availablePairCount ?? slot.availablePairs?.length ?? 0;
      return (familyPairCount > 0 || cyclePairCount > 0) && slot.date >= getTodayDateString() && isHourlySlot(slot.time);
    })
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    .slice(0, 8);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-950">Próximos horarios disponibles</h3>
        <p className="mt-0.5 text-sm text-gray-600">Solo aparecen bloques con una combinación válida.</p>
      </div>

      {slots.length === 0 ? (
        <div className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
          No hay horarios disponibles en este rango.
        </div>
      ) : (
        <div className="divide-y divide-gray-200 border-y border-gray-200">
          {slots.map(slot => {
            const familyPairCount = slot.familyPairCount ?? countFamilyInterviewerPairs(slot.availableInterviewers);
            const cyclePairCount = slot.availablePairCount ?? slot.availablePairs?.length ?? 0;
            return (
              <button
                key={`${slot.date}-${slot.time}`}
                type="button"
                onClick={() => onSlotClick(slot.date, slot.time, slot.availableInterviewers, slot.availablePairs || [])}
                className="w-full px-1 py-3 text-left transition-colors hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-200"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-950">{slot.dayLabel} · {slot.time}</span>
                    <span className="mt-1 block space-y-0.5 text-xs text-gray-600">
                      {familyPairCount > 0 && (
                        <span className="block">Familiar: {familyPairCount} {familyPairCount === 1 ? 'pareja' : 'parejas'}</span>
                      )}
                      {cyclePairCount > 0 && (
                        <span className="block">Director + Psicólogo: {cyclePairCount} {cyclePairCount === 1 ? 'pareja' : 'parejas'}</span>
                      )}
                    </span>
                  </span>
                  <span className="flex flex-shrink-0 items-center text-gray-500">
                    <FiArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default AvailableSlotsPanel;
