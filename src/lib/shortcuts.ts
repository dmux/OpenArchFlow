export interface ShortcutDef {
    keys: string[];
    description: string;
    category: string;
}

export const SHORTCUTS: ShortcutDef[] = [
    // Edit
    { keys: ['Ctrl', 'Z'],       description: 'Undo',             category: 'Edit' },
    { keys: ['Ctrl', 'Y'],       description: 'Redo',             category: 'Edit' },
    { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo (alt)',    category: 'Edit' },
    { keys: ['Ctrl', 'A'],       description: 'Select all',       category: 'Edit' },
    { keys: ['Ctrl', 'C'],       description: 'Copy selected',    category: 'Edit' },
    { keys: ['Ctrl', 'V'],       description: 'Paste',            category: 'Edit' },
    { keys: ['Ctrl', 'D'],       description: 'Duplicate',        category: 'Edit' },
    { keys: ['Del'],             description: 'Delete selected',  category: 'Edit' },
    { keys: ['Esc'],             description: 'Deselect all',     category: 'Edit' },
    // View
    { keys: ['Ctrl', 'L'],       description: 'Auto layout',      category: 'View' },
    // Help
    { keys: ['Ctrl', '?'],       description: 'Show shortcuts',   category: 'Help' },
];
