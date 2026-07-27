import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from './Button';

export interface ConfirmDialogProps {
    isOpen: boolean;
    title?: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary' | 'warning';
    onConfirm: () => void;
    onClose: () => void;
    isLoading?: boolean;
}

/**
 * Reemplazo accesible para `window.confirm`.
 * Usa el Modal compartido de la app y los botones consistentes con el design system.
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title = 'Confirmar acción',
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'primary',
    onConfirm,
    onClose,
    isLoading = false,
}) => {
    const buttonVariant: 'primary' | 'danger' | 'secondary' =
        variant === 'danger' ? 'danger' : variant === 'warning' ? 'secondary' : 'primary';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="space-y-4">
                <div className="text-sm text-gray-700 whitespace-pre-line">{message}</div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        {cancelText}
                    </Button>
                    <Button
                        variant={buttonVariant}
                        onClick={onConfirm}
                        isLoading={isLoading}
                        loadingText="Procesando…"
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export interface PromptDialogProps {
    isOpen: boolean;
    title?: string;
    message: React.ReactNode;
    placeholder?: string;
    initialValue?: string;
    inputType?: 'text' | 'email' | 'number' | 'password';
    confirmText?: string;
    cancelText?: string;
    onConfirm: (value: string) => void;
    onClose: () => void;
    validate?: (value: string) => string | null;
}

/**
 * Reemplazo accesible para `window.prompt`.
 */
export const PromptDialog: React.FC<PromptDialogProps> = ({
    isOpen,
    title = 'Ingrese un valor',
    message,
    placeholder,
    initialValue = '',
    inputType = 'text',
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    onConfirm,
    onClose,
    validate,
}) => {
    const [value, setValue] = useState(initialValue);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
            setError(null);
        }
    }, [isOpen, initialValue]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate) {
            const validationError = validate(value);
            if (validationError) {
                setError(validationError);
                return;
            }
        }
        onConfirm(value);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <form onSubmit={handleSubmit} className="space-y-4">
                {message && <div className="text-sm text-gray-700">{message}</div>}
                <input
                    type={inputType}
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        if (error) setError(null);
                    }}
                    placeholder={placeholder}
                    autoFocus
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                />
                {error && <p className="text-xs text-red-600">{error}</p>}
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                        {cancelText}
                    </Button>
                    <Button type="submit">{confirmText}</Button>
                </div>
            </form>
        </Modal>
    );
};

export { ConfirmDialog };
export default ConfirmDialog;


