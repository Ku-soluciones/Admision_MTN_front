import React, { useEffect, useId, useRef } from 'react';
import { XCircleIcon } from '../icons/Icons';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'max';
    showCloseButton?: boolean;
    closeDisabled?: boolean;
    contentClassName?: string;
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    closeDisabled = false,
    contentClassName = 'p-6'
}) => {
    const titleId = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const previouslyFocusedRef = useRef<HTMLElement | null>(null);
    const onCloseRef = useRef(onClose);
    const closeDisabledRef = useRef(closeDisabled);

    useEffect(() => {
        onCloseRef.current = onClose;
        closeDisabledRef.current = closeDisabled;
    });
    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        max: 'max-w-7xl'
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !closeDisabledRef.current) {
                onCloseRef.current();
                return;
            }

            if (event.key !== 'Tab' || !panelRef.current) return;

            const focusable = Array.from(
                panelRef.current.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            ).filter((element) => !element.hasAttribute('aria-hidden'));

            if (focusable.length === 0) {
                event.preventDefault();
                panelRef.current.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        if (isOpen) {
            previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
            document.addEventListener('keydown', handleKeyDown);
            window.requestAnimationFrame(() => {
                (closeButtonRef.current || panelRef.current)?.focus();
            });
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            previouslyFocusedRef.current?.focus();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
        >
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onMouseDown={(e) => {
                    // Solo cerrar si el clic es directamente en el overlay, no en elementos hijos
                    if (e.target === e.currentTarget) {
                        if (!closeDisabled) onClose();
                    }
                }}
                aria-hidden="true"
            />
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    ref={panelRef}
                    tabIndex={-1}
                    className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-xl bg-blanco-pureza shadow-2xl outline-none ${sizeClasses[size]}`}
                    onClick={(e) => e.stopPropagation()}
                    role="document"
                >
                    {(title || showCloseButton) && (
                        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-6">
                            {title && (
                                <h2
                                    id={titleId}
                                    className="text-xl font-bold tracking-[-0.02em] text-azul-monte-tabor sm:text-2xl"
                                >
                                    {title}
                                </h2>
                            )}
                            {showCloseButton && (
                                <button
                                    ref={closeButtonRef}
                                    onClick={onClose}
                                    disabled={closeDisabled}
                                    className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gris-piedra transition-colors hover:bg-gray-100 hover:text-azul-monte-tabor focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-monte-tabor focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="Cerrar modal"
                                    type="button"
                                >
                                    <XCircleIcon className="w-6 h-6" aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    )}
                    <div className={`min-h-0 overflow-y-auto ${contentClassName}`}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export { Modal };
export default Modal;
