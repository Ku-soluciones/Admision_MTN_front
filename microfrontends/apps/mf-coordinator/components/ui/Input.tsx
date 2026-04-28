
import React, { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    id: string;
    error?: string;
    isRequired?: boolean;
    helpText?: string;
    showPasswordToggle?: boolean;
}

const Input: React.FC<InputProps> = ({ label, id, error, isRequired, helpText, showPasswordToggle, type, ...props }) => {
    const [showPassword, setShowPassword] = useState(false);
    const errorId = error ? `${id}-error` : undefined;
    const helpTextId = helpText ? `${id}-help` : undefined;
    const describedBy = [errorId, helpTextId].filter(Boolean).join(' ') || undefined;

    const isPasswordInput = type === 'password';
    const shouldShowToggle = isPasswordInput && showPasswordToggle;
    const inputType = shouldShowToggle && showPassword ? 'text' : type;

    return (
        <div className="w-full">
            <label htmlFor={id} className="block text-sm font-medium text-gris-piedra mb-1">
                {label} {isRequired && <span className="text-rojo-sagrado" aria-label="requerido">*</span>}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type={inputType}
                    aria-label={label}
                    aria-required={isRequired}
                    aria-invalid={!!error}
                    aria-describedby={describedBy}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200 ${
                        shouldShowToggle ? 'pr-10' : ''
                    } ${
                        error
                            ? 'border-rojo-sagrado focus:ring-rojo-sagrado'
                            : 'border-gray-300 focus:border-azul-monte-tabor focus:ring-azul-monte-tabor'
                    }`}
                    {...props}
                />
                {shouldShowToggle && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        tabIndex={-1}
                    >
                        {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                    </button>
                )}
            </div>
            {error && <p id={errorId} className="mt-1 text-xs text-rojo-sagrado" role="alert">{error}</p>}
            {helpText && !error && <p id={helpTextId} className="mt-1 text-xs text-gray-500">{helpText}</p>}
        </div>
    );
};

export default Input;
