import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helpText?: string;
    showCharCount?: boolean;
    maxLength?: number;
}

const TextArea: React.FC<TextAreaProps> = ({
    label,
    error,
    helpText,
    showCharCount = false,
    maxLength,
    id,
    className,
    value,
    rows = 4,
    ...props
}) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helpTextId = helpText ? `${textareaId}-help` : undefined;
    const describedBy = [errorId, helpTextId].filter(Boolean).join(' ') || undefined;

    const charCount = typeof value === 'string' ? value.length : 0;

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={textareaId} className="block text-sm font-medium text-gris-piedra mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <textarea
                    id={textareaId}
                    rows={rows}
                    aria-label={label}
                    aria-invalid={!!error}
                    aria-describedby={describedBy}
                    className={`w-full px-4 py-2.5 border rounded-lg text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors duration-200 resize-y ${
                        error
                            ? 'border-rojo-sagrado focus:ring-rojo-sagrado focus:border-rojo-sagrado'
                            : 'border-gray-300 focus:border-azul-monte-tabor focus:ring-azul-monte-tabor'
                    } ${className || ''}`}
                    value={value}
                    maxLength={maxLength}
                    {...props}
                />
            </div>
            <div className="flex justify-between mt-1">
                <div>
                    {error && (
                        <p id={errorId} className="text-xs text-rojo-sagrado" role="alert">
                            {error}
                        </p>
                    )}
                    {helpText && !error && (
                        <p id={helpTextId} className="text-xs text-gray-500">
                            {helpText}
                        </p>
                    )}
                </div>
                {showCharCount && maxLength && (
                    <p className={`text-xs ${charCount > maxLength * 0.9 ? 'text-dorado-nazaret' : 'text-gray-400'}`}>
                        {charCount}/{maxLength}
                    </p>
                )}
            </div>
        </div>
    );
};

export { TextArea };
export default TextArea;
