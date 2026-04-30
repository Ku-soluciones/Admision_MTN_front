
import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    isLoading?: boolean;
    loadingText?: string;
    ariaLabel?: string;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    leftIcon,
    rightIcon,
    isLoading = false,
    loadingText,
    className,
    disabled,
    ariaLabel,
    ...props
}) => {
    const baseClasses = 'inline-flex items-center justify-center font-bold rounded-lg shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variantClasses = {
        primary: 'bg-dorado-nazaret text-azul-monte-tabor hover:bg-amber-500 focus:ring-dorado-nazaret disabled:bg-gray-300 disabled:text-gray-500',
        secondary: 'bg-azul-monte-tabor text-blanco-pureza hover:bg-blue-800 focus:ring-azul-monte-tabor disabled:bg-gray-300 disabled:text-gray-500',
        outline: 'bg-transparent border-2 border-azul-monte-tabor text-azul-monte-tabor hover:bg-azul-monte-tabor hover:text-blanco-pureza focus:ring-azul-monte-tabor disabled:border-gray-300 disabled:text-gray-500',
        danger: 'bg-rojo-sagrado text-blanco-pureza hover:bg-red-700 focus:ring-rojo-sagrado disabled:bg-gray-300 disabled:text-gray-500',
        success: 'bg-verde-esperanza text-blanco-pureza hover:bg-green-700 focus:ring-verde-esperanza disabled:bg-gray-300 disabled:text-gray-500',
        ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-300 disabled:text-gray-400 shadow-none',
    };

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-5 py-2.5 text-base',
        lg: 'px-8 py-3 text-lg',
    };

    const isDisabled = disabled || isLoading;
    const displayText = isLoading && loadingText ? loadingText : children;

    return (
        <button
            type="button"
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`}
            disabled={isDisabled}
            aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
            aria-busy={isLoading}
            aria-disabled={isDisabled}
            {...props}
        >
            {isLoading && (
                <LoadingSpinner 
                    size="sm" 
                    color={variant === 'primary' ? 'secondary' : 'white'}
                    className="mr-2" 
                />
            )}
            {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
            {displayText}
            {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
        </button>
    );
};

export { Button };
export default Button;