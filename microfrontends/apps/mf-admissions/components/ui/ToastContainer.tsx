import React from 'react';
import Toast from './Toast';
import { useNotifications } from '../../context/AppContext';

const ToastContainer: React.FC = () => {
    const { notifications, markAsRead } = useNotifications();
    
    const handleClose = (id: string) => {
        markAsRead(id);
    };

    return (
        <div className="fixed top-0 left-1/2 transform -translate-x-1/2 z-50 p-4">
            {notifications
                .filter(notification => !notification.read)
                .slice(0, 1) // Show only 1 toast at a time
                .map((notification) => (
                    <Toast
                        key={notification.id}
                        id={notification.id}
                        type={notification.type}
                        title={notification.title}
                        message={notification.message}
                        onClose={handleClose}
                    />
                ))
            }
        </div>
    );
};

export default ToastContainer;