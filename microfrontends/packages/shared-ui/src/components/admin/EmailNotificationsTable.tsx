import React from 'react';
import Card from '../ui/Card';
import { FiMail, FiTool } from 'react-icons/fi';

interface EmailNotificationsTableProps {
    applicationId?: number;
}

const EmailNotificationsTable: React.FC<EmailNotificationsTableProps> = () => {
    return (
        <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative">
                    <FiMail className="w-24 h-24 text-gray-300" />
                    <FiTool className="w-10 h-10 text-blue-500 absolute -bottom-2 -right-2" />
                </div>

                <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900">
                        En Construcción
                    </h3>
                    <p className="text-gray-600 max-w-md">
                        El módulo de notificaciones por email está actualmente en desarrollo.
                    </p>
                    <p className="text-sm text-gray-500">
                        Pronto podrás gestionar y visualizar todas las notificaciones enviadas por email desde esta sección.
                    </p>
                </div>

                <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-lg">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">
                        Funcionalidades planeadas:
                    </h4>
                    <ul className="text-xs text-blue-800 space-y-1 text-left">
                        <li>• Historial completo de emails enviados</li>
                        <li>• Estado de entrega y lectura</li>
                        <li>• Filtrado por tipo de notificación</li>
                        <li>• Búsqueda por destinatario</li>
                        <li>• Vista previa de contenido</li>
                        <li>• Reenvío de notificaciones</li>
                    </ul>
                </div>
            </div>
        </Card>
    );
};

export default EmailNotificationsTable;
