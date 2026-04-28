import React from 'react';

interface Column<T> {
    key: keyof T;
    header: string;
    render?: (value: any, item: T) => React.ReactNode;
    className?: string;
}

interface TableProps<T> {
    data: T[];
    columns: Column<T>[];
    className?: string;
    emptyMessage?: string;
}

const Table = <T extends Record<string, any>>({ 
    data, 
    columns, 
    className = '',
    emptyMessage = "No hay datos disponibles"
}: TableProps<T>) => {
    if (!data || data.length === 0) {
        return (
            <div className="text-center py-8 text-gris-piedra">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className={`overflow-x-auto ${className}`}>
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b-2 border-gray-200">
                        {columns.map((column) => (
                            <th 
                                key={String(column.key)}
                                className={`text-left py-3 px-4 font-semibold text-azul-monte-tabor ${column.className || ''}`}
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, index) => (
                        <tr 
                            key={index}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                            {columns.map((column) => (
                                <td 
                                    key={String(column.key)}
                                    className={`py-3 px-4 ${column.className || ''}`}
                                >
                                    {column.render 
                                        ? column.render(item[column.key], item)
                                        : String(item[column.key] || '-')
                                    }
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Table;