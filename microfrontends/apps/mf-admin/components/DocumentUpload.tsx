import React, { useState, useRef } from 'react';
import { documentService, DOCUMENT_TYPES, DocumentUploadRequest, DocumentResponse } from '../services/documentService';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { FileTextIcon, CheckCircleIcon, XCircleIcon, UploadIcon } from './icons/Icons';

interface DocumentUploadProps {
    applicationId: number;
    documentType?: string; // Tipo de documento predefinido
    isReplacement?: boolean; // Si es un reemplazo de documento existente
    onUploadSuccess?: (document: DocumentResponse) => void;
    onUploadError?: (error: string) => void;
    renderTrigger?: (openUpload: () => void) => React.ReactNode; // Botón personalizado
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ 
    applicationId, 
    documentType,
    isReplacement = false,
    onUploadSuccess, 
    onUploadError,
    renderTrigger
}) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedDocumentType, setSelectedDocumentType] = useState<string>(documentType || '');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (file: File) => {
        // Validaciones básicas
        if (file.size > 10 * 1024 * 1024) {
            onUploadError?.('El archivo no puede exceder 10MB');
            return;
        }

        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            onUploadError?.('Solo se permiten archivos PDF, JPG y PNG');
            return;
        }

        setSelectedFile(file);
    };

    const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !selectedDocumentType) {
            onUploadError?.('Seleccione un archivo y tipo de documento');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const request: DocumentUploadRequest = {
                file: selectedFile,
                documentType: selectedDocumentType,
                isRequired: true // Los documentos requeridos se marcan como obligatorios
            };

            // Simular progreso de carga
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 100);

            const response = await documentService.uploadDocument(applicationId, request);
            
            clearInterval(progressInterval);
            setUploadProgress(100);

            if (response.success && response.document) {
                onUploadSuccess?.(response.document);
                setSelectedFile(null);
                setSelectedDocumentType(documentType || ''); // Mantener el tipo si es predefinido
                setShowUploadModal(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            } else {
                throw new Error(response.message || 'Error al subir el documento');
            }

        } catch (error: any) {
            onUploadError?.(error.message || 'Error al subir el documento');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const openUploadModal = () => {
        setShowUploadModal(true);
        setSelectedFile(null);
        setSelectedDocumentType(documentType || '');
    };

    const clearSelection = () => {
        setSelectedFile(null);
        setSelectedDocumentType(documentType || '');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const closeModal = () => {
        setShowUploadModal(false);
        clearSelection();
    };

    const getFileIcon = (file: File) => {
        if (file.type === 'application/pdf') {
            return <FileTextIcon className="w-8 h-8 text-red-500" />;
        } else if (file.type.startsWith('image/')) {
            return <FileTextIcon className="w-8 h-8 text-blue-500" />;
        }
        return <FileTextIcon className="w-8 h-8 text-gray-500" />;
    };

    // Si se proporciona un renderTrigger, solo mostrar el trigger
    if (renderTrigger) {
        return (
            <>
                {renderTrigger(openUploadModal)}
                
                {/* Modal de carga */}
                {showUploadModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-azul-monte-tabor">
                                    {isReplacement ? 'Reemplazar Documento' : 'Subir Documento'}
                                </h3>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-400 hover:text-gray-600"
                                    disabled={isUploading}
                                >
                                    <XCircleIcon className="w-6 h-6" />
                                </button>
                            </div>
                            
                            {documentType && (
                                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        <strong>Tipo de documento:</strong> {DOCUMENT_TYPES[documentType] || documentType}
                                    </p>
                                </div>
                            )}
                            
                            <div className="space-y-6">
                                {/* Área de selección de archivo */}
                                <div
                                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                                        dragActive 
                                            ? 'border-azul-monte-tabor bg-blue-50' 
                                            : 'border-gray-300 hover:border-azul-monte-tabor'
                                    }`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                >
                                    {selectedFile ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-center space-x-3">
                                                {getFileIcon(selectedFile)}
                                                <div className="text-left">
                                                    <p className="font-medium text-azul-monte-tabor">{selectedFile.name}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {documentService.formatFileSize(selectedFile.size)}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={clearSelection}
                                                disabled={isUploading}
                                            >
                                                <XCircleIcon className="w-4 h-4 mr-2" />
                                                Cambiar archivo
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <UploadIcon className="w-12 h-12 text-gray-400 mx-auto" />
                                            <div>
                                                <p className="text-lg font-medium text-gray-700">
                                                    Arrastra un archivo aquí o haz clic para seleccionar
                                                </p>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Archivos permitidos: PDF, JPG, PNG (máx. 10MB)
                                                </p>
                                            </div>
                                            <Button 
                                                variant="outline" 
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                            >
                                                Seleccionar archivo
                                            </Button>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={handleFileInputChange}
                                                className="hidden"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Selector de tipo de documento - solo si no está predefinido */}
                                {!documentType && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tipo de documento
                                        </label>
                                        <select
                                            value={selectedDocumentType}
                                            onChange={(e) => setSelectedDocumentType(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                            disabled={isUploading}
                                        >
                                            <option value="">Seleccionar tipo de documento</option>
                                            {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                                                <option key={key} value={key}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Barra de progreso */}
                                {isUploading && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Subiendo documento...</span>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                                className="bg-azul-monte-tabor h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${uploadProgress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}

                                {/* Botones de acción */}
                                <div className="flex space-x-3">
                                    <Button
                                        variant="primary"
                                        onClick={handleUpload}
                                        disabled={!selectedFile || !selectedDocumentType || isUploading}
                                        className="flex-1"
                                    >
                                        {isUploading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Subiendo...
                                            </>
                                        ) : (
                                            <>
                                                <UploadIcon className="w-4 h-4 mr-2" />
                                                {isReplacement ? 'Reemplazar' : 'Subir'} documento
                                            </>
                                        )}
                                    </Button>
                                    
                                    <Button
                                        variant="outline"
                                        onClick={closeModal}
                                        disabled={isUploading}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Modo tradicional para compatibilidad hacia atrás
    return (
        <div className="space-y-6">
            {/* Área de selección de archivo */}
            <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive 
                        ? 'border-azul-monte-tabor bg-blue-50' 
                        : 'border-gray-300 hover:border-azul-monte-tabor'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {selectedFile ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-center space-x-3">
                            {getFileIcon(selectedFile)}
                            <div className="text-left">
                                <p className="font-medium text-azul-monte-tabor">{selectedFile.name}</p>
                                <p className="text-sm text-gray-500">
                                    {documentService.formatFileSize(selectedFile.size)}
                                </p>
                            </div>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={clearSelection}
                            className="mt-2"
                        >
                            <XCircleIcon className="w-4 h-4 mr-2" />
                            Cambiar archivo
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <UploadIcon className="w-12 h-12 text-gray-400 mx-auto" />
                        <div>
                            <p className="text-lg font-medium text-gray-700">
                                Arrastra un archivo aquí o haz clic para seleccionar
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                Archivos permitidos: PDF, JPG, PNG (máx. 10MB)
                            </p>
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Seleccionar archivo
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileInputChange}
                            className="hidden"
                        />
                    </div>
                )}
            </div>

            {/* Selector de tipo de documento */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de documento
                </label>
                <select
                    value={selectedDocumentType}
                    onChange={(e) => setSelectedDocumentType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                >
                    <option value="">Seleccionar tipo de documento</option>
                    {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Barra de progreso */}
            {isUploading && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Subiendo documento...</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                            className="bg-azul-monte-tabor h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Botones de acción */}
            <div className="flex space-x-3">
                <Button
                    variant="primary"
                    onClick={handleUpload}
                    disabled={!selectedFile || !selectedDocumentType || isUploading}
                    className="flex-1"
                >
                    {isUploading ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Subiendo...
                        </>
                    ) : (
                        <>
                            <UploadIcon className="w-4 h-4 mr-2" />
                            Subir documento
                        </>
                    )}
                </Button>
                
                {selectedFile && (
                    <Button
                        variant="outline"
                        onClick={clearSelection}
                        disabled={isUploading}
                    >
                        Cancelar
                    </Button>
                )}
            </div>
        </div>
    );
};

export default DocumentUpload;