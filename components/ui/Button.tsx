
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
    const baseClasses = 'inline-flex items-center justify-center font-bold rounded-lg shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 hover:-translate-y-0.5 active:translate-y-0';

    const variantClasses = {
        primary: 'bg-azul-monte-tabor text-white hover:bg-blue-900 hover:shadow-lg focus:ring-azul-monte-tabor disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:translate-y-0',
        secondary: 'bg-dorado-nazaret text-azul-monte-tabor hover:bg-amber-600 hover:shadow-lg focus:ring-dorado-nazaret disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:translate-y-0',
        outline: 'bg-transparent border-2 border-azul-monte-tabor text-azul-monte-tabor hover:bg-azul-monte-tabor/5 focus:ring-azul-monte-tabor disabled:border-gray-300 disabled:text-gray-500 disabled:hover:translate-y-0',
        danger: 'bg-rojo-sagrado text-blanco-pureza hover:bg-red-700 hover:shadow-lg focus:ring-rojo-sagrado disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:translate-y-0',
        success: 'bg-verde-esperanza text-blanco-pureza hover:bg-green-700 hover:shadow-lg focus:ring-verde-esperanza disabled:bg-gray-300 disabled:text-gray-500 disabled:hover:translate-y-0',
        ghost: 'bg-transparent text-azul-monte-tabor hover:bg-gray-100 focus:ring-gray-300 disabled:text-gray-400 shadow-none disabled:hover:translate-y-0',
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