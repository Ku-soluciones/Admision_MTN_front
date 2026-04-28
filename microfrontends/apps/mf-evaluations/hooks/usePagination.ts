import { useState, useCallback, useMemo } from 'react';

export interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
  pageSizeOptions?: number[];
  simple?: boolean;
}

export interface UsePaginationResult {
  pagination: PaginationConfig;
  setPagination: React.Dispatch<React.SetStateAction<PaginationConfig>>;
  handlePageChange: (page: number, pageSize?: number) => void;
  handlePageSizeChange: (current: number, size: number) => void;
  resetPagination: () => void;
  paginationInfo: {
    startRecord: number;
    endRecord: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}

export interface UsePaginationOptions {
  initialCurrent?: number;
  initialPageSize?: number;
  initialTotal?: number;
  pageSizeOptions?: number[];
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
  simple?: boolean;
  onPageChange?: (page: number, pageSize: number) => void;
  onPageSizeChange?: (current: number, pageSize: number) => void;
}

export const usePagination = ({
  initialCurrent = 1,
  initialPageSize = 20,
  initialTotal = 0,
  pageSizeOptions = [10, 20, 50, 100],
  showSizeChanger = true,
  showQuickJumper = true,
  showTotal = true,
  simple = false,
  onPageChange,
  onPageSizeChange
}: UsePaginationOptions = {}): UsePaginationResult => {
  
  const [pagination, setPagination] = useState<PaginationConfig>({
    current: initialCurrent,
    pageSize: initialPageSize,
    total: initialTotal,
    showSizeChanger,
    showQuickJumper,
    showTotal,
    pageSizeOptions,
    simple
  });

  // Información derivada de paginación
  const paginationInfo = useMemo(() => {
    const totalPages = Math.ceil(pagination.total / pagination.pageSize);
    const startRecord = Math.min((pagination.current - 1) * pagination.pageSize + 1, pagination.total);
    const endRecord = Math.min(pagination.current * pagination.pageSize, pagination.total);
    
    return {
      startRecord,
      endRecord,
      totalPages,
      hasNextPage: pagination.current < totalPages,
      hasPrevPage: pagination.current > 1,
      isFirstPage: pagination.current === 1,
      isLastPage: pagination.current === totalPages || totalPages === 0
    };
  }, [pagination.current, pagination.pageSize, pagination.total]);

  // Manejar cambio de página
  const handlePageChange = useCallback((page: number, pageSize?: number) => {
    const newPageSize = pageSize || pagination.pageSize;
    const totalPages = Math.ceil(pagination.total / newPageSize);
    
    // Validar que la página esté en rango válido
    const validPage = Math.max(1, Math.min(page, totalPages));
    
    setPagination(prev => ({
      ...prev,
      current: validPage,
      pageSize: newPageSize
    }));
    
    if (onPageChange) {
      onPageChange(validPage, newPageSize);
    }
  }, [pagination.pageSize, pagination.total, onPageChange]);

  // Manejar cambio de tamaño de página
  const handlePageSizeChange = useCallback((current: number, size: number) => {
    // Calcular la nueva página para mantener aproximadamente la misma posición
    const currentStartRecord = (pagination.current - 1) * pagination.pageSize + 1;
    const newPage = Math.max(1, Math.ceil(currentStartRecord / size));
    
    setPagination(prev => ({
      ...prev,
      current: newPage,
      pageSize: size
    }));
    
    if (onPageSizeChange) {
      onPageSizeChange(newPage, size);
    } else if (onPageChange) {
      onPageChange(newPage, size);
    }
  }, [pagination.current, pagination.pageSize, onPageChange, onPageSizeChange]);

  // Resetear paginación
  const resetPagination = useCallback(() => {
    setPagination(prev => ({
      ...prev,
      current: initialCurrent,
      pageSize: initialPageSize,
      total: 0
    }));
  }, [initialCurrent, initialPageSize]);

  return {
    pagination,
    setPagination,
    handlePageChange,
    handlePageSizeChange,
    resetPagination,
    paginationInfo
  };
};

// Hook adicional para paginación server-side optimizada
export interface UseServerPaginationOptions extends UsePaginationOptions {
  onLoadData: (page: number, pageSize: number) => Promise<{ data: any[]; total: number }>;
  autoLoad?: boolean;
  debounceMs?: number;
}

export const useServerPagination = ({
  onLoadData,
  autoLoad = true,
  debounceMs = 300,
  ...paginationOptions
}: UseServerPaginationOptions) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);

  const pagination = usePagination({
    ...paginationOptions,
    onPageChange: async (page: number, pageSize: number) => {
      if (!onLoadData) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const result = await onLoadData(page, pageSize);
        setData(result.data || []);
        
        pagination.setPagination(prev => ({
          ...prev,
          current: page,
          pageSize,
          total: result.total
        }));
      } catch (err: any) {
        setError(err.message || 'Error loading data');
        setData([]);
      } finally {
        setLoading(false);
      }
    }
  });

  // Método para refrescar datos
  const refresh = useCallback(async () => {
    if (onLoadData) {
      await pagination.handlePageChange(pagination.pagination.current, pagination.pagination.pageSize);
    }
  }, [onLoadData, pagination]);

  // Método para ir a la primera página
  const goToFirstPage = useCallback(() => {
    pagination.handlePageChange(1);
  }, [pagination]);

  // Método para ir a la última página
  const goToLastPage = useCallback(() => {
    const lastPage = pagination.paginationInfo.totalPages;
    if (lastPage > 0) {
      pagination.handlePageChange(lastPage);
    }
  }, [pagination]);

  return {
    ...pagination,
    data,
    loading,
    error,
    refresh,
    goToFirstPage,
    goToLastPage,
    setData,
    setLoading,
    setError
  };
};

export default usePagination;