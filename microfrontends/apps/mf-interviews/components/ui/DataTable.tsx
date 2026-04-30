import React, { useState, useMemo, useCallback } from 'react';
import { FiChevronDown, FiSearch, FiFilter, FiDownload, FiRefreshCw, FiX } from 'react-icons/fi';
import Button from './Button';
import Input from './Input';
import AdvancedPagination from './AdvancedPagination';

export interface TableColumn<T = any> {
    key: string;
    title: string;
    dataIndex: keyof T;
    width?: number;
    sortable?: boolean;
    filterable?: boolean;
    filterType?: 'text' | 'select' | 'date' | 'number' | 'boolean';
    filterOptions?: Array<{ label: string; value: any }>;
    render?: (value: any, record: T, index: number) => React.ReactNode;
    align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T = any> {
    columns: TableColumn<T>[];
    data: T[];
    loading?: boolean;
    pagination?: {
        current: number;
        pageSize: number;
        total: number;
        onChange: (page: number, pageSize: number) => void;
        pageSizeOptions?: number[];
        showSizeChanger?: boolean;
        showQuickJumper?: boolean;
        showTotal?: boolean;
        simple?: boolean;
    };
    onRefresh?: () => void;
    onExport?: () => void;
    title?: string;
    actions?: React.ReactNode;
    rowKey?: keyof T | ((record: T) => string | number);
    className?: string;
    virtualScrolling?: boolean;
    rowHeight?: number;
    maxHeight?: number;
}

interface FilterState {
    [key: string]: {
        type: 'text' | 'select' | 'date' | 'number' | 'boolean';
        value: any;
        operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte';
    };
}

interface SortState {
    field: string | null;
    direction: 'asc' | 'desc' | null;
}

const DataTable = <T extends Record<string, any>>({
    columns,
    data,
    loading = false,
    pagination,
    onRefresh,
    onExport,
    title,
    actions,
    rowKey = 'id',
    className = '',
    virtualScrolling = false,
    rowHeight = 60,
    maxHeight = 600
}: DataTableProps<T>) => {
    const [filters, setFilters] = useState<FilterState>({});
    const [sort, setSort] = useState<SortState>({ field: null, direction: null });
    const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Obtener opciones únicas para filtros select
    const getUniqueValues = useCallback((dataIndex: keyof T) => {
        const uniqueValues = [...new Set(data.map(item => item[dataIndex]))]
            .filter(val => val !== null && val !== undefined && val !== '')
            .sort();
        
        return uniqueValues.map(value => ({
            label: String(value),
            value: value
        }));
    }, [data]);

    // Aplicar filtros
    const filteredData = useMemo(() => {
        let result = [...data];

        // Aplicar búsqueda global
        if (searchTerm) {
            result = result.filter(item =>
                Object.values(item).some(value =>
                    String(value).toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }

        // Aplicar filtros por columna
        Object.entries(filters).forEach(([field, filter]) => {
            // Solo aplicar filtro si hay un valor (permitir 0 y false, pero no string vacío)
            if (filter.value === null || filter.value === undefined ||
                (typeof filter.value === 'string' && filter.value.trim() === '')) {
                return;
            }

            result = result.filter(item => {
                const itemValue = item[field];
                const filterValue = filter.value;

                switch (filter.type) {
                    case 'text':
                        const strValue = String(itemValue).toLowerCase();
                        const strFilter = String(filterValue).toLowerCase();
                        
                        switch (filter.operator) {
                            case 'equals':
                                return strValue === strFilter;
                            case 'startsWith':
                                return strValue.startsWith(strFilter);
                            case 'endsWith':
                                return strValue.endsWith(strFilter);
                            case 'contains':
                            default:
                                return strValue.includes(strFilter);
                        }
                    
                    case 'select':
                        return itemValue === filterValue;
                    
                    case 'number':
                        const numValue = Number(itemValue);
                        const numFilter = Number(filterValue);
                        
                        switch (filter.operator) {
                            case 'equals':
                                return numValue === numFilter;
                            case 'gt':
                                return numValue > numFilter;
                            case 'lt':
                                return numValue < numFilter;
                            case 'gte':
                                return numValue >= numFilter;
                            case 'lte':
                                return numValue <= numFilter;
                            default:
                                return numValue === numFilter;
                        }
                    
                    case 'boolean':
                        return Boolean(itemValue) === Boolean(filterValue);
                    
                    case 'date':
                        // Implementar filtros de fecha según necesidad
                        return true;
                    
                    default:
                        return true;
                }
            });
        });

        return result;
    }, [data, filters, searchTerm]);

    // Aplicar paginación cliente (cuando se pasan todos los datos de una vez)
    const isClientSidePagination = pagination != null && pagination.total === data.length && data.length > 0;

    // Aplicar ordenamiento
    const sortedData = useMemo(() => {
        if (!sort.field || !sort.direction) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aValue = a[sort.field!];
            const bValue = b[sort.field!];

            if (aValue === bValue) return 0;

            let comparison = 0;
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                comparison = aValue.localeCompare(bValue);
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else {
                comparison = String(aValue).localeCompare(String(bValue));
            }

            return sort.direction === 'asc' ? comparison : -comparison;
        });
    }, [filteredData, sort]);

    // Manejar ordenamiento
    const handleSort = (field: string) => {
        if (sort.field === field) {
            // Cambiar dirección: asc -> desc -> none
            if (sort.direction === 'asc') {
                setSort({ field, direction: 'desc' });
            } else if (sort.direction === 'desc') {
                setSort({ field: null, direction: null });
            }
        } else {
            setSort({ field, direction: 'asc' });
        }
    };

    // Manejar filtros
    const handleFilter = (field: string, value: any, type: string, operator = 'contains') => {
        // Solo remover filtro si es null o undefined (no si es string vacío, 0, o false)
        if (value === null || value === undefined) {
            // Remover filtro
            const newFilters = { ...filters };
            delete newFilters[field];
            setFilters(newFilters);
        } else {
            setFilters(prev => ({
                ...prev,
                [field]: { type: type as any, value, operator: operator as any }
            }));
        }
    };

    // Limpiar todos los filtros
    const clearAllFilters = () => {
        setFilters({});
        setSearchTerm('');
        setSort({ field: null, direction: null });
    };

    // Componente de filtro por columna
    const ColumnFilter = ({ column }: { column: TableColumn<T> }) => {
        const currentFilter = filters[column.dataIndex as string];
        const isActive = activeFilterColumn === column.dataIndex;

        if (!column.filterable) return null;

        const filterType = column.filterType || 'text';
        const options = column.filterOptions || getUniqueValues(column.dataIndex);

        return (
            <div className="relative">
                <button
                    onClick={() => setActiveFilterColumn(isActive ? null : column.dataIndex as string)}
                    className={`p-1.5 rounded-md transition-all duration-200 ${
                        currentFilter
                            ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                    title="Filtrar columna"
                >
                    <FiFilter size={14} />
                </button>

                {isActive && (
                    <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-4 min-w-[240px]">
                        <div className="space-y-3">
                            {filterType === 'select' ? (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        Seleccionar valor
                                    </label>
                                    <select
                                        value={currentFilter?.value || ''}
                                        onChange={(e) => handleFilter(column.dataIndex as string, e.target.value, filterType)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    >
                                        <option value="">Todos</option>
                                        {options.map((option, idx) => (
                                            <option key={idx} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : filterType === 'number' ? (
                                <div className="space-y-2.5">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            Operador
                                        </label>
                                        <select
                                            value={currentFilter?.operator || 'equals'}
                                            onChange={(e) => {
                                                if (currentFilter) {
                                                    handleFilter(column.dataIndex as string, currentFilter.value, filterType, e.target.value);
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        >
                                            <option value="equals">Igual a</option>
                                            <option value="gt">Mayor que</option>
                                            <option value="lt">Menor que</option>
                                            <option value="gte">Mayor o igual</option>
                                            <option value="lte">Menor o igual</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            Valor
                                        </label>
                                        <input
                                            type="number"
                                            value={currentFilter?.value || ''}
                                            onChange={(e) => handleFilter(column.dataIndex as string, e.target.value, filterType, currentFilter?.operator || 'equals')}
                                            placeholder="Ingrese un número..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                </div>
                            ) : filterType === 'boolean' ? (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        Seleccionar estado
                                    </label>
                                    <select
                                        value={currentFilter?.value === undefined ? '' : String(currentFilter.value)}
                                        onChange={(e) => {
                                            const value = e.target.value === '' ? null : e.target.value === 'true';
                                            handleFilter(column.dataIndex as string, value, filterType);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    >
                                        <option value="">Todos</option>
                                        <option value="true">Sí</option>
                                        <option value="false">No</option>
                                    </select>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            Tipo de búsqueda
                                        </label>
                                        <select
                                            value={currentFilter?.operator || 'contains'}
                                            onChange={(e) => {
                                                if (currentFilter) {
                                                    handleFilter(column.dataIndex as string, currentFilter.value, filterType, e.target.value);
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        >
                                            <option value="contains">Contiene</option>
                                            <option value="equals">Igual a</option>
                                            <option value="startsWith">Empieza con</option>
                                            <option value="endsWith">Termina con</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            Texto a buscar
                                        </label>
                                        <input
                                            type="text"
                                            value={currentFilter?.value || ''}
                                            onChange={(e) => handleFilter(column.dataIndex as string, e.target.value, filterType, currentFilter?.operator || 'contains')}
                                            placeholder="Ingrese texto..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            )}

                            {currentFilter && (
                                <div className="pt-2 border-t border-gray-200">
                                    <button
                                        onClick={() => {
                                            handleFilter(column.dataIndex as string, null, filterType);
                                            setActiveFilterColumn(null);
                                        }}
                                        className="w-full px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center gap-2"
                                    >
                                        <FiX size={14} />
                                        Limpiar filtro
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const hasActiveFilters = Object.keys(filters).length > 0 || searchTerm;

    return (
        <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <div className="flex flex-wrap items-center gap-2">
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

                {/* Búsqueda global y filtros */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 max-w-md">
                        <Input
                            placeholder="Buscar en todos los campos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                            icon={<FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />}
                        />
                    </div>

                    {hasActiveFilters && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                                {Object.keys(filters).length} filtro(s) activo(s)
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAllFilters}
                                className="flex items-center gap-1 text-red-600 hover:text-red-700"
                            >
                                <FiX size={14} />
                                Limpiar todo
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 ${
                                        column.width ? `w-[${column.width}px]` : ''
                                    }`}
                                    style={{ width: column.width }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div
                                            className={`flex items-center gap-2 ${
                                                column.sortable ? 'cursor-pointer hover:text-gray-700' : ''
                                            }`}
                                            onClick={() => column.sortable && handleSort(column.dataIndex as string)}
                                        >
                                            <span>{column.title}</span>
                                            {column.sortable && (
                                                <div className="flex flex-col">
                                                    <FiChevronDown
                                                        size={12}
                                                        className={`transform transition-transform ${
                                                            sort.field === column.dataIndex && sort.direction === 'asc'
                                                                ? 'rotate-180 text-blue-600'
                                                                : sort.field === column.dataIndex && sort.direction === 'desc'
                                                                ? 'rotate-0 text-blue-600'
                                                                : 'text-gray-400'
                                                        }`}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <ColumnFilter column={column} />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                                    <div className="flex items-center justify-center">
                                        <FiRefreshCw className="animate-spin mr-2" />
                                        Cargando...
                                    </div>
                                </td>
                            </tr>
                        ) : sortedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                                    {hasActiveFilters ? 'No se encontraron resultados con los filtros aplicados' : 'No hay datos disponibles'}
                                </td>
                            </tr>
                        ) : (
                            (isClientSidePagination && pagination
                                ? sortedData.slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize)
                                : sortedData
                            ).map((record, index) => {
                                const key = typeof rowKey === 'function' ? rowKey(record) : record[rowKey];
                                return (
                                    <tr key={key} className="hover:bg-gray-50">
                                        {columns.map((column) => (
                                            <td
                                                key={column.key}
                                                className={`px-4 py-3 whitespace-nowrap text-sm text-gray-900 ${
                                                    column.align === 'center' ? 'text-center' :
                                                    column.align === 'right' ? 'text-right' : 'text-left'
                                                }`}
                                            >
                                                {column.render
                                                    ? column.render(record[column.dataIndex], record, index)
                                                    : String(record[column.dataIndex] || '')
                                                }
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginación Avanzada */}
            {pagination && (
                <div className="px-4 py-3 border-t border-gray-200">
                    <AdvancedPagination
                        current={pagination.current}
                        total={pagination.total}
                        pageSize={pagination.pageSize}
                        onChange={pagination.onChange}
                        onShowSizeChange={pagination.onChange}
                        pageSizeOptions={pagination.pageSizeOptions || [5, 10, 20, 50, 100]}
                        showSizeChanger={pagination.showSizeChanger !== false}
                        showQuickJumper={pagination.showQuickJumper !== false}
                        showTotal={pagination.showTotal !== false}
                        simple={pagination.simple || false}
                        size="default"
                    />
                </div>
            )}
        </div>
    );
};

export { DataTable };
export default DataTable;