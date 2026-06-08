import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '../icons/Icons';

interface ToastProps {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
    onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ 
    id, 
    type, 
    title, 
    message, 
    duration = 5000, 
    onClose 
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        // Trigger entrance animation
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                handleClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration]);

    const handleClose = () => {
        setIsLeaving(true);
        setTimeout(() => {
            onClose(id);
        }, 300);
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircleIcon className="w-5 h-5 text-verde-esperanza" />;
            case 'error':
                return <XCircleIcon className="w-5 h-5 text-rojo-sagrado" />;
            case 'warning':
                return <ClockIcon className="w-5 h-5 text-dorado-nazaret" />;
            case 'info':
                return <ClockIcon className="w-5 h-5 text-azul-monte-tabor" />;
            default:
                return null;
        }
    };

    const getColors = () => {
        switch (type) {
            case 'success':
                return 'bg-green-50 border-verde-esperanza';
            case 'error':
                return 'bg-red-50 border-rojo-sagrado';
            case 'warning':
                return 'bg-yellow-50 border-dorado-nazaret';
            case 'info':
                return 'bg-blue-50 border-azul-monte-tabor';
            default:
                return 'bg-gray-50 border-gray-300';
        }
    };

    return (
        <div
            className={`
                fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-96 max-w-[90vw]
                transition-all duration-300 ease-in-out
                ${isVisible && !isLeaving ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
            `}
        >
            <div className={`
                rounded-lg border-l-4 p-4 shadow-xl bg-blanco-pureza
                ${getColors()}
                backdrop-blur-sm
            `}>
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        {getIcon()}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                            {title}
                        </p>
                        <p className="mt-1 text-sm text-gris-piedra break-words">
                            {message}
                        </p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                        <button
                            className="bg-blanco-pureza rounded-md inline-flex text-gris-piedra hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor p-1"
                            onClick={handleClose}
                        >
                            <XCircleIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Toast;