import React, { useState, useEffect } from 'react';
import Input from './Input';
import { formatRutInput, isValidRut, RUT_ERROR_MESSAGES } from '../../utils/rutUtils';

interface RutInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  name?: string;
  className?: string;
  showValidation?: boolean;
  autoFormat?: boolean;
}

const RutInput: React.FC<RutInputProps> = ({
  value,
  onChange,
  onBlur,
  placeholder = "12.345.678-9",
  required = false,
  disabled = false,
  error: externalError,
  label = "RUT",
  name = "rut",
  className = "",
  showValidation = true,
  autoFormat = true
}) => {
  const [internalError, setInternalError] = useState<string>('');
  const [touched, setTouched] = useState(false);

  // Formatear el valor mientras se escribe
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (autoFormat) {
      const formatted = formatRutInput(newValue);
      onChange(formatted);
    } else {
      onChange(newValue);
    }
  };

  // Validar cuando el campo pierde el foco
  const handleBlur = () => {
    setTouched(true);
    
    if (showValidation && value.trim()) {
      if (!isValidRut(value)) {
        setInternalError(RUT_ERROR_MESSAGES.INVALID);
      } else {
        setInternalError('');
      }
    } else if (required && !value.trim()) {
      setInternalError(RUT_ERROR_MESSAGES.REQUIRED);
    }
    
    onBlur?.();
  };

  // Limpiar error interno cuando el valor cambia
  useEffect(() => {
    if (value && internalError) {
      setInternalError('');
    }
  }, [value]);

  // Determinar qué error mostrar
  const displayError = externalError || (touched ? internalError : '');

  // Determinar el estado visual
  const isValid = value.trim() && isValidRut(value);
  const hasError = Boolean(displayError);

  return (
    <div className={`relative ${className}`}>
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        error={displayError}
        label={label}
        id={name}
        name={name}
        maxLength={12} // 11.111.111-1 = 12 caracteres
        className={`
          ${hasError ? 'border-red-500 focus:border-red-500' : ''}
          ${isValid && !hasError ? 'border-green-500 focus:border-green-500' : ''}
        `}
      />
      
      {/* Indicador visual de validación */}
      {showValidation && value.trim() && touched && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-3">
          {isValid && !hasError ? (
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : hasError ? (
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : null}
        </div>
      )}
      
      {/* Ayuda adicional */}
      {!hasError && !value.trim() && (
        <p className="mt-1 text-sm text-gray-500">
          Ingresa tu RUT sin puntos ni guión, se formateará automáticamente
        </p>
      )}
      
      {/* Ejemplo de formato válido */}
      {hasError && displayError === RUT_ERROR_MESSAGES.INVALID && (
        <p className="mt-1 text-sm text-gray-500">
          Formato válido: 12.345.678-9 o 12345678-9
        </p>
      )}
    </div>
  );
};

export default RutInput;