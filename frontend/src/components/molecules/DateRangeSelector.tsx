import { Calendar } from 'lucide-react'
import { Input } from '../atoms/Input'
import { Button } from '../atoms/Button'
import {
    getMesActual,
    getMesAnterior,
    getUltimos3Meses,
    getUltimos6Meses,
    getAnioYTD,
    getAnioAnterior,
    getUltimos12Meses
} from '../../utils/dateUtils'

interface DateRangeProps {
    onDesdeChange: (val: string) => void
    onHastaChange: (val: string) => void
}

interface DateRangeInputProps extends DateRangeProps {
    desde: string
    hasta: string
}

export const DateRangeButtons = ({ onDesdeChange, onHastaChange }: DateRangeProps) => {
    const setRango = (rango: { inicio: string, fin: string }) => {
        onDesdeChange(rango.inicio)
        onHastaChange(rango.fin)
    }

    const buttons = [
        { label: 'Mes Actual', action: getMesActual },
        { label: 'Mes Ant.', action: getMesAnterior },
        { label: 'Últ. 3 Meses', action: getUltimos3Meses },
        { label: 'Últ. 6 Meses', action: getUltimos6Meses },
        { label: 'YTD', action: getAnioYTD },
        { label: 'Año Ant.', action: getAnioAnterior },
        { label: '12 Meses', action: getUltimos12Meses }
    ]

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {buttons.map((btn) => (
                <Button
                    key={btn.label}
                    variant="secondary"
                    size="sm"
                    onClick={() => setRango(btn.action())}
                    className="bg-gray-50 border border-gray-200 hover:bg-gray-100 font-normal text-xs px-3"
                >
                    {btn.label}
                </Button>
            ))}
        </div>
    )
}

export const DateRangeInputs = ({ desde, hasta, onDesdeChange, onHastaChange }: DateRangeInputProps) => {
    return (
        <div className="contents"> {/* 'contents' allows children to act as grid items if parent is grid */}
            <Input
                type="date"
                label="Desde"
                icon={Calendar}
                value={desde}
                onChange={(e) => onDesdeChange(e.target.value)}
            />
            <Input
                type="date"
                label="Hasta"
                icon={Calendar}
                value={hasta}
                onChange={(e) => onHastaChange(e.target.value)}
            />
        </div>
    )
}

// Deprecated or Composite if needed, but we will use parts directly
export const DateRangeSelector = (props: DateRangeInputProps) => (
    <div className="space-y-4">
        <DateRangeButtons onDesdeChange={props.onDesdeChange} onHastaChange={props.onHastaChange} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DateRangeInputs {...props} />
        </div>
    </div>
)
