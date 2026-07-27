import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Button from './Button';
import Modal from './Modal';
import DateRangePicker from './DateRangePicker';
import MultiSelect from './MultiSelect';
import SavedFilters from './SavedFilters';
import { 
  FiFilter, 
  FiX, 
  FiSave, 
  FiSettings, 
  FiChevronDown,
  FiPlus,
  FiTrash2,
  FiCalendar,
  FiCheck,
  FiRefreshCw
} from 'react-icons/fi';

export type FilterOperator = 
  | 'equals' 
  | 'not_equals'
  | 'contains' 
  | 'not_contains'
  | 'starts_with' 
  | 'ends_with'
  | 'greater_than' 
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'between'
  | 'in'
  | 'not_in'
  | 'is_null'
  | 'is_not_null'
  | 'date_equals'
  | 'date_before'
  | 'date_after'
  | 'date_between';

export type FilterType = 
  | 'text' 
  | 'number' 
  | 'select' 
  | 'multiselect'
  | 'boolean' 
  | 'date' 
  | 'daterange'
  | 'custom';

export interface FilterField {
  key: string;
  label: string;
  type: FilterType;
  operators?: FilterOperator[];
  options?: Array<{ label: string; value: any; color?: string; icon?: React.ReactNode }>;
  placeholder?: string;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
  };
  component?: React.ComponentType<any>;
  props?: Record<string, any>;
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  logic?: 'AND' | 'OR';
}

export interface FilterGroup {
  id: string;
  name: string;
  conditions: FilterCondition[];
  logic: 'AND' | 'OR';
  created?: string;
  isDefault?: boolean;
}

