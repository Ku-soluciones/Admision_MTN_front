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
  /** Texto de ayuda mostrado bajo el input cuando está vacío. */
  helpText?: string;
  /** Atributo autocomplete del input (ej: "off", "username"). */
  autoComplete?: string;
  /** inputMode del input. Por defecto "numeric" para teclado numérico en móvil. */
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url' | 'search' | 'none';
}

const DEFAULT_HELP_TEXT = 'Puedes escribirlo con o sin puntos; se formatea solo.';

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
  autoFormat = true,
  helpText = DEFAULT_HELP_TEXT,
  autoComplete = 'off',
  inputMode = 'numeric',
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

  const hasError = Boolean(displayError);

  // Help text contextual: mostrar solo si está vacío y no hay error
  const computedHelpText = !value.trim() && !hasError ? helpText : undefined;

  // Si el error es de formato inválido, agregar ejemplo
  const computedError = displayError === RUT_ERROR_MESSAGES.INVALID
    ? `${displayError} — Ej: 12.345.678-9`
    : displayError;

  return (
    <div className={className}>
      <Input
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        isRequired={required}
        disabled={disabled}
        error={computedError}
        label={label}
        id={name}
        name={name}
        autoComplete={autoComplete}
        inputMode={inputMode}
        helpText={computedHelpText}
        maxLength={12}
      />
    </div>
  );
};

export default RutInput;
