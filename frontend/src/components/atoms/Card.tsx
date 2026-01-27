import React from 'react'

interface CardProps {
    children: React.ReactNode
    className?: string
    noPadding?: boolean
}

export const Card = ({ children, className = '', noPadding = false }: CardProps) => {
    return (
        <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
            <div className={noPadding ? '' : 'p-6'}>
                {children}
            </div>
        </div>
    )
}
