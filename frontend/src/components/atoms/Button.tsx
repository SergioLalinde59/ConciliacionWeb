import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'ghost-danger' | 'warning' | 'ghost-warning'
    size?: 'sm' | 'md' | 'lg'
    isLoading?: boolean
    icon?: React.ElementType
}

export const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    icon: Icon,
    className = '',
    disabled,
    ...props
}: ButtonProps) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"



    // Fix for outline variant to match existing simplified style if needed, but 'secondary' covers strict outline usually. 
    // Let's refine specific variants to match standard web app needs.
    const refinedVariants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 focus:ring-blue-500 active:translate-y-0",
        secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:text-gray-900 shadow-sm focus:ring-gray-200",
        outline: "bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300",
        ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200",
        danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm hover:shadow-md focus:ring-rose-500",
        'ghost-danger': "text-rose-500 hover:bg-rose-50 hover:text-rose-700 active:bg-rose-100",
        warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm hover:shadow-md focus:ring-amber-500",
        'ghost-warning': "text-amber-600 hover:bg-amber-50 hover:text-amber-700 active:bg-amber-100"
    }

    const sizes = {
        sm: "px-2 py-1 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base"
    }

    return (
        <button
            className={`${baseStyles} ${refinedVariants[variant as keyof typeof refinedVariants]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {!isLoading && Icon && <Icon size={size === 'sm' ? 14 : size === 'md' ? 18 : 20} strokeWidth={2} />}
            {children}
        </button>
    )
}
