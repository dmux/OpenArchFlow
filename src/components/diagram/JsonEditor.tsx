
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Braces } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface JsonEditorProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    className?: string;
}

export default function JsonEditor({
    value,
    onChange,
    label,
    placeholder,
    className
}: JsonEditorProps) {
    const [isValid, setIsValid] = useState(true);
    const [isFixable, setIsFixable] = useState(false);
    const [localValue, setLocalValue] = useState(value);

    // Sync local state with prop, but only if prop changed externally to avoid cursor jumps / loops
    // Ideally we rely on parent but for validation feedback we need to check on every change
    useEffect(() => {
        setLocalValue(value);
        try {
            if (value) JSON.parse(value);
            setIsValid(true);
        } catch {
            setIsValid(false);
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        onChange(newValue);

        try {
            if (newValue) JSON.parse(newValue);
            setIsValid(true);
            setIsFixable(false);
        } catch {
            setIsValid(false);
            // Check if it's fixable (relaxed JSON)
            try {
                (new Function(`return ${newValue}`))();
                setIsFixable(true);
            } catch {
                setIsFixable(false);
            }
        }
    };

    const handleFormat = () => {
        try {
            // Try formatting as strict JSON first
            const parsed = JSON.parse(localValue);
            const formatted = JSON.stringify(parsed, null, 2);
            setLocalValue(formatted);
            onChange(formatted);
            setIsValid(true);
        } catch (e) {
            // Try relaxed JSON (e.g. JS objects)
            try {
                const relaxed = (new Function(`return ${localValue}`))();
                const formatted = JSON.stringify(relaxed, null, 2);
                setLocalValue(formatted);
                onChange(formatted);
                setIsValid(true);
            } catch (e2) {
                // Still invalid
            }
        }
    };

    return (
        <div className={cn("space-y-1.5", className)}>
            <div className="flex items-center justify-between">
                {label && <Label className="text-xs">{label}</Label>}
                <div className="flex items-center gap-2">
                    {localValue && (
                        <span className={cn(
                            "text-[10px] font-medium flex items-center gap-1",
                            isValid ? "text-green-600" : (isFixable ? "text-yellow-600" : "text-destructive")
                        )}>
                            {isValid ? <Check size={10} /> : (isFixable ? <Braces size={10} /> : <X size={10} />)}
                            {isValid ? "Valid JSON" : (isFixable ? "Fixable Logic" : "Invalid JSON")}
                        </span>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-2 text-[10px] text-muted-foreground hover:text-primary"
                        onClick={handleFormat}
                        disabled={!localValue || (!isValid && !isFixable)}
                        title="Format JSON"
                    >
                        <Braces size={10} className="mr-1" /> Format
                    </Button>
                </div>
            </div>
            <textarea
                className={cn(
                    "flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y",
                    !isValid && localValue ? "border-destructive/50 focus-visible:ring-destructive/30" : "border-input"
                )}
                placeholder={placeholder || '{"key": "value"}'}
                value={localValue}
                onChange={handleChange}
                spellCheck={false}
            />
        </div>
    );
}
