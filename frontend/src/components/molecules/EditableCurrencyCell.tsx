import React, { useState, useRef, useEffect } from 'react';
import { CurrencyDisplay, getNumberColorClass } from '../atoms/CurrencyDisplay';

interface EditableCurrencyCellProps {
    value?: number;
    onChange: (value: string) => void;
    className?: string;
}

export const EditableCurrencyCell: React.FC<EditableCurrencyCellProps> = ({ value = 0, onChange, className = '' }) => {
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            inputRef.current?.blur();
        }
        if (e.key === 'Escape') {
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="number"
                className={`w-full bg-transparent border-b border-blue-500 outline-none text-right px-1 font-medium ${getNumberColorClass(value)}`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className={`cursor-pointer hover:bg-gray-50 border-b border-transparent hover:border-gray-200 px-1 py-0.5 rounded transition-all text-right ${className}`}
            title="Click para editar"
        >
            <CurrencyDisplay value={value} />
        </div>
    );
};
