import React from 'react';
import { XCircle, X } from 'lucide-react';
import Button from './Button';

interface ErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
    errors?: string[];
}

const ErrorModal: React.FC<ErrorModalProps> = ({
    isOpen,
    onClose,
    title = '⚠️ Error en la Postulación',
    message,
    errors = []
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <XCircle className="w-8 h-8 text-white" />
                        <h2 className="text-xl font-bold text-white">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                    <p className="text-gray-700 text-base mb-4">
                        {message}
                    </p>

                    {errors.length > 0 && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                            <h3 className="font-semibold text-red-800 mb-2">
                                Problemas detectados:
                            </h3>
                            <ul className="list-disc list-inside space-y-1">
                                {errors.map((error, index) => (
                                    <li key={index} className="text-red-700 text-sm">
                                        {error}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="mt-6 flex gap-3 justify-end">
                        <Button
                            variant="primary"
                            onClick={onClose}
                            className="min-w-[120px]"
                        >
                            Entendido
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ErrorModal;
