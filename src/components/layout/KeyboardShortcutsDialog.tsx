'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { SHORTCUTS } from '@/lib/shortcuts';

interface KeyboardShortcutsDialogProps {
    open: boolean;
    onClose: () => void;
}

function Kbd({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 text-[11px] font-mono font-semibold bg-muted border border-border rounded shadow-sm">
            {children}
        </kbd>
    );
}

export default function KeyboardShortcutsDialog({ open, onClose }: KeyboardShortcutsDialogProps) {
    const categories = [...new Set(SHORTCUTS.map((s) => s.category))];

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent aria-describedby={undefined} className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Keyboard Shortcuts</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                    {categories.map((cat) => (
                        <div key={cat}>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{cat}</p>
                            <div className="space-y-1.5">
                                {SHORTCUTS.filter((s) => s.category === cat).map((s, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <span className="text-sm text-foreground">{s.description}</span>
                                        <div className="flex items-center gap-1">
                                            {s.keys.map((k, ki) => (
                                                <React.Fragment key={k}>
                                                    {ki > 0 && <span className="text-muted-foreground text-xs">+</span>}
                                                    <Kbd>{k}</Kbd>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
