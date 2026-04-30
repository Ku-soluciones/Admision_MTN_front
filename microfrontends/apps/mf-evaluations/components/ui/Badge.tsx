import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const Badge: React.FC<BadgeProps> = ({ 
    children, 
    variant = 'neutral', 
    size = 'md',
    className = ''
}) => {
    const baseClasses = 'inline-flex items-center font-semibold rounded-full';

    const variantClasses = {
        success: 'bg-verde-esperanza text-blanco-pureza',
        warning: 'bg-dorado-nazaret text-azul-monte-tabor',
        error: 'bg-rojo-sagrado text-blanco-pureza',
        info: 'bg-azul-monte-tabor text-blanco-pureza',
        neutral: 'bg-gray-200 text-gris-piedra'
    };

    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1 text-sm',
        lg: 'px-4 py-2 text-base'
    };

    return (
        <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
            {children}
        </span>
    );
};

export { Badge };
export default Badge;