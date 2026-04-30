import React, { useState, useEffect } from 'react';
import { documentService, DocumentResponse } from '../services/documentService';
import Button from './ui/Button';
import { FileTextIcon, DownloadIcon, XCircleIcon, EyeIcon, ExpandIcon, CompressIcon } from './icons/Icons';

interface DocumentViewerProps {
    document: DocumentResponse;
    onClose?: () => void;
    onDelete?: (documentId: number) => void;
    allowFullscreen?: boolean;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ 
    document, 
    onClose, 
    onDelete,
    allowFullscreen = true
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [documentUrl, setDocumentUrl] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        loadDocument();
        return () => {
            // Limpiar URL temporal al desmontar
            if (documentUrl) {
                URL.revokeObjectURL(documentUrl);
            }
        };
    }, [document.id]);

    // Manejar teclas para pantalla completa
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
            if (event.key === 'f' || event.key === 'F') {
                setIsFullscreen(!isFullscreen);
            }
        };

        if (isFullscreen) {
            document.addEventListener('keydown', handleKeyPress);
            // Prevenir scroll del body cuando está en fullscreen
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyPress);
            document.body.style.overflow = 'unset';
        };
    }, [isFullscreen]);

    const loadDocument = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const blob = await documentService.viewDocument(document.id);
            const url = URL.createObjectURL(blob);
            setDocumentUrl(url);
        } catch (err: any) {
            setError(err.message || 'Error al cargar el documento');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async () => {
        try {
            await documentService.downloadDocument(document.id, document.originalName);
        } catch (err: any) {
            setError(err.message || 'Error al descargar el documento');
        }
    };

    const handleDelete = async () => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este documento?')) {
            try {
                await documentService.deleteDocument(document.id);
                onDelete?.(document.id);
                onClose?.();
            } catch (err: any) {
                setError(err.message || 'Error al eliminar el documento');
            }
        }
    };

    const renderDocumentContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azul-monte-tabor mx-auto mb-4"></div>
                        <p className="text-gray-600">Cargando documento...</p>
                    </div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <p className="text-red-600 mb-4">{error}</p>
                        <Button variant="outline" onClick={loadDocument}>
                            Reintentar
                        </Button>
                    </div>
                </div>
            );
        }

        if (!documentUrl) {
            return (
                <div className="flex items-center justify-center h-96">
                    <p className="text-gray-600">No se pudo cargar el documento</p>
                </div>
            );
        }

        // Mostrar PDF
        if (documentService.isPdfFile(document.contentType)) {
            return (
                <div className={isFullscreen ? "w-full h-[calc(100vh-120px)]" : "w-full h-96"}>
                    <iframe
                        src={documentUrl}
                        className="w-full h-full border rounded-lg"
                        title={document.originalName}
                    />
                </div>
            );
        }

        // Mostrar imagen
        if (documentService.isImageFile(document.contentType)) {
            return (
                <div className="flex justify-center">
                    <img
                        src={documentUrl}
                        alt={document.originalName}
                        className={isFullscreen 
                            ? "max-w-full max-h-[calc(100vh-120px)] object-contain border rounded-lg" 
                            : "max-w-full max-h-96 object-contain border rounded-lg"
                        }
                    />
                </div>
            );
        }

        // Tipo de archivo no soportado para visualización
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <FileTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                        Vista previa no disponible para este tipo de archivo
                    </p>
                    <Button variant="primary" onClick={handleDownload}>
                        <DownloadIcon className="w-4 h-4 mr-2" />
                        Descargar archivo
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className={`bg-white rounded-lg shadow-lg ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center space-x-3">
                    <FileTextIcon className="w-6 h-6 text-azul-monte-tabor" />
                    <div>
                        <h3 className="text-lg font-semibold text-azul-monte-tabor">
                            {document.originalName}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {documentService.getDocumentTypeLabel(document.documentType)} • {' '}
                            {documentService.formatFileSize(document.fileSize)} • {' '}
                            {new Date(document.createdAt).toLocaleDateString('es-CL')}
                        </p>
                    </div>
                </div>
                
                <div className="flex space-x-2">
                    {allowFullscreen && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            title={isFullscreen ? "Salir de pantalla completa (Esc)" : "Ver en pantalla completa (F)"}
                        >
                            {isFullscreen ? <CompressIcon className="w-4 h-4" /> : <ExpandIcon className="w-4 h-4" />}
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleDownload} title="Descargar documento">
                        <DownloadIcon className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700" title="Eliminar documento">
                        <XCircleIcon className="w-4 h-4" />
                    </Button>
                    {onClose && (
                        <Button variant="outline" size="sm" onClick={onClose}>
                            Cerrar
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {renderDocumentContent()}
            </div>
        </div>
    );
};

export default DocumentViewer;