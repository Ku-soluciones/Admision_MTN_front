import React from 'react';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    id: string;
    options: SelectOption[];
    error?: string;
    isRequired?: boolean;
    placeholder?: string;
    helpText?: string;
}

const Select: React.FC<SelectProps> = ({
    label,
    id,
    options,
    error,
    isRequired,
    placeholder = "Seleccione una opción",
    helpText,
    className,
    ...props
}) => {
    return (
        <div className="w-full">
            <label htmlFor={id} className="block text-sm font-medium text-gris-piedra mb-1">
                {label} {isRequired && <span className="text-rojo-sagrado">*</span>}
            </label>
            <select
                id={id}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200 bg-blanco-pureza ${
                    error 
                        ? 'border-rojo-sagrado focus:ring-rojo-sagrado' 
                        : 'border-gray-300 focus:border-azul-monte-tabor focus:ring-azul-monte-tabor'
                } ${className || ''}`}
                {...props}
            >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {helpText && !error && (
                <p className="mt-1 text-xs text-gris-piedra">{helpText}</p>
            )}
            {error && <p className="mt-1 text-xs text-rojo-sagrado">{error}</p>}
        </div>
    );
};

export default Select;