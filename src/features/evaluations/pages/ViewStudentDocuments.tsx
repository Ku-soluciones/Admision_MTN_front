import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../admin/components/ui/Card';
import Button from '../../admin/components/ui/Button';
import Badge from '../../admin/components/ui/Badge';
import {
    ArrowLeftIcon,
    FileTextIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    EyeIcon,
    XMarkIcon
} from '../../admin/components/icons/Icons';
import { interviewService } from '../services/interviewService';
import { documentService } from '../../../packages/shared-ui/src/services/documentService';
import { useNotifications } from '../../admin/context/AppContext';

interface DocumentInfo {
    id: number;
    documentType: string;
    originalName?: string;
    fileName?: string;
    fileSize?: number;
    contentType?: string;
    approvalStatus?: string;
    approval_status?: string;
}

const ViewStudentDocuments: React.FC = () => {
    const { applicationId } = useParams<{ applicationId: string }>();
    const navigate = useNavigate();
    const { addNotification } = useNotifications();
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const [documents, setDocuments] = useState<DocumentInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewingDocument, setViewingDocument] = useState<{id: number, url: string, name: string, contentType?: string} | null>(null);

    useEffect(() => {
        const loadDocuments = async () => {
            if (!applicationId) {
                setError('ID de aplicación no válido');
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);
                const docs = await interviewService.getDocumentsByApplication(parseInt(applicationId));
                setDocuments(docs || []);
            } catch (err: any) {
                setError('Error al cargar los documentos');
                addNotification({
                    type: 'error',
                    title: 'Error',
                    message: 'No se pudieron cargar los documentos'
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadDocuments();
    }, [applicationId, addNotification]);

    const handleViewDocument = async (doc: DocumentInfo) => {
        try {
            const blob = await documentService.viewDocument(doc.id);
            // Convertir blob a base64 data URL para el iframe
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result as string;
                setViewingDocument({
                    id: doc.id,
                    url: dataUrl,
                    name: doc.originalName || doc.fileName || 'Documento',
                    contentType: doc.contentType
                });
            };
            reader.onerror = () => {
                addNotification({
                    type: 'error',
                    title: 'Error',
                    message: 'No se pudo leer el documento'
                });
            };
            reader.readAsDataURL(blob);
        } catch (err) {
            addNotification({
                type: 'error',
                title: 'Error',
                message: 'No se pudo visualizar el documento'
            });
        }
    };

    const handleCloseDocument = () => {
        if (viewingDocument) {
            window.URL.revokeObjectURL(viewingDocument.url);
        }
        setViewingDocument(null);
    };

    const approvedDocs = documents.filter(d =>
        d.approvalStatus === 'APPROVED' || d.approval_status === 'APPROVED'
    );
    const pendingDocs = documents.filter(d =>
        (d.approvalStatus === 'PENDING' || d.approval_status === 'PENDING' || !d.approvalStatus) &&
        d.approvalStatus !== 'REJECTED' && d.approval_status !== 'REJECTED'
    );
    const rejectedDocs = documents.filter(d =>
        d.approvalStatus === 'REJECTED' || d.approval_status === 'REJECTED'
    );

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'APPROVED':
                return <Badge variant="success">Aprobado</Badge>;
            case 'REJECTED':
                return <Badge variant="error">Rechazado</Badge>;
            default:
                return <Badge variant="warning">Pendiente</Badge>;
        }
    };

    // Si estamos viendo un documento en el iframe
    if (viewingDocument) {
        return (
            <div className="bg-gray-50 min-h-screen">
                {/* Header del visor */}
                <div className="bg-white shadow-sm">
                    <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileTextIcon className="w-5 h-5 text-azul-monte-tabor" />
                            <span className="font-medium text-gray-700 truncate max-w-md">
                                {viewingDocument.name}
                            </span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCloseDocument}
                            leftIcon={<XMarkIcon className="w-4 h-4" />}
                        >
                            Cerrar
                        </Button>
                    </div>
                </div>
                {/* Visor de documento */}
                <div className="h-[calc(100vh-60px)] bg-gray-100">
                    <object
                        data={viewingDocument.url}
                        type={viewingDocument.contentType || 'application/pdf'}
                        className="w-full h-full border-0"
                        title={viewingDocument.name}
                    >
                        <div className="flex flex-col items-center justify-center h-full">
                            <FileTextIcon className="w-16 h-16 text-gray-400 mb-4" />
                            <p className="text-gray-600">No se puede visualizar el documento</p>
                            <p className="text-sm text-gray-500 mt-2">El documento puede estar dañado o ser un formato no soportado</p>
                        </div>
                    </object>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen py-8">
            <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => window.close()}
                        className="inline-flex items-center text-azul-monte-tabor hover:text-blue-800 transition-colors mb-4"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        Volver al Dashboard
                    </button>

                    <Card className="p-4 sm:p-6 bg-gradient-to-r from-azul-monte-tabor to-blue-700 text-blanco-pureza">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="bg-blanco-pureza bg-opacity-20 p-4 rounded-full self-start sm:self-auto">
                                <FileTextIcon className="w-10 h-10 sm:w-12 sm:h-12 text-blanco-pureza" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                                    Documentos del Estudiante
                                </h1>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-blue-100">
                                    <p><strong>Total:</strong> {documents.length} documentos</p>
                                    <p><strong>Aprobados:</strong> {approvedDocs.length}</p>
                                    <p><strong>Pendientes:</strong> {pendingDocs.length}</p>
                                </div>
                            </div>
                            <div className="sm:text-right">
                                <div className="text-3xl font-bold text-dorado-nazaret">
                                    {documents.length > 0 ? Math.round((approvedDocs.length / documents.length) * 100) : 0}%
                                </div>
                                <div className="text-blue-100 text-sm">Aprobación</div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azul-monte-tabor mx-auto"></div>
                        <p className="mt-4 text-gray-600">Cargando documentos...</p>
                    </div>
                ) : error ? (
                    <Card className="p-8 text-center">
                        <XCircleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
                        <p className="text-red-600 mb-4">{error}</p>
                        <Button variant="primary" onClick={() => window.close()}>
                            Volver al Dashboard
                        </Button>
                    </Card>
                ) : documents.length === 0 ? (
                    <Card className="p-8 text-center">
                        <FileTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 mb-2">
                            No hay documentos
                        </h3>
                        <p className="text-gray-500">
                            Este estudiante aún no tiene documentos cargados o validados.
                        </p>
                        <Button variant="outline" onClick={() => window.close()} className="mt-4">
                            Volver al Dashboard
                        </Button>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Lista de Documentos */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Documentos Aprobados */}
                            {approvedDocs.length > 0 && (
                                <Card className="p-6">
                                    <h2 className="text-xl font-bold text-azul-monte-tabor mb-4 flex items-center gap-2">
                                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                        Documentos Aprobados ({approvedDocs.length})
                                    </h2>
                                    <div className="space-y-4">
                                        {approvedDocs.map((doc) => (
                                            <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                                        <div className="bg-green-100 p-2 rounded-lg flex-shrink-0">
                                                            <FileTextIcon className="w-5 h-5 text-green-600" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="font-semibold text-azul-monte-tabor">
                                                                {documentService.getDocumentTypeLabel(doc.documentType)}
                                                            </h3>
                                                            <p className="text-sm text-gray-500 break-all">
                                                                {doc.originalName || doc.fileName || 'Sin nombre'}
                                                            </p>
                                                            {doc.fileSize && (
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    {documentService.formatFileSize(doc.fileSize)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 flex-shrink-0">
                                                        {getStatusBadge(doc.approvalStatus || doc.approval_status)}
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            onClick={() => handleViewDocument(doc)}
                                                            leftIcon={<EyeIcon className="w-4 h-4" />}
                                                        >
                                                            Ver
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {/* Documentos Pendientes */}
                            {pendingDocs.length > 0 && (
                                <Card className="p-6">
                                    <h2 className="text-xl font-bold text-azul-monte-tabor mb-4 flex items-center gap-2">
                                        <ClockIcon className="w-5 h-5 text-yellow-500" />
                                        Documentos Pendientes ({pendingDocs.length})
                                    </h2>
                                    <div className="space-y-4">
                                        {pendingDocs.map((doc) => (
                                            <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                                        <div className="bg-yellow-100 p-2 rounded-lg flex-shrink-0">
                                                            <FileTextIcon className="w-5 h-5 text-yellow-600" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="font-semibold text-azul-monte-tabor">
                                                                {documentService.getDocumentTypeLabel(doc.documentType)}
                                                            </h3>
                                                            <p className="text-sm text-gray-500 break-all">
                                                                {doc.originalName || doc.fileName || 'Sin nombre'}
                                                            </p>
                                                            {doc.fileSize && (
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    {documentService.formatFileSize(doc.fileSize)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 flex-shrink-0">
                                                        {getStatusBadge(doc.approvalStatus || doc.approval_status)}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleViewDocument(doc)}
                                                            leftIcon={<EyeIcon className="w-4 h-4" />}
                                                        >
                                                            Ver
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {/* Documentos Rechazados */}
                            {rejectedDocs.length > 0 && (
                                <Card className="p-6">
                                    <h2 className="text-xl font-bold text-azul-monte-tabor mb-4 flex items-center gap-2">
                                        <XCircleIcon className="w-5 h-5 text-red-500" />
                                        Documentos Rechazados ({rejectedDocs.length})
                                    </h2>
                                    <div className="space-y-4">
                                        {rejectedDocs.map((doc) => (
                                            <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                                        <div className="bg-red-100 p-2 rounded-lg flex-shrink-0">
                                                            <FileTextIcon className="w-5 h-5 text-red-600" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="font-semibold text-azul-monte-tabor">
                                                                {documentService.getDocumentTypeLabel(doc.documentType)}
                                                            </h3>
                                                            <p className="text-sm text-gray-500 break-all">
                                                                {doc.originalName || doc.fileName || 'Sin nombre'}
                                                            </p>
                                                            {doc.fileSize && (
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    {documentService.formatFileSize(doc.fileSize)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 flex-shrink-0">
                                                        {getStatusBadge(doc.approvalStatus || doc.approval_status)}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleViewDocument(doc)}
                                                            leftIcon={<EyeIcon className="w-4 h-4" />}
                                                        >
                                                            Ver
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Resumen */}
                            <Card className="p-6">
                                <h3 className="text-lg font-bold text-azul-monte-tabor mb-4">
                                    Resumen
                                </h3>
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-azul-monte-tabor">
                                            {documents.length}
                                        </div>
                                        <div className="text-sm text-gray-500">Total Documentos</div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <div className="text-xl font-bold text-green-600">{approvedDocs.length}</div>
                                            <div className="text-xs text-gray-500">Aprobados</div>
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold text-yellow-600">{pendingDocs.length}</div>
                                            <div className="text-xs text-gray-500">Pendientes</div>
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold text-red-600">{rejectedDocs.length}</div>
                                            <div className="text-xs text-gray-500">Rechazados</div>
                                        </div>
                                    </div>
                                    {documents.length > 0 && (
                                        <div className="pt-4 border-t border-gray-200">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-gray-600">Progreso de aprobación</span>
                                                <span className="text-sm font-semibold text-azul-monte-tabor">
                                                    {Math.round((approvedDocs.length / documents.length) * 100)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full transition-all"
                                                    style={{ width: `${(approvedDocs.length / documents.length) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Leyenda */}
                            <Card className="p-6">
                                <h3 className="text-lg font-bold text-azul-monte-tabor mb-3">
                                    Estados
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                        <span className="text-sm text-gray-600">Aprobado - Documento validado</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ClockIcon className="w-4 h-4 text-yellow-500" />
                                        <span className="text-sm text-gray-600">Pendiente - En revisión</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <XCircleIcon className="w-4 h-4 text-red-500" />
                                        <span className="text-sm text-gray-600">Rechazado - No válido</span>
                                    </div>
                                </div>
                            </Card>

                            {/* Acciones */}
                            <Card className="p-6">
                                <h3 className="text-lg font-bold text-azul-monte-tabor mb-4">
                                    Acciones
                                </h3>
                                <div className="space-y-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => window.close()}
                                        leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
                                    >
                                        Volver al Dashboard
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ViewStudentDocuments;
