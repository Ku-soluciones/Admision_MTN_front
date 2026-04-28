import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { FiChevronDown, FiSearch, FiFilter, FiDownload, FiRefreshCw, FiX } from 'react-icons/fi';
import Button from './Button';
import Input from './Input';
import AdvancedPagination from './AdvancedPagination';
import { TableColumn } from './DataTable';

export interface VirtualizedTableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  height?: number;
  rowHeight?: number;
  overscan?: number;
  onRefresh?: () => void;
  onExport?: () => void;
  title?: string;
  actions?: React.ReactNode;
  rowKey?: keyof T | ((record: T) => string | number);
  className?: string;
  onRowClick?: (record: T, index: number) => void;
  enableVirtualization?: boolean;
}

interface VirtualItem {
  index: number;
  start: number;
  size: number;
}

const VirtualizedTable = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  height = 400,
  rowHeight = 60,
  overscan = 10,
  onRefresh,
  onExport,
  title,
  actions,
  rowKey = 'id',
  className = '',
  onRowClick,
  enableVirtualization = true
}: VirtualizedTableProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(height);

  // Filtrar datos basado en búsqueda
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(item =>
      Object.values(item).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  // Calcular elementos virtuales visibles
  const virtualItems = useMemo((): VirtualItem[] => {
    if (!enableVirtualization || filteredData.length === 0) {
      return filteredData.map((_, index) => ({
        index,
        start: index * rowHeight,
        size: rowHeight
      }));
    }

    const containerHeight = height;
    const scrollTop = Math.max(0, scrollTop);
    
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIndex = Math.min(
      filteredData.length - 1,
      Math.floor((scrollTop + containerHeight) / rowHeight) + overscan
    );

    const items: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        start: i * rowHeight,
        size: rowHeight
      });
    }

    return items;
  }, [filteredData.length, height, scrollTop, rowHeight, overscan, enableVirtualization]);

  const totalHeight = filteredData.length * rowHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  // Renderizar fila individual
  const renderRow = useCallback((item: VirtualItem) => {
    const record = filteredData[item.index];
    if (!record) return null;

    const key = typeof rowKey === 'function' ? rowKey(record) : record[rowKey];

    return (
      <div
        key={key}
        className={`absolute left-0 right-0 border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors duration-150 ${
          onRowClick ? 'cursor-pointer' : ''
        }`}
        style={{
          height: rowHeight,
          top: item.start,
          display: 'flex',
          alignItems: 'center'
        }}
        onClick={() => onRowClick?.(record, item.index)}
      >
        {columns.map((column, colIndex) => (
          <div
            key={column.key}
            className={`px-4 flex-shrink-0 text-sm text-gray-900 ${
              column.align === 'center' ? 'text-center' :
              column.align === 'right' ? 'text-right' : 'text-left'
            }`}
            style={{ 
              width: column.width || 'auto',
              flexGrow: column.width ? 0 : 1,
              minWidth: column.width || 100
            }}
          >
            <div className="truncate">
              {column.render
                ? column.render(record[column.dataIndex], record, item.index)
                : String(record[column.dataIndex] || '')
              }
            </div>
          </div>
        ))}
      </div>
    );
  }, [columns, filteredData, rowHeight, rowKey, onRowClick]);

  // Ajustar altura del contenedor según el contenido
  useEffect(() => {
    if (scrollElementRef.current) {
      const newHeight = Math.min(height, filteredData.length * rowHeight + 100);
      setContainerHeight(newHeight);
    }
  }, [height, filteredData.length, rowHeight]);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex items-center gap-2">
            {actions}
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="flex items-center gap-1"
              >
                <FiDownload size={14} />
                Exportar
              </Button>
            )}
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="flex items-center gap-1"
              >
                <FiRefreshCw size={14} />
                Actualizar
              </Button>
            )}
          </div>
        </div>

        {/* Búsqueda global */}
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Buscar en todos los campos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              icon={<FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />}
            />
          </div>

          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="flex items-center gap-1 text-red-600 hover:text-red-700"
            >
              <FiX size={14} />
              Limpiar búsqueda
            </Button>
          )}

          <div className="text-sm text-gray-600">
            {filteredData.length.toLocaleString()} resultado{filteredData.length !== 1 ? 's' : ''}
            {filteredData.length !== data.length && ` de ${data.length.toLocaleString()}`}
          </div>
        </div>
      </div>

      {/* Header de tabla */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex items-center" style={{ height: 48 }}>
          {columns.map((column) => (
            <div
              key={column.key}
              className={`px-4 flex-shrink-0 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                column.align === 'center' ? 'text-center' :
                column.align === 'right' ? 'text-right' : 'text-left'
              }`}
              style={{ 
                width: column.width || 'auto',
                flexGrow: column.width ? 0 : 1,
                minWidth: column.width || 100
              }}
            >
              <div className="flex items-center justify-between">
                <span className="truncate">{column.title}</span>
                {column.sortable && (
                  <FiChevronDown size={12} className="text-gray-400 ml-1" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contenido de tabla virtualizada */}
      <div className="relative overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center">
              <FiRefreshCw className="animate-spin mr-2" />
              <span className="text-gray-600">Cargando datos...</span>
            </div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-gray-400 mb-2">
                <FiSearch size={48} className="mx-auto" />
              </div>
              <p className="text-gray-600">
                {searchTerm ? 'No se encontraron resultados con la búsqueda actual' : 'No hay datos disponibles'}
              </p>
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSearch}
                  className="mt-2"
                >
                  Limpiar búsqueda
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div
            ref={scrollElementRef}
            className="overflow-auto"
            style={{ height: containerHeight }}
            onScroll={handleScroll}
          >
            <div 
              className="relative"
              style={{ height: totalHeight }}
            >
              {virtualItems.map(renderRow)}
            </div>
          </div>
        )}
      </div>

      {/* Footer con información */}
      {!loading && filteredData.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>
                Total: {filteredData.length.toLocaleString()} elemento{filteredData.length !== 1 ? 's' : ''}
              </span>
              {enableVirtualization && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Renderizado optimizado activo
                </span>
              )}
            </div>
            
            {searchTerm && (
              <div className="text-xs">
                Filtrado por: "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualizedTable;