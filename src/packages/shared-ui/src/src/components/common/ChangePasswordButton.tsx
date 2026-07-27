/**
 * Change Password Button Component
 *
 * Self-service password change button for all users
 * Opens ChangePasswordModal when clicked
 */

import React, { useState } from 'react';
import ChangePasswordModal from './ChangePasswordModal';

interface ChangePasswordButtonProps {
  className?: string;
  variant?: 'primary' | 'outline' | 'text';
}

const ChangePasswordButton: React.FC<ChangePasswordButtonProps> = ({
  className = '',
  variant = 'outline'
}) => {
  const [showModal, setShowModal] = useState(false);

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';

    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700`;
      case 'outline':
        return `${baseClasses} border border-gray-300 text-gray-700 bg-white hover:bg-gray-50`;
      case 'text':
        return `${baseClasses} text-blue-600 hover:text-blue-700 hover:bg-blue-50`;
      default:
        return baseClasses;
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`${getButtonClasses()} ${className}`}
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
        Cambiar Contraseña
      </button>

      <ChangePasswordModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
};

export default ChangePasswordButton;