export interface AdvancedFiltersProps {
  fields: FilterField[];
  filters: FilterCondition[];
  groups?: FilterGroup[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  onGroupsChange?: (groups: FilterGroup[]) => void;
  onChange?: (filters: FilterCondition[]) => void;
  onClear?: () => void;
  className?: string;
  showGrouping?: boolean;
  showPresets?: boolean;
  allowSave?: boolean;
  maxConditions?: number;
  title?: string;
  loading?: boolean;
}

const DEFAULT_OPERATORS: Record<FilterType, FilterOperator[]> = {
  text: ['contains', 'not_contains', 'equals', 'not_equals', 'starts_with', 'ends_with'],
  number: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between'],
  select: ['equals', 'not_equals', 'in', 'not_in'],
  multiselect: ['in', 'not_in'],
  boolean: ['equals'],
  date: ['date_equals', 'date_before', 'date_after', 'date_between'],
  daterange: ['date_between'],
  custom: ['equals']
};

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: 'Igual a',
  not_equals: 'No igual a',
  contains: 'Contiene',
  not_contains: 'No contiene',
  starts_with: 'Empieza con',
  ends_with: 'Termina con',
  greater_than: 'Mayor que',
  less_than: 'Menor que',
  greater_equal: 'Mayor o igual',
  less_equal: 'Menor o igual',
  between: 'Entre',
  in: 'En',
  not_in: 'No en',
  is_null: 'Vacío',
  is_not_null: 'No vacío',
  date_equals: 'En fecha',
  date_before: 'Antes de',
  date_after: 'Después de',
  date_between: 'Entre fechas'
};

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  fields,
  filters,
  groups = [],
  onFiltersChange,
  onGroupsChange,
  onChange,
  onClear,
  className = '',
  showGrouping = true,
  showPresets = true,
  allowSave = true,
  maxConditions = 10,
  title = 'Filtros Avanzados',
  loading = false
}) => {
  const [showModal, setShowModal] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterCondition[]>(filters);
  const [selectedField, setSelectedField] = useState('');
  const [saveGroupName, setSaveGroupName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // Sincronizar con props externas
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Generar ID único para condiciones
  const generateId = () => `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Obtener operadores disponibles para un campo
  const getAvailableOperators = useCallback((fieldKey: string): FilterOperator[] => {
    const field = fields.find(f => f.key === fieldKey);
    if (!field) return [];
    
    return field.operators || DEFAULT_OPERATORS[field.type] || [];
  }, [fields]);

  // Agregar nueva condición
  const addCondition = useCallback(() => {
    if (localFilters.length >= maxConditions) return;

    const firstField = fields[0];
    if (!firstField) return;

    const operators = getAvailableOperators(firstField.key);
    const newCondition: FilterCondition = {
      id: generateId(),
      field: firstField.key,
      operator: operators[0] || 'equals',
      value: '',
      logic: localFilters.length === 0 ? 'AND' : 'AND'
    };

    setLocalFilters(prev => [...prev, newCondition]);
  }, [localFilters.length, maxConditions, fields, getAvailableOperators]);

  // Actualizar condición
  const updateCondition = useCallback((id: string, updates: Partial<FilterCondition>) => {
    setLocalFilters(prev => prev.map(filter => {
      if (filter.id === id) {
        const updatedFilter = { ...filter, ...updates };
        
        // Si cambió el campo, resetear operador y valor
        if (updates.field && updates.field !== filter.field) {
          const operators = getAvailableOperators(updates.field);
          updatedFilter.operator = operators[0] || 'equals';
          updatedFilter.value = '';
        }
        
        return updatedFilter;
      }
      return filter;
    }));
  }, [getAvailableOperators]);

  // Eliminar condición
  const removeCondition = useCallback((id: string) => {
    setLocalFilters(prev => prev.filter(filter => filter.id !== id));
  }, []);

  // Limpiar todos los filtros
  const clearAllFilters = useCallback(() => {
    setLocalFilters([]);
    setActiveGroup(null);
  }, []);

  // Aplicar filtros
  const applyFilters = useCallback(() => {
    const validFilters = localFilters.filter(filter => {
      // Validar que tengan valor (excepto para operadores especiales)
      if (['is_null', 'is_not_null'].includes(filter.operator)) {
        return true;
      }
      
      if (Array.isArray(filter.value)) {
        return filter.value.length > 0;
      }
      
      return filter.value !== '' && filter.value !== null && filter.value !== undefined;
    });

    onFiltersChange(validFilters);
    setShowModal(false);
  }, [localFilters, onFiltersChange]);

  // Guardar grupo de filtros
  const saveGroup = useCallback(() => {
    if (!saveGroupName.trim() || !onGroupsChange) return;

    const newGroup: FilterGroup = {
      id: generateId(),
      name: saveGroupName.trim(),
      conditions: [...localFilters],
      logic: 'AND',
      created: new Date().toISOString()
    };

    onGroupsChange([...groups, newGroup]);
    setSaveGroupName('');
    setShowSaveDialog(false);
  }, [saveGroupName, localFilters, groups, onGroupsChange]);

  // Cargar grupo de filtros
  const loadGroup = useCallback((group: FilterGroup) => {
    setLocalFilters([...group.conditions]);
    setActiveGroup(group.id);
  }, []);

  // Eliminar grupo
  const deleteGroup = useCallback((groupId: string) => {
    if (!onGroupsChange) return;
    
    const updatedGroups = groups.filter(g => g.id !== groupId);
    onGroupsChange(updatedGroups);
    
    if (activeGroup === groupId) {
      setActiveGroup(null);
    }
  }, [groups, activeGroup, onGroupsChange]);

  // Renderizar campo de valor
  const renderValueField = useCallback((condition: FilterCondition) => {
    const field = fields.find(f => f.key === condition.field);
    if (!field) return null;

    const commonProps = {
      value: condition.value,
      onChange: (value: any) => updateCondition(condition.id, { value }),
      className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent",
      disabled: loading
    };

    // Operadores que no necesitan valor
    if (['is_null', 'is_not_null'].includes(condition.operator)) {
      return <div className="text-gray-500 italic">Sin valor requerido</div>;
    }

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            placeholder={field.placeholder || `Ingrese ${field.label.toLowerCase()}`}
            {...commonProps}
          />
        );

      case 'number':
        if (condition.operator === 'between') {
          return (
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Desde"
                value={condition.value?.[0] || ''}
                onChange={(e) => updateCondition(condition.id, { 
                  value: [e.target.value, condition.value?.[1] || ''] 
                })}
                className={commonProps.className}
                disabled={loading}
              />
              <input
                type="number"
                placeholder="Hasta"
                value={condition.value?.[1] || ''}
                onChange={(e) => updateCondition(condition.id, { 
                  value: [condition.value?.[0] || '', e.target.value] 
                })}
                className={commonProps.className}
                disabled={loading}
              />
            </div>
          );
        }
        return <input type="number" {...commonProps} />;

      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Seleccionar...</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <MultiSelect
            options={field.options || []}
            value={condition.value || []}
            onChange={(value) => updateCondition(condition.id, { value })}
            placeholder={`Seleccionar ${field.label.toLowerCase()}`}
            disabled={loading}
          />
        );

      case 'boolean':
        return (
          <select {...commonProps}>
            <option value="">Seleccionar...</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        );

      case 'date':
        if (condition.operator === 'date_between') {
          return (
            <DateRangePicker
              startDate={condition.value?.[0]}
              endDate={condition.value?.[1]}
              onChange={(start, end) => updateCondition(condition.id, { value: [start, end] })}
              disabled={loading}
            />
          );
        }
        return (
          <input
            type="date"
            {...commonProps}
          />
        );

      case 'daterange':
        return (
          <DateRangePicker
            startDate={condition.value?.[0]}
            endDate={condition.value?.[1]}
            onChange={(start, end) => updateCondition(condition.id, { value: [start, end] })}
            disabled={loading}
          />
        );

      case 'custom':
        if (field.component) {
          const Component = field.component;
          return (
            <Component
              {...field.props}
              value={condition.value}
              onChange={(value: any) => updateCondition(condition.id, { value })}
              disabled={loading}
            />
          );
        }
        return <input type="text" {...commonProps} />;

      default:
        return <input type="text" {...commonProps} />;
    }
  }, [fields, updateCondition, loading]);

  // Contar filtros activos
  const activeFiltersCount = useMemo(() => {
    return filters.filter(f => {
      if (['is_null', 'is_not_null'].includes(f.operator)) return true;
      if (Array.isArray(f.value)) return f.value.length > 0;
      return f.value !== '' && f.value !== null && f.value !== undefined;
    }).length;
  }, [filters]);

  return (
    <>
      {/* Trigger Button */}
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          variant="outline"
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-2 ${activeFiltersCount > 0 ? 'border-blue-500 bg-blue-50 text-blue-700' : ''}`}
          disabled={loading}
        >
          <FiFilter size={16} />
          {title}
          {activeFiltersCount > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange([])}
            className="text-red-600 hover:text-red-700 p-1"
            title="Limpiar todos los filtros"
            disabled={loading}
          >
            <FiX size={16} />
          </Button>
        )}
      </div>

      {/* Modal de Filtros */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={title}
        size="xl"
      >
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Saved Filters Component */}
          {showPresets && (
            <SavedFilters
              currentFilters={localFilters}
              onLoadFilters={(filters) => {
                setLocalFilters(filters);
                onChange?.(filters);
              }}
              className="border-b border-gray-200 pb-4"
            />
          )}

          {/* Condiciones de filtro */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">Condiciones</h4>
              <div className="flex gap-2">
                {localFilters.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-red-600 hover:text-red-700"
                    disabled={loading}
                  >
                    <FiX size={14} />
                    Limpiar Todo
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCondition}
                  disabled={localFilters.length >= maxConditions || loading}
                  className="flex items-center gap-1"
                >
                  <FiPlus size={14} />
                  Agregar Filtro
                </Button>
              </div>
            </div>

            {localFilters.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FiFilter size={48} className="mx-auto mb-2 opacity-50" />
                <p>No hay filtros configurados</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCondition}
                  className="mt-2"
                  disabled={loading}
                >
                  Agregar primer filtro
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {localFilters.map((condition, index) => (
                  <div key={condition.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    {/* Lógica (AND/OR) */}
                    {index > 0 && showGrouping && (
                      <select
                        value={condition.logic || 'AND'}
                        onChange={(e) => updateCondition(condition.id, { logic: e.target.value as 'AND' | 'OR' })}
                        className="px-2 py-1 border border-gray-300 rounded text-xs font-medium"
                        disabled={loading}
                      >
                        <option value="AND">Y</option>
                        <option value="OR">O</option>
                      </select>
                    )}

                    {/* Campo */}
                    <select
                      value={condition.field}
                      onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      {fields.map(field => (
                        <option key={field.key} value={field.key}>
                          {field.label}
                        </option>
                      ))}
                    </select>

                    {/* Operador */}
                    <select
                      value={condition.operator}
                      onChange={(e) => updateCondition(condition.id, { operator: e.target.value as FilterOperator })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      {getAvailableOperators(condition.field).map(op => (
                        <option key={op} value={op}>
                          {OPERATOR_LABELS[op]}
                        </option>
                      ))}
                    </select>

                    {/* Valor */}
                    <div className="flex-1 min-w-0">
                      {renderValueField(condition)}
                    </div>

                    {/* Eliminar */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCondition(condition.id)}
                      className="text-red-600 hover:text-red-700 p-2"
                      disabled={loading}
                    >
                      <FiTrash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-2">
              {allowSave && onGroupsChange && localFilters.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setShowSaveDialog(true)}
                  className="flex items-center gap-2"
                  disabled={loading}
                >
                  <FiSave size={14} />
                  Guardar Filtros
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={applyFilters}
                className="flex items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <FiRefreshCw size={14} className="animate-spin" />
                ) : (
                  <FiCheck size={14} />
                )}
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal para guardar grupo */}
      <Modal
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        title="Guardar Filtros"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del grupo de filtros
            </label>
            <input
              type="text"
              value={saveGroupName}
              onChange={(e) => setSaveGroupName(e.target.value)}
              placeholder="Ej: Postulaciones pendientes"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={saveGroup}
              disabled={!saveGroupName.trim() || loading}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AdvancedFilters;