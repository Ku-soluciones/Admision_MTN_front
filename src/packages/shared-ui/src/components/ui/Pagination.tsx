import React from 'react';
import Button from './Button';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon
} from '../icons/Icons';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showFirstLast?: boolean;
  maxVisible?: number;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
  showFirstLast = true,
  maxVisible = 5
}) => {
  if (totalPages <= 1) return null;

  // Paginación inteligente: ajustar maxVisible según totalPages
  const getSmartMaxVisible = () => {
    if (totalPages <= 3) return totalPages;      // Mostrar todas si son 3 o menos
    if (totalPages <= 5) return Math.min(5, totalPages); // Máximo 5 si hay pocas páginas
    if (totalPages <= 10) return 3;             // Solo 3 visibles si hay 10 o menos
    return Math.min(maxVisible, 5);             // Máximo 5 para muchas páginas
  };

  const smartMaxVisible = getSmartMaxVisible();

  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const half = Math.floor(smartMaxVisible / 2);
    
    let start = Math.max(0, currentPage - half);
    let end = Math.min(totalPages - 1, currentPage + half);

    // Adjust if we're near the beginning or end
    if (currentPage <= half) {
      end = Math.min(totalPages - 1, smartMaxVisible - 1);
    } else if (currentPage >= totalPages - half - 1) {
      start = Math.max(0, totalPages - smartMaxVisible);
    }

    // Add first page and ellipsis if needed
    if (start > 0) {
      pages.push(0);
      if (start > 1) {
        pages.push('...');
      }
    }

    // Add visible pages
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Add ellipsis and last page if needed
    if (end < totalPages - 1) {
      if (end < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages - 1);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();
  
  // Ocultar botones first/last si hay muy pocas páginas
  const shouldShowFirstLast = showFirstLast && totalPages > 5;

  return (
    <nav className={`flex items-center justify-center space-x-1 ${className}`}>
      {/* First page button */}
      {shouldShowFirstLast && currentPage > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(0)}
          className="p-2"
        >
          <ChevronDoubleLeftIcon className="w-4 h-4" />
        </Button>
      )}

      {/* Previous page button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(0, currentPage - 1))}
        disabled={currentPage === 0}
        className="p-2"
      >
        <ChevronLeftIcon className="w-4 h-4" />
      </Button>

      {/* Page number buttons */}
      {visiblePages.map((page, index) => (
        <React.Fragment key={index}>
          {page === '...' ? (
            <span className="px-3 py-2 text-gray-500">...</span>
          ) : (
            <Button
              variant={currentPage === page ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page as number)}
              className="min-w-[40px]"
            >
              {(page as number) + 1}
            </Button>
          )}
        </React.Fragment>
      ))}

      {/* Next page button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
        disabled={currentPage === totalPages - 1}
        className="p-2"
      >
        <ChevronRightIcon className="w-4 h-4" />
      </Button>

      {/* Last page button */}
      {shouldShowFirstLast && currentPage < totalPages - 1 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages - 1)}
          className="p-2"
        >
          <ChevronDoubleRightIcon className="w-4 h-4" />
        </Button>
      )}
    </nav>
  );
};

export default Pagination;