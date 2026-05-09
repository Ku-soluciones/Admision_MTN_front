import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiX, FiCheck, FiSearch } from 'react-icons/fi';
import Input from './Input';
import Button from './Button';

export interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxHeight?: number;
  searchable?: boolean;
  selectAll?: boolean;
  maxSelected?: number;
  renderOption?: (option: MultiSelectOption, isSelected: boolean) => React.ReactNode;
  renderTag?: (option: MultiSelectOption, onRemove: () => void) => React.ReactNode;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value = [],
  onChange,
  placeholder = 'Seleccionar opciones...',
  disabled = false,
  className = '',
  maxHeight = 200,
  searchable = true,
  selectAll = true,
  maxSelected,
  renderOption,
  renderTag
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filtrar opciones basado en la búsqueda
  const filteredOptions = searchable && searchTerm
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (option.description && option.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : options;

  // Obtener opciones seleccionadas
  const selectedOptions = options.filter(option => value.includes(option.value));

  // Manejar click fuera del dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleOption = (optionValue: string) => {
    if (disabled) return;

    const isSelected = value.includes(optionValue);
    
    if (isSelected) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      if (maxSelected && value.length >= maxSelected) {
        return; // No permitir más selecciones
      }
      onChange([...value, optionValue]);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    
    const availableOptions = filteredOptions.filter(option => !option.disabled);
    const allSelected = availableOptions.every(option => value.includes(option.value));
    
    if (allSelected) {
      // Deseleccionar todas las opciones visibles
      const visibleValues = availableOptions.map(option => option.value);
      onChange(value.filter(v => !visibleValues.includes(v)));
    } else {
      // Seleccionar todas las opciones visibles
      const newValues = [...value];
      availableOptions.forEach(option => {
        if (!newValues.includes(option.value)) {
          if (!maxSelected || newValues.length < maxSelected) {
            newValues.push(option.value);
          }
        }
      });
      onChange(newValues);
    }
  };

  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const removeTag = (optionValue: string) => {
    if (disabled) return;
    onChange(value.filter(v => v !== optionValue));
  };

  const defaultRenderOption = (option: MultiSelectOption, isSelected: boolean) => (
    <div className={`flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer ${
      option.disabled ? 'opacity-50 cursor-not-allowed' : ''
    } ${isSelected ? 'bg-blue-50' : ''}`}>
      <div className="flex-1">
        <div className="text-sm text-gray-900">{option.label}</div>
        {option.description && (
          <div className="text-xs text-gray-500">{option.description}</div>
        )}
      </div>
      {isSelected && (
        <FiCheck className="text-blue-600" size={16} />
      )}
    </div>
  );

  const defaultRenderTag = (option: MultiSelectOption, onRemove: () => void) => (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
      {option.label}
      <button
        type="button"
        onClick={onRemove}
        className="text-blue-600 hover:text-blue-800"
        disabled={disabled}
      >
        <FiX size={12} />
      </button>
    </span>
  );

  const availableOptions = filteredOptions.filter(option => !option.disabled);
  const allVisibleSelected = availableOptions.length > 0 && 
    availableOptions.every(option => value.includes(option.value));

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger */}
      <div
        className={`min-h-[42px] w-full px-3 py-2 border border-gray-300 rounded-md cursor-pointer hover:border-gray-400 transition-colors ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
        } ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-h-[20px]">
            {selectedOptions.length === 0 ? (
              <span className="text-gray-500 text-sm">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {selectedOptions.map(option => (
                  <div key={option.value} onClick={e => e.stopPropagation()}>
                    {renderTag ? renderTag(option, () => removeTag(option.value)) : 
                      defaultRenderTag(option, () => removeTag(option.value))
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 ml-2">
            {selectedOptions.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
                className="text-gray-400 hover:text-gray-600"
                disabled={disabled}
              >
                <FiX size={16} />
              </button>
            )}
            <FiChevronDown
              className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              size={16}
            />
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          {/* Header con búsqueda y controles */}
          <div className="p-2 border-b border-gray-200">
            {searchable && (
              <div className="mb-2">
                <Input
                  placeholder="Buscar opciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-sm"
                  icon={<FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />}
                />
              </div>
            )}
            
            {selectAll && filteredOptions.length > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">
                  {selectedOptions.length} de {options.length} seleccionados
                  {maxSelected && ` (máx. ${maxSelected})`}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={disabled}
                    className="text-xs px-2 py-1"
                  >
                    {allVisibleSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                  </Button>
                  {selectedOptions.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAll}
                      disabled={disabled}
                      className="text-xs px-2 py-1 text-red-600 hover:text-red-700"
                    >
                      Limpiar
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Options */}
          <div 
            className="max-h-[200px] overflow-y-auto"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchTerm ? 'No se encontraron opciones' : 'No hay opciones disponibles'}
              </div>
            ) : (
              filteredOptions.map(option => {
                const isSelected = value.includes(option.value);
                const canSelect = !maxSelected || value.length < maxSelected || isSelected;
                
                return (
                  <div
                    key={option.value}
                    onClick={() => {
                      if (!option.disabled && canSelect) {
                        handleToggleOption(option.value);
                      }
                    }}
                    className={option.disabled || !canSelect ? 'cursor-not-allowed' : 'cursor-pointer'}
                  >
                    {renderOption ? renderOption(option, isSelected) : 
                      defaultRenderOption(option, isSelected)
                    }
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {maxSelected && value.length >= maxSelected && (
            <div className="p-2 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-amber-600 text-center">
                Máximo de {maxSelected} opciones seleccionadas
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;