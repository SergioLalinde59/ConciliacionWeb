import React from 'react'
import * as LucideIcons from 'lucide-react'
import type { LucideProps } from 'lucide-react'

export type IconName = keyof typeof LucideIcons

interface IconProps extends LucideProps {
    name: IconName
    size?: number | string
    className?: string
}

/**
 * Átomo de Icono para estandarizar el uso de Lucide Icons en la app.
 * Sigue los principios de Diseño Atómico.
 */
export const Icon = ({ name, size = 18, className = '', ...props }: IconProps) => {
    const LucideIcon = LucideIcons[name] as React.ElementType

    if (!LucideIcon) {
        console.warn(`Icon "${name}" not found in lucide-react`)
        return null
    }

    return (
        <LucideIcon
            size={size}
            className={`${className}`}
            strokeWidth={2}
            {...props}
        />
    )
}
