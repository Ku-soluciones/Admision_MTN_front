import React, { useState, useEffect } from 'react';
import { FiSave, FiFolder, FiTrash2, FiEdit3, FiStar, FiPlus, FiX, FiCheck } from 'react-icons/fi';
import Button from './Button';
import Input from './Input';
import Modal from './Modal';
import Badge from './Badge';
import { FilterCondition } from './AdvancedFilters';

export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  filters: FilterCondition[];
  isDefault?: boolean;
  isFavorite?: boolean;
  createdAt: string;
  lastUsed?: string;
  useCount: number;
  category?: string;
  tags?: string[];
}

export interface SavedFiltersProps {
  currentFilters: FilterCondition[];
  onLoadFilters: (filters: FilterCondition[]) => void;
  onSaveFilters?: (savedFilter: SavedFilter) => void;
  className?: string;
  storageKey?: string;
}

const SavedFilters: React.FC<SavedFiltersProps> = ({
  currentFilters,
  onLoadFilters,
  onSaveFilters,
  className = '',
  storageKey = 'admision_saved_filters'
}) => {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null);
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Presets predefinidos para casos comunes
  const defaultPresets: SavedFilter[] = [
    {
      id: 'preset_pending_applications',
      name: 'Postulaciones Pendientes',
      description: 'Todas las postulaciones en estado pendiente',
      filters: [
        {
          id: '1',
          field: 'status',
          operator: 'equals',
          value: 'PENDING',
          logic: 'AND'
        }
      ],
      isDefault: true,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      useCount: 0,
      category: 'Estado',
      tags: ['pendiente', 'estado']
    },
    {
      id: 'preset_under_review',
      name: 'En Revisión',
      description: 'Postulaciones que están siendo revisadas',
      filters: [
        {
          id: '1',
          field: 'status',
          operator: 'in',
          value: ['UNDER_REVIEW', 'DOCUMENTS_REQUESTED'],
          logic: 'AND'
        }
      ],
      isDefault: true,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      useCount: 0,
      category: 'Estado',
      tags: ['revisión', 'proceso']
    },
    {
      id: 'preset_interviews_this_month',
      name: 'Entrevistas Este Mes',
      description: 'Postulaciones con entrevista programada este mes',
      filters: [
        {
          id: '1',
          field: 'status',
          operator: 'equals',
          value: 'INTERVIEW_SCHEDULED',
          logic: 'AND'
        },
        {
          id: '2',
          field: 'interviewDate',
          operator: 'date_between',
          value: {
            start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
          },
          logic: 'AND'
        }
      ],
      isDefault: true,
      isFavorite: true,
      createdAt: new Date().toISOString(),
      useCount: 0,
      category: 'Cronología',
      tags: ['entrevista', 'mes actual']
    },
    {
      id: 'preset_monte_tabor_high_priority',
      name: 'Monte Tabor - Alta Prioridad',
      description: 'Postulaciones urgentes para Monte Tabor',
      filters: [
        {
          id: '1',
          field: 'schoolApplied',
          operator: 'equals',
          value: 'MONTE_TABOR',
          logic: 'AND'
        },
        {
          id: '2',
          field: 'priority',
          operator: 'in',
          value: ['HIGH', 'URGENT'],
          logic: 'AND'
        }
      ],
      isDefault: true,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      useCount: 0,
      category: 'Prioridad',
      tags: ['monte tabor', 'urgente', 'alta prioridad']
    },
    {
      id: 'preset_incomplete_documents',
      name: 'Documentos Incompletos',
      description: 'Postulaciones con documentación pendiente',
      filters: [
        {
          id: '1',
          field: 'documentsComplete',
          operator: 'equals',
          value: false,
          logic: 'AND'
        },
        {
          id: '2',
          field: 'status',
          operator: 'not_in',
          value: ['REJECTED', 'APPROVED'],
          logic: 'AND'
        }
      ],
      isDefault: true,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      useCount: 0,
      category: 'Documentación',
      tags: ['documentos', 'incompleto']
    },
    {
      id: 'preset_special_needs',
      name: 'Necesidades Especiales',
      description: 'Estudiantes con necesidades educativas especiales',
      filters: [
        {
          id: '1',
          field: 'hasSpecialNeeds',
          operator: 'equals',
          value: true,
          logic: 'AND'
        }
      ],
      isDefault: true,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      useCount: 0,
      category: 'Estudiantes',
      tags: ['necesidades especiales', 'NEE']
    },
    {
      id: 'preset_recent_applications',
      name: 'Postulaciones Recientes',
      description: 'Postulaciones de los últimos 7 días',
      filters: [
        {
          id: '1',
          field: 'submissionDate',
          operator: 'date_after',
          value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          logic: 'AND'
        }
      ],
      isDefault: true,
      isFavorite: true,
      createdAt: new Date().toISOString(),
      useCount: 0,
      category: 'Cronología',
      tags: ['reciente', '7 días']
    }
  ];

  // Cargar filtros guardados desde localStorage
  useEffect(() => {
    const loadSavedFilters = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsedFilters = JSON.parse(saved);
          // Combinar con presets por defecto
          const allFilters = [...defaultPresets, ...parsedFilters.filter((f: SavedFilter) => !f.isDefault)];
          setSavedFilters(allFilters);
        } else {
          setSavedFilters(defaultPresets);
        }
      } catch (error) {
        console.error('Error loading saved filters:', error);
        setSavedFilters(defaultPresets);
      }
    };

    loadSavedFilters();
  }, [storageKey]);

  // Guardar filtros en localStorage
  const saveFiltersToStorage = (filters: SavedFilter[]) => {
    try {
      // Solo guardar filtros personalizados (no los presets por defecto)
      const customFilters = filters.filter(f => !f.isDefault);
      localStorage.setItem(storageKey, JSON.stringify(customFilters));
    } catch (error) {
      console.error('Error saving filters to localStorage:', error);
    }
  };

  // Generar ID único
  const generateId = () => `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Guardar filtro actual
  const handleSaveCurrentFilters = () => {
    if (!filterName.trim()) return;

    const newFilter: SavedFilter = {
      id: editingFilter?.id || generateId(),
      name: filterName,
      description: filterDescription,
      filters: [...currentFilters],
      isDefault: false,
      isFavorite: editingFilter?.isFavorite || false,
      createdAt: editingFilter?.createdAt || new Date().toISOString(),
      useCount: editingFilter?.useCount || 0,
      category: filterCategory || 'Personalizado',
      tags: []
    };

    const updatedFilters = editingFilter
      ? savedFilters.map(f => f.id === editingFilter.id ? newFilter : f)
      : [...savedFilters, newFilter];

    setSavedFilters(updatedFilters);
    saveFiltersToStorage(updatedFilters);
    onSaveFilters?.(newFilter);

    // Reset form
    setFilterName('');
    setFilterDescription('');
    setFilterCategory('');
    setEditingFilter(null);
    setShowSaveModal(false);
  };

  // Cargar filtro
  const handleLoadFilter = (filter: SavedFilter) => {
    onLoadFilters(filter.filters);
    
    // Incrementar contador de uso
    const updatedFilters = savedFilters.map(f => 
      f.id === filter.id 
        ? { ...f, useCount: f.useCount + 1, lastUsed: new Date().toISOString() }
        : f
    );
    setSavedFilters(updatedFilters);
    saveFiltersToStorage(updatedFilters);
  };

  // Eliminar filtro
  const handleDeleteFilter = (filterId: string) => {
    const updatedFilters = savedFilters.filter(f => f.id !== filterId && !f.isDefault);
    setSavedFilters([...defaultPresets, ...updatedFilters]);
    saveFiltersToStorage([...defaultPresets, ...updatedFilters]);
  };

  // Toggle favorito
  const handleToggleFavorite = (filterId: string) => {
    const updatedFilters = savedFilters.map(f => 
      f.id === filterId ? { ...f, isFavorite: !f.isFavorite } : f
    );
    setSavedFilters(updatedFilters);
    saveFiltersToStorage(updatedFilters);
  };

  // Editar filtro
  const handleEditFilter = (filter: SavedFilter) => {
    setEditingFilter(filter);
    setFilterName(filter.name);
    setFilterDescription(filter.description || '');
    setFilterCategory(filter.category || '');
    setShowSaveModal(true);
  };

  // Agrupar filtros por categoría
  const groupedFilters = savedFilters.reduce((groups, filter) => {
    const category = filter.category || 'Sin categoría';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(filter);
    return groups;
  }, {} as Record<string, SavedFilter[]>);

  // Filtros favoritos
  const favoriteFilters = savedFilters.filter(f => f.isFavorite);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Filtros Guardados</h4>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveModal(true)}
            disabled={currentFilters.length === 0}
            className="flex items-center gap-1"
          >
            <FiSave size={14} />
            Guardar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowManageModal(true)}
            className="flex items-center gap-1"
          >
            <FiFolder size={14} />
            Gestionar
          </Button>
        </div>
      </div>

      {/* Favorite Filters */}
      {favoriteFilters.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
            <FiStar size={12} />
            Favoritos
          </h5>
          <div className="flex flex-wrap gap-2">
            {favoriteFilters.slice(0, 4).map((filter) => (
              <Button
                key={filter.id}
                variant="outline"
                size="sm"
                onClick={() => handleLoadFilter(filter)}
                className="flex items-center gap-1 text-xs"
              >
                <FiStar size={10} className="text-yellow-500" />
                {filter.name}
                {filter.useCount > 0 && (
                  <Badge variant="gray" size="sm" className="ml-1">
                    {filter.useCount}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Recent/Popular Filters */}
      <div>
        <h5 className="text-xs font-medium text-gray-600 mb-2">Filtros Populares</h5>
        <div className="flex flex-wrap gap-2">
          {savedFilters
            .sort((a, b) => b.useCount - a.useCount)
            .slice(0, 3)
            .map((filter) => (
              <Button
                key={filter.id}
                variant="ghost"
                size="sm"
                onClick={() => handleLoadFilter(filter)}
                className="flex items-center gap-1 text-xs bg-gray-50 hover:bg-gray-100"
              >
                {filter.name}
                <Badge variant="blue" size="sm">
                  {filter.useCount}
                </Badge>
              </Button>
            ))}
        </div>
      </div>

      {/* Save Filter Modal */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => {
          setShowSaveModal(false);
          setEditingFilter(null);
          setFilterName('');
          setFilterDescription('');
          setFilterCategory('');
        }}
        title={editingFilter ? 'Editar Filtro Guardado' : 'Guardar Filtro Actual'}
      >
        <div className="space-y-4">
          <Input
            label="Nombre del filtro"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            placeholder="Ej: Postulaciones urgentes Monte Tabor"
            required
          />
          
          <Input
            label="Descripción (opcional)"
            value={filterDescription}
            onChange={(e) => setFilterDescription(e.target.value)}
            placeholder="Describe para qué sirve este filtro..."
          />
          
          <Input
            label="Categoría (opcional)"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            placeholder="Ej: Estado, Prioridad, Cronología..."
          />

          {/* Preview of current filters */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Vista previa de filtros:</h4>
            <div className="text-sm text-gray-600">
              {currentFilters.length} condición{currentFilters.length !== 1 ? 'es' : ''} de filtro
            </div>
            <div className="mt-2 space-y-1">
              {currentFilters.slice(0, 3).map((filter, index) => (
                <div key={index} className="text-xs text-gray-500">
                  {filter.field} {filter.operator} {typeof filter.value === 'object' ? 'rango' : filter.value}
                </div>
              ))}
              {currentFilters.length > 3 && (
                <div className="text-xs text-gray-400">
                  +{currentFilters.length - 3} filtros más...
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveModal(false);
                setEditingFilter(null);
                setFilterName('');
                setFilterDescription('');
                setFilterCategory('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveCurrentFilters}
              disabled={!filterName.trim()}
              className="flex items-center gap-1"
            >
              <FiCheck size={14} />
              {editingFilter ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manage Filters Modal */}
      <Modal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        title="Gestionar Filtros Guardados"
        size="lg"
      >
        <div className="space-y-6 max-h-96 overflow-y-auto">
          {Object.entries(groupedFilters).map(([category, filters]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                {category}
                <Badge variant="gray" size="sm">
                  {filters.length}
                </Badge>
              </h4>
              <div className="space-y-2">
                {filters.map((filter) => (
                  <div
                    key={filter.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-gray-900">{filter.name}</h5>
                        {filter.isFavorite && (
                          <FiStar size={12} className="text-yellow-500" />
                        )}
                        {filter.isDefault && (
                          <Badge variant="blue" size="sm">Sistema</Badge>
                        )}
                      </div>
                      {filter.description && (
                        <p className="text-sm text-gray-600 mt-1">{filter.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span>{filter.filters.length} filtro{filter.filters.length !== 1 ? 's' : ''}</span>
                        <span>Usado {filter.useCount} veces</span>
                        {filter.lastUsed && (
                          <span>Último uso: {new Date(filter.lastUsed).toLocaleDateString('es-ES')}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLoadFilter(filter)}
                        className="p-1 h-8 w-8"
                        title="Cargar filtro"
                      >
                        <FiFolder size={14} />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFavorite(filter.id)}
                        className="p-1 h-8 w-8"
                        title={filter.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                      >
                        <FiStar size={14} className={filter.isFavorite ? 'text-yellow-500' : 'text-gray-400'} />
                      </Button>
                      
                      {!filter.isDefault && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditFilter(filter)}
                            className="p-1 h-8 w-8 text-blue-600 hover:text-blue-700"
                            title="Editar filtro"
                          >
                            <FiEdit3 size={14} />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFilter(filter.id)}
                            className="p-1 h-8 w-8 text-red-600 hover:text-red-700"
                            title="Eliminar filtro"
                          >
                            <FiTrash2 size={14} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default SavedFilters;