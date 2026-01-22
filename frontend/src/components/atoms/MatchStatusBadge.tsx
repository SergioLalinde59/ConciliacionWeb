
import { Badge } from './Badge'
import { MatchEstado } from '../../types/Matching'

interface MatchStatusBadgeProps {
    estado: MatchEstado
    className?: string
    size?: 'sm' | 'md'
}

/**
 * Badge especializado para mostrar el estado de una vinculación de matching
 * 
 * Utiliza colores específicos para cada estado:
 * - EXACTO: Verde (emerald) - Match perfecto
 * - PROBABLE: Amarillo (amber) - Match probable
 * - SIN_MATCH: Gris (neutral) - Sin match encontrado
 * - MANUAL: Azul (blue) - Vinculación manual por usuario
 * - IGNORADO: Rojo claro (rose) - Movimiento ignorado
 */
export const MatchStatusBadge = ({
    estado,
    className = '',
    size = 'md'
}: MatchStatusBadgeProps) => {
    const getVariantAndText = () => {
        switch (estado) {
            case MatchEstado.EXACTO:
                return {
                    variant: 'success' as const,
                    text: 'Exacto',
                    icon: '✓'
                }
            case MatchEstado.PROBABLE:
                return {
                    variant: 'warning' as const,
                    text: 'Probable',
                    icon: '~'
                }
            case MatchEstado.SIN_MATCH:
                return {
                    variant: 'neutral' as const,
                    text: 'Sin Match',
                    icon: '○'
                }
            case MatchEstado.MANUAL:
                return {
                    variant: 'info' as const,
                    text: 'Manual',
                    icon: '✎'
                }
            case MatchEstado.IGNORADO:
                return {
                    variant: 'error' as const,
                    text: 'Ignorado',
                    icon: '✕'
                }
            default:
                return {
                    variant: 'neutral' as const,
                    text: estado,
                    icon: ''
                }
        }
    }

    const { variant, text, icon } = getVariantAndText()

    return (
        <Badge
            variant={variant}
            size={size}
            className={className}
        >
            <span className="flex items-center gap-1">
                <span className="font-semibold">{icon}</span>
                <span>{text}</span>
            </span>
        </Badge>
    )
}
