import React, { useMemo } from 'react';
import Button from './Button';
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight, FiMoreHorizontal } from 'react-icons/fi';

interface AdvancedPaginationProps {
  current: number;
  total: number;
  pageSize: number;
  pageSizeOptions?: number[];
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
  onChange: (page: number, pageSize: number) => void;
  onShowSizeChange?: (current: number, size: number) => void;
  className?: string;
  size?: 'small' | 'default' | 'large';
  simple?: boolean;
  disabled?: boolean;
}

const AdvancedPagination: React.FC<AdvancedPaginationProps> = ({
  current = 1,
  total = 0,
  pageSize = 5,
  pageSizeOptions = [5, 10, 20, 50, 100],
  showSizeChanger = true,
  showQuickJumper = true,
  showTotal = true,
  onChange,
  onShowSizeChange,
  className = '',
  size = 'default',
  simple = false,
  disabled = false
}) => {
  const totalPages = Math.ceil(total / pageSize);
  const startRecord = Math.min((current - 1) * pageSize + 1, total);
  const endRecord = Math.min(current * pageSize, total);

  // Generar números de página a mostrar
  const pageNumbers = useMemo(() => {
    if (simple || totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [];
    
    // Siempre mostrar la primera página
    pages.push(1);
    
    if (current > 4) {
      pages.push('ellipsis');
    }
    
    // Páginas alrededor de la actual
    const start = Math.max(2, current - 2);
    const end = Math.min(totalPages - 1, current + 2);
    
    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }
    
    if (current < totalPages - 3) {
      pages.push('ellipsis');
    }
    
    // Siempre mostrar la última página
    if (totalPages > 1 && !pages.includes(totalPages)) {
      pages.push(totalPages);
    }
    
    return pages;
  }, [current, totalPages, simple]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === current || disabled) return;
    onChange(page, pageSize);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    const newCurrent = Math.min(current, Math.ceil(total / newPageSize));
    if (onShowSizeChange) {
      onShowSizeChange(newCurrent, newPageSize);
    } else {
      onChange(newCurrent, newPageSize);
    }
  };

  const handleQuickJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLInputElement;
      const page = parseInt(target.value);
      if (page >= 1 && page <= totalPages) {
        handlePageChange(page);
        target.value = '';
      }
    }
  };

  const buttonSize = size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'md';
  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  if (total === 0) return null;

  if (simple) {
    return (
      <div className={`flex items-center justify-between ${className}`}>
        {showTotal && (
          <div className="text-sm text-gray-600">
            {startRecord}-{endRecord} de {total}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size={buttonSize}
            disabled={current <= 1 || disabled}
            onClick={() => handlePageChange(current - 1)}
            className="min-w-[80px]"
          >
            <FiChevronLeft size={iconSize} className="mr-1" />
            Anterior
          </Button>
          <span className="text-sm text-gray-600 px-3">
            {current} / {totalPages}
          </span>
          <Button
            variant="outline"
            size={buttonSize}
            disabled={current >= totalPages || disabled}
            onClick={() => handlePageChange(current + 1)}
            className="min-w-[80px]"
          >
            Siguiente
            <FiChevronRight size={iconSize} className="ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Información de totales */}
      {showTotal && (
        <div className="text-sm text-gray-600 order-2 sm:order-1">
          Mostrando {startRecord.toLocaleString()} a {endRecord.toLocaleString()} de {total.toLocaleString()} resultados
        </div>
      )}

      {/* Controles de paginación */}
      <div className="flex flex-wrap items-center gap-2 order-1 sm:order-2">
        {/* Selector de tamaño de página */}
        {showSizeChanger && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">Mostrar:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
              disabled={disabled}
              className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navegación de páginas */}
        <div className="flex items-center gap-1">
          {/* Primera página */}
          <Button
            variant="outline"
            size={buttonSize}
            disabled={current <= 1 || disabled}
            onClick={() => handlePageChange(1)}
            title="Primera página"
          >
            <FiChevronsLeft size={iconSize} />
          </Button>

          {/* Página anterior */}
          <Button
            variant="outline"
            size={buttonSize}
            disabled={current <= 1 || disabled}
            onClick={() => handlePageChange(current - 1)}
            title="Página anterior"
          >
            <FiChevronLeft size={iconSize} />
          </Button>

          {/* Números de página */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((page, index) => (
              page === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-400">
                  <FiMoreHorizontal size={iconSize} />
                </span>
              ) : (
                <Button
                  key={page}
                  variant={page === current ? 'primary' : 'outline'}
                  size={buttonSize}
                  disabled={disabled}
                  onClick={() => handlePageChange(page)}
                  className={`min-w-[32px] ${
                    page === current ? 'bg-blue-600 text-white border-blue-600' : ''
                  }`}
                >
                  {page}
                </Button>
              )
            ))}
          </div>

          {/* Página siguiente */}
          <Button
            variant="outline"
            size={buttonSize}
            disabled={current >= totalPages || disabled}
            onClick={() => handlePageChange(current + 1)}
            title="Página siguiente"
          >
            <FiChevronRight size={iconSize} />
          </Button>

          {/* Última página */}
          <Button
            variant="outline"
            size={buttonSize}
            disabled={current >= totalPages || disabled}
            onClick={() => handlePageChange(totalPages)}
            title="Última página"
          >
            <FiChevronsRight size={iconSize} />
          </Button>
        </div>

        {/* Salto rápido */}
        {showQuickJumper && totalPages > 7 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">Ir a:</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              placeholder="Página"
              onKeyPress={handleQuickJump}
              disabled={disabled}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedPagination;