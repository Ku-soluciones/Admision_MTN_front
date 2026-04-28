import { useState, useEffect, useCallback } from 'react';
import { FilterCondition } from '../components/ui/AdvancedFilters';
import { SavedFilter } from '../components/ui/SavedFilters';

interface UseSavedFiltersOptions {
  storageKey?: string;
  onFiltersLoad?: (filters: FilterCondition[]) => void;
  onFiltersSave?: (savedFilter: SavedFilter) => void;
}

interface UseSavedFiltersReturn {
  savedFilters: SavedFilter[];
  saveFilter: (name: string, description: string, filters: FilterCondition[], category?: string) => SavedFilter;
  loadFilter: (filterId: string) => FilterCondition[] | null;
  deleteFilter: (filterId: string) => void;
  toggleFavorite: (filterId: string) => void;
  updateFilter: (filterId: string, updates: Partial<SavedFilter>) => void;
  getFiltersByCategory: () => Record<string, SavedFilter[]>;
  getFavoriteFilters: () => SavedFilter[];
  getMostUsedFilters: (limit?: number) => SavedFilter[];
  exportFilters: () => string;
  importFilters: (jsonData: string) => void;
  clearAllFilters: () => void;
}

export const useSavedFilters = ({
  storageKey = 'admision_saved_filters',
  onFiltersLoad,
  onFiltersSave
}: UseSavedFiltersOptions = {}): UseSavedFiltersReturn => {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  // Generar ID único
  const generateId = () => `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Cargar filtros desde localStorage
  const loadFiltersFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const filters = JSON.parse(stored);
        setSavedFilters(Array.isArray(filters) ? filters : []);
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
      setSavedFilters([]);
    }
  }, [storageKey]);

  // Guardar filtros en localStorage
  const saveFiltersToStorage = useCallback((filters: SavedFilter[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving filters to localStorage:', error);
    }
  }, [storageKey]);

  // Inicializar filtros al cargar
  useEffect(() => {
    loadFiltersFromStorage();
  }, [loadFiltersFromStorage]);

  // Guardar filtro
  const saveFilter = useCallback((
    name: string, 
    description: string, 
    filters: FilterCondition[], 
    category?: string
  ): SavedFilter => {
    const newFilter: SavedFilter = {
      id: generateId(),
      name,
      description,
      filters: [...filters],
      isDefault: false,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      useCount: 0,
      category: category || 'Personalizado',
      tags: []
    };

    const updatedFilters = [...savedFilters, newFilter];
    setSavedFilters(updatedFilters);
    saveFiltersToStorage(updatedFilters);
    onFiltersSave?.(newFilter);

    return newFilter;
  }, [savedFilters, saveFiltersToStorage, onFiltersSave]);

  // Cargar filtro
  const loadFilter = useCallback((filterId: string): FilterCondition[] | null => {
    const filter = savedFilters.find(f => f.id === filterId);
    if (!filter) return null;

    // Incrementar contador de uso y actualizar última fecha de uso
    const updatedFilters = savedFilters.map(f => 
      f.id === filterId 
        ? { ...f, useCount: f.useCount + 1, lastUsed: new Date().toISOString() }
        : f
    );
    setSavedFilters(updatedFilters);
    saveFiltersToStorage(updatedFilters);
    
    onFiltersLoad?.(filter.filters);
    return filter.filters;
  }, [savedFilters, saveFiltersToStorage, onFiltersLoad]);

  // Eliminar filtro
  const deleteFilter = useCallback((filterId: string) => {
    const updatedFilters = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(updatedFilters);
    saveFiltersToStorage(updatedFilters);
  }, [savedFilters, saveFiltersToStorage]);

  // Toggle favorito
  const toggleFavorite = useCallback((filterId: string) => {
    const updatedFilters = savedFilters.map(f => 
      f.id === filterId ? { ...f, isFavorite: !f.isFavorite } : f
    );
    setSavedFilters(updatedFilters);
    saveFiltersToStorage(updatedFilters);
  }, [savedFilters, saveFiltersToStorage]);

  // Actualizar filtro
  const updateFilter = useCallback((filterId: string, updates: Partial<SavedFilter>) => {
    const updatedFilters = savedFilters.map(f => 
      f.id === filterId ? { ...f, ...updates } : f
    );
    setSavedFilters(updatedFilters);
    saveFiltersToStorage(updatedFilters);
  }, [savedFilters, saveFiltersToStorage]);

  // Obtener filtros por categoría
  const getFiltersByCategory = useCallback((): Record<string, SavedFilter[]> => {
    return savedFilters.reduce((groups, filter) => {
      const category = filter.category || 'Sin categoría';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(filter);
      return groups;
    }, {} as Record<string, SavedFilter[]>);
  }, [savedFilters]);

  // Obtener filtros favoritos
  const getFavoriteFilters = useCallback((): SavedFilter[] => {
    return savedFilters.filter(f => f.isFavorite);
  }, [savedFilters]);

  // Obtener filtros más usados
  const getMostUsedFilters = useCallback((limit = 5): SavedFilter[] => {
    return [...savedFilters]
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, limit);
  }, [savedFilters]);

  // Exportar filtros a JSON
  const exportFilters = useCallback((): string => {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      filters: savedFilters.map(filter => ({
        ...filter,
        // Remover metadatos sensibles si es necesario
        lastUsed: undefined
      }))
    };
    return JSON.stringify(exportData, null, 2);
  }, [savedFilters]);

  // Importar filtros desde JSON
  const importFilters = useCallback((jsonData: string) => {
    try {
      const importData = JSON.parse(jsonData);
      
      if (importData.filters && Array.isArray(importData.filters)) {
        // Validar estructura básica de cada filtro
        const validFilters = importData.filters.filter((filter: any) => 
          filter.id && filter.name && filter.filters && Array.isArray(filter.filters)
        );

        // Generar nuevos IDs para evitar conflictos
        const importedFilters: SavedFilter[] = validFilters.map((filter: any) => ({
          ...filter,
          id: generateId(),
          isDefault: false,
          useCount: 0,
          lastUsed: undefined,
          createdAt: new Date().toISOString()
        }));

        const updatedFilters = [...savedFilters, ...importedFilters];
        setSavedFilters(updatedFilters);
        saveFiltersToStorage(updatedFilters);
      }
    } catch (error) {
      console.error('Error importing filters:', error);
      throw new Error('Formato de archivo inválido');
    }
  }, [savedFilters, saveFiltersToStorage]);

  // Limpiar todos los filtros
  const clearAllFilters = useCallback(() => {
    setSavedFilters([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    savedFilters,
    saveFilter,
    loadFilter,
    deleteFilter,
    toggleFavorite,
    updateFilter,
    getFiltersByCategory,
    getFavoriteFilters,
    getMostUsedFilters,
    exportFilters,
    importFilters,
    clearAllFilters
  };
};

export default useSavedFilters;