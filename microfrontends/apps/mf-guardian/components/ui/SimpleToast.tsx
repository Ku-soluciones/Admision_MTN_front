import React, { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon } from '../icons/Icons';

interface SimpleToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

const SimpleToast: React.FC<SimpleToastProps> = ({ 
  message, 
  type, 
  onClose, 
  duration = 5000 
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-full duration-300">
      <div className={`
        flex items-center p-4 mb-4 border rounded-lg shadow-lg max-w-xs
        ${getColors()}
      `}>
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 text-sm font-medium flex-1">
          {message}
        </div>
        <button
          onClick={onClose}
          className="ml-3 -mx-1.5 -my-1.5 rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
        >
          <XCircleIcon className="w-4 h-4 opacity-60" />
        </button>
      </div>
    </div>
  );
};

export default SimpleToast;