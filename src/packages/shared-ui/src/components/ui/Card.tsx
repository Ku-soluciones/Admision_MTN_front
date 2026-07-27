
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', ...rest }) => {
    return (
        <div
            className={`overflow-hidden rounded-xl border border-gray-200 bg-blanco-pureza ${className}`}
            {...rest}
        >
            {children}
        </div>
    );
};

export default Card;
