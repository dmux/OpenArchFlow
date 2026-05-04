'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { AppNodeData } from '@/lib/store';
import { Key } from 'lucide-react';

export interface TableColumn {
    id: string;
    name: string;
    type: string;
    isPrimaryKey?: boolean;
    isForeignKey?: boolean;
    nullable?: boolean;
}

const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 36;

const TableNode = ({ data, selected }: NodeProps<AppNodeData>) => {
    const tableName: string = data.label ?? 'Table';
    const columns: TableColumn[] = (data.metadata?.columns as TableColumn[]) ?? [];

    const totalHeight = HEADER_HEIGHT + columns.length * ROW_HEIGHT;

    return (
        <>
            <NodeResizer
                minWidth={160}
                minHeight={totalHeight}
                isVisible={selected}
                lineClassName="!border-primary"
                handleClassName="!w-2.5 !h-2.5 !bg-primary"
            />
            <div
                className={`relative rounded-lg border-2 overflow-visible bg-card text-card-foreground transition-all ${selected ? 'border-primary shadow-lg' : 'border-border'}`}
                style={{ minWidth: 180, width: '100%' }}
            >
                {/* Table header */}
                <div className="flex items-center justify-center px-3 bg-primary/10 border-b border-border rounded-t-lg font-semibold text-sm text-foreground" style={{ height: HEADER_HEIGHT }}>
                    <Handle type="target" position={Position.Top} id="top" className="!w-2.5 !h-2.5 !bg-primary/60" />
                    <span className="truncate">{tableName}</span>
                    <Handle type="source" position={Position.Top} id="top-src" className="!opacity-0 !pointer-events-none" />
                </div>

                {/* Columns */}
                {columns.map((col, idx) => (
                    <div
                        key={col.id}
                        className={`relative flex items-center gap-1.5 px-2 text-xs ${idx < columns.length - 1 ? 'border-b border-border/50' : ''} hover:bg-muted/30`}
                        style={{ height: ROW_HEIGHT }}
                    >
                        {/* Per-row target handle (left) */}
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={`col-tgt-${col.id}`}
                            style={{ top: HEADER_HEIGHT + idx * ROW_HEIGHT + ROW_HEIGHT / 2 }}
                            className="!w-2 !h-2 !bg-muted-foreground/60 !left-0"
                        />

                        {col.isPrimaryKey && <Key className="h-3 w-3 text-amber-500 shrink-0" />}
                        {col.isForeignKey && !col.isPrimaryKey && <Key className="h-3 w-3 text-blue-400 shrink-0" />}
                        {!col.isPrimaryKey && !col.isForeignKey && <span className="w-3 shrink-0" />}

                        <span className={`font-medium ${col.isPrimaryKey ? 'text-amber-600 dark:text-amber-400' : ''}`}>{col.name}</span>
                        <span className="ml-auto text-muted-foreground font-mono text-[10px]">{col.type}{col.nullable ? '?' : ''}</span>

                        {/* Per-row source handle (right) */}
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={`col-src-${col.id}`}
                            style={{ top: HEADER_HEIGHT + idx * ROW_HEIGHT + ROW_HEIGHT / 2 }}
                            className="!w-2 !h-2 !bg-muted-foreground/60 !right-0"
                        />
                    </div>
                ))}

                {columns.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground italic">No columns defined</div>
                )}

                <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2.5 !h-2.5 !bg-primary/60" />
            </div>
        </>
    );
};

export default memo(TableNode);
