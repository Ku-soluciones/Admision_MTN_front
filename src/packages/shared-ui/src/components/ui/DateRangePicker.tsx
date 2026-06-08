import React, { useState, useEffect } from 'react';
import { FiCalendar, FiX } from 'react-icons/fi';
import Button from './Button';
import Input from './Input';

export interface DateRange {
  start: string | null;
  end: string | null;
}

export interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: {
    start?: string;
    end?: string;
  };
  disabled?: boolean;
  className?: string;
  allowSingleDate?: boolean;
  maxDate?: string;
  minDate?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value = { start: null, end: null },
  onChange,
  placeholder = { start: 'Fecha inicio', end: 'Fecha fin' },
  disabled = false,
  className = '',
  allowSingleDate = true,
  maxDate,
  minDate
}) => {
  const [localRange, setLocalRange] = useState<DateRange>(value);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setLocalRange(value);
  }, [value]);

  const handleStartDateChange = (date: string) => {
    const newRange = { ...localRange, start: date || null };
    
    // Si la fecha de inicio es posterior a la fecha de fin, limpiar la fecha de fin
    if (newRange.start && newRange.end && newRange.start > newRange.end) {
      newRange.end = null;
    }
    
    setLocalRange(newRange);
    onChange(newRange);
  };

  const handleEndDateChange = (date: string) => {
    const newRange = { ...localRange, end: date || null };
    
    // Si la fecha de fin es anterior a la fecha de inicio, ajustar la fecha de inicio
    if (newRange.start && newRange.end && newRange.start > newRange.end) {
      newRange.start = newRange.end;
    }
    
    setLocalRange(newRange);
    onChange(newRange);
  };

  const clearRange = () => {
    const emptyRange = { start: null, end: null };
    setLocalRange(emptyRange);
    onChange(emptyRange);
  };

  const hasValue = localRange.start || localRange.end;

  // Presets rápidos
  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    const newRange = {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
    
    setLocalRange(newRange);
    onChange(newRange);
    setIsOpen(false);
  };

  const presets = [
    { label: 'Últimos 7 días', days: 7 },
    { label: 'Últimos 30 días', days: 30 },
    { label: 'Últimos 90 días', days: 90 },
    { label: 'Este año', days: 365 }
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <div
        className={`flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md cursor-pointer hover:border-gray-400 transition-colors ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
        } ${hasValue ? 'border-blue-500' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <FiCalendar className="text-gray-400" size={16} />
        <span className={`flex-1 text-sm ${hasValue ? 'text-gray-900' : 'text-gray-500'}`}>
          {localRange.start && localRange.end
            ? `${localRange.start} - ${localRange.end}`
            : localRange.start
            ? `Desde ${localRange.start}`
            : localRange.end
            ? `Hasta ${localRange.end}`
            : 'Seleccionar rango de fechas'
          }
        </span>
        {hasValue && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearRange();
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={disabled}
          >
            <FiX size={16} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Content */}
          <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50">
            <div className="p-4 space-y-4">
              {/* Date Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Fecha de inicio
                  </label>
                  <Input
                    type="date"
                    value={localRange.start || ''}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    max={localRange.end || maxDate}
                    min={minDate}
                    disabled={disabled}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Fecha de fin
                  </label>
                  <Input
                    type="date"
                    value={localRange.end || ''}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    max={maxDate}
                    min={localRange.start || minDate}
                    disabled={disabled}
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="border-t border-gray-200 pt-3">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Rangos predefinidos
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="outline"
                      size="sm"
                      onClick={() => setPreset(preset.days)}
                      className="text-xs"
                      disabled={disabled}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between border-t border-gray-200 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearRange}
                  disabled={disabled || !hasValue}
                >
                  Limpiar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DateRangePicker;