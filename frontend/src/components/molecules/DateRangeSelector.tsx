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
    getUltimos12Meses,
    formatDateISO
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
        <div className="flex flex-col sm:flex-row gap-4 flex-grow">
            <div className="flex-grow">
                <Input
                    type="date"
                    label="Desde"
                    icon={Calendar}
                    value={desde}
                    onChange={(e) => {
                        const newVal = e.target.value
                        onDesdeChange(newVal)
                        if (newVal) {
                            const [year, month] = newVal.split('-').map(Number)
                            if (year && month) {
                                // month is 1-indexed from split, new Date taking (year, month, 0) gives last day of previous month index?
                                // No: new Date(year, monthIndex, 0) gives last day of monthIndex-1.
                                // wait.
                                // split "2023-01-01" -> year=2023, month=1.
                                // new Date(2023, 1, 0). Month index 1 is Feb. 0th day of Feb is Jan 31.
                                // So this gives Jan 31. Correct.
                                const lastDay = new Date(year, month, 0)
                                onHastaChange(formatDateISO(lastDay))
                            }
                        }
                    }}
                />
            </div>
            <div className="flex-grow">
                <Input
                    type="date"
                    label="Hasta"
                    icon={Calendar}
                    value={hasta}
                    onChange={(e) => onHastaChange(e.target.value)}
                />
            </div>
        </div>
    )
}

// Deprecated or Composite if needed, but we will use parts directly
export const DateRangeSelector = (props: DateRangeInputProps) => (
    <div className="space-y-4">
        <DateRangeButtons onDesdeChange={props.onDesdeChange} onHastaChange={props.onHastaChange} />
        <DateRangeInputs {...props} />
    </div>
)
