import type { AppNode, AppEdge } from '@/lib/store';

interface ParseResult {
    nodes: AppNode[];
    edges: AppEdge[];
}

// Minimal Mermaid text parser — avoids the heavy mermaid render pipeline
// Supports flowchart/graph, sequenceDiagram, classDiagram

function sanitizeId(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function makeNode(id: string, label: string, x = 0, y = 0): AppNode {
    return {
        id,
        type: 'generic',
        position: { x, y },
        data: { label, service: 'Generic', type: 'generic' },
    };
}

function makeEdge(id: string, source: string, target: string, label = ''): AppEdge {
    return {
        id,
        source,
        target,
        label: label || undefined,
        type: 'smoothstep',
    } as AppEdge;
}

// ── Flowchart / Graph ─────────────────────────────────────────────────────────

function parseFlowchart(lines: string[]): ParseResult {
    const nodes = new Map<string, AppNode>();
    const edges: AppEdge[] = [];

    // Patterns
    const nodePattern = /^\s*([A-Za-z0-9_]+)(?:\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\}|>"([^"]*)"|\("([^"]*)"\))?/;
    const edgePattern = /([A-Za-z0-9_]+)\s*(?:-->|->|===|==|--)\s*(?:\|([^|]*)\|)?\s*([A-Za-z0-9_]+)/g;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('%%') || /^(flowchart|graph)\s/i.test(trimmed)) continue;

        // Extract edges
        let em: RegExpExecArray | null;
        edgePattern.lastIndex = 0;
        while ((em = edgePattern.exec(trimmed)) !== null) {
            const src = sanitizeId(em[1]);
            const edgeLabel = em[2] ?? '';
            const tgt = sanitizeId(em[3]);
            if (!nodes.has(src)) nodes.set(src, makeNode(src, src));
            if (!nodes.has(tgt)) nodes.set(tgt, makeNode(tgt, tgt));
            edges.push(makeEdge(`${src}-${tgt}-${edges.length}`, src, tgt, edgeLabel));
        }

        // Extract node definitions (label overrides)
        const nm = nodePattern.exec(trimmed);
        if (nm) {
            const id = sanitizeId(nm[1]);
            const label = nm[2] ?? nm[3] ?? nm[4] ?? nm[5] ?? nm[6] ?? id;
            if (id && id !== 'end' && id !== 'style' && id !== 'subgraph') {
                if (!nodes.has(id)) nodes.set(id, makeNode(id, label));
                else nodes.get(id)!.data.label = label;
            }
        }
    }

    // Auto position in a grid
    const nodeArr = [...nodes.values()];
    const cols = Math.ceil(Math.sqrt(nodeArr.length));
    nodeArr.forEach((n, i) => {
        n.position = { x: (i % cols) * 220, y: Math.floor(i / cols) * 120 };
    });

    return { nodes: nodeArr, edges };
}

// ── Sequence Diagram ──────────────────────────────────────────────────────────

function parseSequence(lines: string[]): ParseResult {
    const participants = new Map<string, AppNode>();
    const edges: AppEdge[] = [];

    const participantRe = /^participant\s+(.+)/i;
    const actorRe = /^actor\s+(.+)/i;
    const msgRe = /^([A-Za-z0-9_]+)\s*(->>|-->|-x|->)\s*([A-Za-z0-9_]+)\s*:\s*(.*)/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || /^sequenceDiagram/i.test(trimmed)) continue;

        const pm = participantRe.exec(trimmed) ?? actorRe.exec(trimmed);
        if (pm) {
            const name = pm[1].split(' as ').pop()!.trim();
            const id = sanitizeId(name);
            if (!participants.has(id)) {
                participants.set(id, makeNode(id, name, participants.size * 200, 0));
            }
            continue;
        }

        const mm = msgRe.exec(trimmed);
        if (mm) {
            const src = sanitizeId(mm[1]);
            const tgt = sanitizeId(mm[3]);
            const label = mm[4]?.trim() ?? '';
            if (!participants.has(src)) participants.set(src, makeNode(src, src, participants.size * 200, 0));
            if (!participants.has(tgt)) participants.set(tgt, makeNode(tgt, tgt, participants.size * 200, 0));
            edges.push(makeEdge(`seq-${edges.length}`, src, tgt, label));
        }
    }

    // Reposition participants in a horizontal row
    let x = 0;
    for (const n of participants.values()) {
        n.position = { x, y: 0 };
        x += 220;
    }

    return { nodes: [...participants.values()], edges };
}

// ── Class Diagram ─────────────────────────────────────────────────────────────

function parseClass(lines: string[]): ParseResult {
    const classes = new Map<string, AppNode>();
    const edges: AppEdge[] = [];

    const classRe = /^class\s+([A-Za-z0-9_]+)/;
    const relationRe = /([A-Za-z0-9_]+)\s*(<\|--|<\|\.\.|\*--|o--|-->|\.\.>|--)\s*([A-Za-z0-9_]+)\s*(?::\s*(.+))?/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || /^classDiagram/i.test(trimmed)) continue;

        const cm = classRe.exec(trimmed);
        if (cm) {
            const id = sanitizeId(cm[1]);
            if (!classes.has(id)) classes.set(id, makeNode(id, cm[1]));
            continue;
        }

        const rm = relationRe.exec(trimmed);
        if (rm) {
            const src = sanitizeId(rm[1]);
            const tgt = sanitizeId(rm[3]);
            const label = rm[4]?.trim() ?? '';
            if (!classes.has(src)) classes.set(src, makeNode(src, rm[1]));
            if (!classes.has(tgt)) classes.set(tgt, makeNode(tgt, rm[3]));
            edges.push(makeEdge(`cls-${edges.length}`, src, tgt, label));
        }
    }

    const classArr = [...classes.values()];
    const cols = Math.ceil(Math.sqrt(classArr.length));
    classArr.forEach((n, i) => {
        n.position = { x: (i % cols) * 220, y: Math.floor(i / cols) * 150 };
    });

    return { nodes: classArr, edges };
}

// ── Public entry point ────────────────────────────────────────────────────────

export function parseMermaid(code: string): ParseResult {
    const lines = code.split('\n');
    const first = lines.find((l) => l.trim())?.trim().toLowerCase() ?? '';

    if (first.startsWith('sequencediagram')) return parseSequence(lines);
    if (first.startsWith('classdiagram')) return parseClass(lines);
    // flowchart / graph / default
    return parseFlowchart(lines);
}
