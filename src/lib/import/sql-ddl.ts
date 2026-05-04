import type { AppNode, AppEdge } from '@/lib/store';
import type { TableColumn } from '@/components/diagram/TableNode';

interface ParseResult {
    nodes: AppNode[];
    edges: AppEdge[];
}

function sanitizeId(name: string) {
    return name.replace(/[`"[\]\s]/g, '').toLowerCase();
}

export function parseSqlDdl(sql: string): ParseResult {
    const nodes: AppNode[] = [];
    const edges: AppEdge[] = [];

    // Split into CREATE TABLE blocks
    const tableRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"[]?(\w+)[`"\]]?\s*\(([^;]+)\)/gi;
    let match: RegExpExecArray | null;
    let col = 0;
    let row = 0;

    while ((match = tableRe.exec(sql)) !== null) {
        const tableName = match[1];
        const body = match[2];
        const tableId = `tbl-${sanitizeId(tableName)}`;

        const columns: TableColumn[] = [];
        const fkRefs: { colId: string; refTable: string }[] = [];

        // Parse column / constraint lines
        const lines = body.split(',').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
            const upper = line.toUpperCase();

            // FOREIGN KEY constraint
            const fkMatch = /FOREIGN\s+KEY\s*\([`"[\s]?(\w+)/i.exec(line);
            const refMatch = /REFERENCES\s+[`"[]?(\w+)/i.exec(line);
            if (fkMatch && refMatch) {
                const fkColId = `${tableId}-${sanitizeId(fkMatch[1])}`;
                fkRefs.push({ colId: fkColId, refTable: sanitizeId(refMatch[1]) });
                // Mark the column as FK
                const existing = columns.find(c => c.id === fkColId);
                if (existing) existing.isForeignKey = true;
                continue;
            }

            // PRIMARY KEY standalone
            if (/^PRIMARY\s+KEY/i.test(line)) {
                const pkCols = line.match(/\(([^)]+)\)/);
                if (pkCols) {
                    pkCols[1].split(',').forEach(c => {
                        const id = `${tableId}-${sanitizeId(c.trim())}`;
                        const col = columns.find(x => x.id === id);
                        if (col) col.isPrimaryKey = true;
                    });
                }
                continue;
            }

            // Column definition: name type [constraints]
            const colMatch = /^[`"[]?(\w+)[`"\]]?\s+(\w+(?:\([^)]*\))?)/i.exec(line);
            if (!colMatch) continue;
            const colName = colMatch[1];
            if (['INDEX', 'KEY', 'CONSTRAINT', 'UNIQUE', 'CHECK'].includes(colName.toUpperCase())) continue;

            const colType = colMatch[2];
            const isPK = /PRIMARY\s+KEY/i.test(line);
            const isFK = /REFERENCES/i.test(line);
            const nullable = !/NOT\s+NULL/i.test(line) && !isPK;

            if (isFK) {
                const ref = /REFERENCES\s+[`"[]?(\w+)/i.exec(line);
                if (ref) fkRefs.push({ colId: `${tableId}-${sanitizeId(colName)}`, refTable: sanitizeId(ref[1]) });
            }

            columns.push({ id: `${tableId}-${sanitizeId(colName)}`, name: colName, type: colType, isPrimaryKey: isPK, isForeignKey: isFK, nullable });
        }

        // Position tables in a grid (3 per row)
        const x = (col % 3) * 260;
        const y = row * 220;
        if (++col % 3 === 0) row++;

        nodes.push({
            id: tableId,
            type: 'table',
            position: { x, y },
            data: { label: tableName, service: 'Table', type: 'table', metadata: { columns } },
        } as AppNode);

        // Resolve FK edges
        for (const fk of fkRefs) {
            const targetId = `tbl-${fk.refTable}`;
            edges.push({
                id: `fk-${fk.colId}-${targetId}`,
                source: tableId,
                target: targetId,
                sourceHandle: `col-src-${fk.colId}`,
                label: 'FK',
                type: 'smoothstep',
            } as AppEdge);
        }
    }

    return { nodes, edges };
}
