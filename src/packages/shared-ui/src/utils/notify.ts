/**
 * Bus global de notificaciones para reemplazar window.alert / window.confirm
 * en código que no vive dentro del árbol de React (servicios, interceptores, etc.).
 *
 * Uso:
 *   notify.success('Guardado correctamente');
 *   notify.error('Algo salió mal');
 *   notify.info('Procesando...');
 *
 * El componente <GlobalToastHost /> debe estar montado en el shell para
 * renderizar los toasts emitidos.
 */

export type NotifyType = 'success' | 'error' | 'info';

export interface NotifyDetail {
    message: string;
    type: NotifyType;
    duration?: number;
}

const EVENT_NAME = 'mtn:notify';

function emit(detail: NotifyDetail) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<NotifyDetail>(EVENT_NAME, { detail }));
}

export const notify = {
    success: (message: string, duration?: number) =>
        emit({ message, type: 'success', duration }),
    error: (message: string, duration?: number) =>
        emit({ message, type: 'error', duration }),
    info: (message: string, duration?: number) =>
        emit({ message, type: 'info', duration }),
};

export const NOTIFY_EVENT_NAME = EVENT_NAME;

