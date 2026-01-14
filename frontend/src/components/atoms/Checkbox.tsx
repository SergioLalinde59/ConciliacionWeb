import React from 'react'

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ label, error, className = '', ...props }, ref) => {
    return (
        <label className={`flex items-center gap-2.5 cursor-pointer group select-none ${className}`}>
            <div className="relative flex items-center">
                <input
                    ref={ref}
                    type="checkbox"
                    className="
                        peer appearance-none w-4.5 h-4.5 border-2 border-gray-300 rounded 
                        checked:bg-blue-600 checked:border-blue-600
                        focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600
                        transition-all duration-200 ease-in-out cursor-pointer
                    "
                    {...props}
                />
                <svg
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            </div>

            {label && (
                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                    {label}
                </span>
            )}
            {error && <span className="text-xs text-rose-500 ml-1">{error}</span>}
        </label>
    )
})

Checkbox.displayName = 'Checkbox'
