import { useState, useEffect, useCallback, useRef } from 'react';
import { useNotifications } from '../context/AppContext';

interface DataTableState<T> {
    data: T[];
    loading: boolean;
    error: string | null;
    pagination: {
        current: number;
        pageSize: number;
        total: number;
    };
}

interface DataTableOptions<T> {
    initialPageSize?: number;
    enableAutoLoad?: boolean;
    transformData?: (rawData: any[]) => T[];
    fallbackData?: T[];
}

interface DataTableHook<T> extends DataTableState<T> {
    loadData: (page?: number, size?: number) => Promise<void>;
    setData: (data: T[]) => void;
    refresh: () => Promise<void>;
    resetError: () => void;
}

export const useDataTable = <T>(
    dataLoader: (page: number, size: number) => Promise<T[]>,
    options: DataTableOptions<T> = {}
): DataTableHook<T> => {
    const {
        initialPageSize = 5,
        enableAutoLoad = true,
        transformData,
        fallbackData = []
    } = options;

    const { addNotification } = useNotifications();
    
    // Use refs to avoid dependency loops
    const dataLoaderRef = useRef(dataLoader);
    const transformDataRef = useRef(transformData);
    const fallbackDataRef = useRef(fallbackData);
    
    // Update refs when props change
    dataLoaderRef.current = dataLoader;
    transformDataRef.current = transformData;
    fallbackDataRef.current = fallbackData;

    const [state, setState] = useState<DataTableState<T>>({
        data: fallbackData,
        loading: false,
        error: null,
        pagination: {
            current: 1,
            pageSize: initialPageSize,
            total: 0
        }
    });

    const loadData = useCallback(async (page = 1, size = initialPageSize) => {
        setState(prev => ({
            ...prev,
            loading: true,
            error: null
        }));

        try {
            console.log(`Loading data: page ${page}, size ${size}`);
            
            const rawData = await dataLoaderRef.current(page, size);
            
            // Aplicar transformación si está definida
            const finalData = transformDataRef.current ? transformDataRef.current(rawData) : rawData;
            
            setState(prev => ({
                ...prev,
                data: finalData,
                loading: false,
                error: null,
                pagination: {
                    current: page,
                    pageSize: size,
                    total: finalData.length
                }
            }));

            console.log(`Data loaded successfully: ${finalData.length} items`);

        } catch (error: any) {
            console.error('Error loading data:', error);
            
            const errorMessage = error.response?.data?.message || 
                               error.message || 
                               'Error al cargar los datos';

            setState(prev => ({
                ...prev,
                data: fallbackDataRef.current,
                loading: false,
                error: errorMessage,
                pagination: {
                    current: 1,
                    pageSize: size,
                    total: 0
                }
            }));

            // Mostrar notificación de error
            addNotification({
                type: 'error',
                title: 'Error de Carga',
                message: errorMessage
            });
        }
    }, [initialPageSize, addNotification]);

    const setData = useCallback((data: T[]) => {
        setState(prev => ({
            ...prev,
            data,
            pagination: {
                ...prev.pagination,
                total: data.length
            }
        }));
    }, []);

    const paginationRef = useRef(state.pagination);
    paginationRef.current = state.pagination;

    const refresh = useCallback(() => {
        return loadData(paginationRef.current.current, paginationRef.current.pageSize);
    }, [loadData]);

    const resetError = useCallback(() => {
        setState(prev => ({
            ...prev,
            error: null
        }));
    }, []);

    // Auto-load inicial - run only once
    const initialLoadRef = useRef(false);
    useEffect(() => {
        if (enableAutoLoad && !initialLoadRef.current) {
            initialLoadRef.current = true;
            loadData();
        }
    }, [enableAutoLoad]); // Remove loadData from dependencies to prevent loop

    return {
        ...state,
        loadData,
        setData,
        refresh,
        resetError
    };
};