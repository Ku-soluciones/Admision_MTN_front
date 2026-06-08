
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', ...rest }) => {
    return (
        <div
            className={`bg-blanco-pureza rounded-xl shadow-lg overflow-hidden transition-shadow hover:shadow-2xl ${className}`}
            {...rest}
        >
            {children}
        </div>
    );
};

export default Card;
