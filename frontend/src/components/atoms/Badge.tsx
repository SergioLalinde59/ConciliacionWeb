import React from 'react'

interface BadgeProps {
    children: React.ReactNode
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
    className?: string
    size?: 'sm' | 'md'
}

export const Badge = ({
    children,
    variant = 'default',
    className = '',
    size = 'md'
}: BadgeProps) => {
    const variants = {
        default: "bg-gray-100 text-gray-700",
        success: "bg-emerald-50 text-emerald-700 border border-emerald-100",
        warning: "bg-amber-50 text-amber-700 border border-amber-100",
        error: "bg-rose-50 text-rose-700 border border-rose-100",
        info: "bg-blue-50 text-blue-700 border border-blue-100",
        neutral: "bg-gray-50 text-gray-600 border border-gray-100"
    }

    const sizes = {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-1 text-sm"
    }

    return (
        <span className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}>
            {children}
        </span>
    )
}
