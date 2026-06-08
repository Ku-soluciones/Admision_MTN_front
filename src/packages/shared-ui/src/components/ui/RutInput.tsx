import React, { useState, useEffect, useRef } from 'react';
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
  /** Indica que se está verificando el RUT contra el servidor. */
  isChecking?: boolean;
  /** Texto de ayuda mostrado bajo el input cuando está vacío. */
  helpText?: string;
  /** Atributo autocomplete del input (ej: "off", "username"). */
  autoComplete?: string;
  /** inputMode del input. Por defecto "numeric" para teclado numérico en móvil. */
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url' | 'search' | 'none';
}

const DEFAULT_HELP_TEXT = 'Puedes escribirlo con o sin puntos; se formatea solo.';

/** Spinner SVG inline — liviano, sin dependencias extra. */
const CheckingSpinner: React.FC = () => (
  <svg className="inline-block h-3 w-3 animate-spin mr-1.5 text-azul-monte-tabor" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
    <path d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** Checkmark SVG inline para éxito. */
const SuccessCheck: React.FC = () => (
  <svg className="inline-block h-3 w-3 mr-1 text-verde-esperanza" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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
  isChecking = false,
  helpText = DEFAULT_HELP_TEXT,
  autoComplete = 'off',
  inputMode = 'numeric',
}) => {
  const [internalError, setInternalError] = useState<string>('');
  const [touched, setTouched] = useState(false);
  // Muestra confirmación breve de disponibilidad (se apaga tras ~3 s)
  const [showAvailable, setShowAvailable] = useState(false);
  const availableTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  // Limpiar error interno y estado "disponible" cuando el usuario escribe
  useEffect(() => {
    if (value && internalError) {
      setInternalError('');
    }
    setShowAvailable(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps — internalError se lee pero no debe disparar el efecto
  }, [value]);

  // Cuando isChecking pasa de true → false sin error externo → RUT disponible
  const prevChecking = useRef(isChecking);
  useEffect(() => {
    if (prevChecking.current && !isChecking && !externalError && value.trim() && isValidRut(value)) {
      setShowAvailable(true);
      clearTimeout(availableTimer.current);
      availableTimer.current = setTimeout(() => setShowAvailable(false), 3000);
    }
    prevChecking.current = isChecking;
    return () => clearTimeout(availableTimer.current);
  }, [isChecking, externalError, value]);

  // Determinar qué error mostrar
  const displayError = externalError || (touched ? internalError : '');
  const hasError = Boolean(displayError);

  // Si el error es de formato inválido, agregar ejemplo
  const computedError = displayError === RUT_ERROR_MESSAGES.INVALID
    ? `${displayError} — Ej: 12.345.678-9`
    : displayError;

  // ── Help text contextual con prioridad: checking > disponible > vacío > nada ──
  // Cuando hay indicadores ricos (spinner/check) renderizamos fuera de Input.
  const showRichFeedback = isChecking || showAvailable;
  const plainHelpText = showRichFeedback
    ? undefined
    : (!value.trim() && !hasError ? helpText : undefined);

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
        helpText={plainHelpText}
        maxLength={12}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      />

      {/* ── Feedback rico: verificando / disponible ── */}
      {!hasError && showRichFeedback && (
        <p
          className="mt-1 text-xs flex items-center transition-opacity duration-300"
          role="status"
          aria-live="polite"
        >
          {isChecking ? (
            <span className="text-azul-monte-tabor">
              <CheckingSpinner />Verificando disponibilidad…
            </span>
          ) : showAvailable ? (
            <span className="text-verde-esperanza">
              <SuccessCheck />RUT disponible
            </span>
          ) : null}
        </p>
      )}
    </div>
  );
};

export default RutInput;
