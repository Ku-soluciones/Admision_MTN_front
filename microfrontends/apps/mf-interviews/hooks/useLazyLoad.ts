import { useState, useEffect, useCallback, useRef } from 'react';

export interface LazyLoadConfig {
  pageSize: number;
  threshold?: number;
  enabled?: boolean;
  preloadPages?: number;
}

export interface LazyLoadResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  hasNextPage: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
  totalLoaded: number;
  currentPage: number;
}

export interface UseLazyLoadOptions<T> extends LazyLoadConfig {
  loadFn: (page: number, pageSize: number) => Promise<{ data: T[]; total: number; hasMore: boolean }>;
  deps?: any[];
}

export const useLazyLoad = <T>({
  loadFn,
  pageSize = 20,
  threshold = 0.8,
  enabled = true,
  preloadPages = 1,
  deps = []
}: UseLazyLoadOptions<T>): LazyLoadResult<T> => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalLoaded, setTotalLoaded] = useState(0);
  
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  // Función para cargar más datos
  const loadMore = useCallback(async () => {
    if (!enabled || loading || !hasNextPage || loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const nextPage = currentPage + 1;
      const result = await loadFn(nextPage, pageSize);
      
      if (mountedRef.current) {
        setData(prev => [...prev, ...result.data]);
        setCurrentPage(nextPage);
        setHasNextPage(result.hasMore);
        setTotalLoaded(prev => prev + result.data.length);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || 'Error loading data');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      loadingRef.current = false;
    }
  }, [enabled, loading, hasNextPage, currentPage, pageSize, loadFn]);

  // Función para refrescar datos
  const refresh = useCallback(async () => {
    if (!enabled) return;

    setData([]);
    setCurrentPage(0);
    setHasNextPage(true);
    setTotalLoaded(0);
    setError(null);
    loadingRef.current = false;
    
    await loadMore();
  }, [enabled, loadMore]);

  // Función para resetear estado
  const reset = useCallback(() => {
    setData([]);
    setCurrentPage(0);
    setHasNextPage(true);
    setTotalLoaded(0);
    setError(null);
    setLoading(false);
    loadingRef.current = false;
  }, []);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled && data.length === 0 && !loading && hasNextPage) {
      loadMore();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [enabled, ...deps]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    hasNextPage,
    loadMore,
    refresh,
    reset,
    totalLoaded,
    currentPage
  };
};

// Hook para infinite scroll automático
export interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export const useInfiniteScroll = (
  loadMore: () => Promise<void>,
  hasNextPage: boolean,
  loading: boolean,
  { threshold = 0.1, rootMargin = '0px', enabled = true }: UseInfiniteScrollOptions = {}
) => {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !hasNextPage || loading) return;

    const trigger = triggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !loading) {
          loadMore();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(trigger);

    return () => {
      if (trigger) {
        observer.unobserve(trigger);
      }
    };
  }, [loadMore, hasNextPage, loading, enabled, threshold, rootMargin]);

  return { triggerRef };
};

// Hook para detectar scroll cerca del final
export const useScrollDetection = (
  container: React.RefObject<HTMLElement>,
  onNearEnd: () => void,
  threshold = 0.8,
  enabled = true
) => {
  useEffect(() => {
    if (!enabled || !container.current) return;

    const element = container.current;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
      
      if (scrollPercentage >= threshold) {
        onNearEnd();
      }
    };

    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [container, onNearEnd, threshold, enabled]);
};

export default useLazyLoad;