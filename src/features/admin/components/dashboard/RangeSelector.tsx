import React from 'react';
import { FiChevronLeft, FiChevronRight, FiRefreshCw, FiRotateCcw } from 'react-icons/fi';
import { CommandCenterViewMode, VIEW_LABELS } from './dashboardTypes';

interface RangeSelectorProps {
  viewMode: CommandCenterViewMode;
  isLoading: boolean;
  onViewModeChange: (viewMode: CommandCenterViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onRefresh: () => void;
}

const RangeSelector: React.FC<RangeSelectorProps> = ({
  viewMode,
  isLoading,
  onViewModeChange,
  onPrevious,
  onNext,
  onToday,
  onRefresh
}) => {
  const modes = Object.keys(VIEW_LABELS) as CommandCenterViewMode[];

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="inline-flex w-fit rounded-lg border border-gray-200 bg-white p-1">
        {modes.map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => onViewModeChange(mode)}
            aria-pressed={viewMode === mode}
            className={`min-h-11 rounded-md px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100 ${
              viewMode === mode
                ? 'bg-white text-gray-900 shadow-md ring-1 ring-gray-300'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            {VIEW_LABELS[mode]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
          aria-label="Rango anterior"
        >
          <FiChevronLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
          aria-label="Rango siguiente"
        >
          <FiChevronRight aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onToday}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <FiRotateCcw className="h-4 w-4" aria-hidden="true" />
          Hoy
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
          aria-label="Actualizar"
        >
          <FiRefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Actualizar
        </button>
      </div>
    </div>
  );
};

export default RangeSelector;
