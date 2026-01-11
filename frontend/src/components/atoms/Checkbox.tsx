import React from 'react'

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
}

export const Checkbox = ({ label, error, className = '', ...props }: CheckboxProps) => {
    return (
        <label className={`flex items-center gap-2 cursor-pointer group select-none ${className}`}>
            <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors cursor-pointer"
                {...props}
            />
            {label && (
                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                    {label}
                </span>
            )}
            {error && <span className="text-xs text-rose-500">{error}</span>}
        </label>
    )
}
