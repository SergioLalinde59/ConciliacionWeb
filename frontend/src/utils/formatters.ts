
export const formatCurrency = (value: number | string | undefined | null, showDecimals: boolean = false): string => {
    if (value === undefined || value === null) return "$ 0";

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) return "$ 0";

    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: showDecimals ? 2 : 0,
        maximumFractionDigits: showDecimals ? 2 : 0,
    }).format(numValue);
};

export const getAmountColorClass = (value: number | string | undefined | null): string => {
    if (value === undefined || value === null) return "text-gray-900";
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return "text-gray-900";

    if (numValue > 0) return "text-green-600";
    if (numValue < 0) return "text-red-600";
    return "text-gray-900";
};
