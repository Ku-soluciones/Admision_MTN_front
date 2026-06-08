import React, { useEffect, useState } from 'react';
import SimpleToast from './SimpleToast';
import { NOTIFY_EVENT_NAME, NotifyDetail } from '../../utils/notify';

interface ToastItem {
    id: number;
    message: string;
    type: 'success' | 'error';
    duration: number;
}

/**
 * Host global que escucha el evento `mtn:notify` y renderiza toasts.
 * Debe montarse una sola vez por shell (ej. dentro del componente raíz).
 */
const GlobalToastHost: React.FC = () => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<NotifyDetail>).detail;
            if (!detail || !detail.message) return;
            // Mapear "info" a "success" porque SimpleToast solo soporta success/error
            const type: 'success' | 'error' = detail.type === 'error' ? 'error' : 'success';
            const id = Date.now() + Math.random();
            const duration = detail.duration ?? 5000;
            setToasts((prev) => [...prev, { id, message: detail.message, type, duration }]);
        };

        window.addEventListener(NOTIFY_EVENT_NAME, handler);
        return () => window.removeEventListener(NOTIFY_EVENT_NAME, handler);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="pointer-events-none">
            {toasts.map((t, idx) => (
                <div
                    key={t.id}
                    className="pointer-events-auto"
                    style={{ position: 'fixed', top: 16 + idx * 80, right: 16, zIndex: 9999 }}
                >
                    <SimpleToast
                        message={t.message}
                        type={t.type}
                        duration={t.duration}
                        onClose={() =>
                            setToasts((prev) => prev.filter((x) => x.id !== t.id))
                        }
                    />
                </div>
            ))}
        </div>
    );
};

export default GlobalToastHost;

