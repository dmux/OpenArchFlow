import { AppNode, AppEdge } from './store';

export const CURRENT_VERSION = 1;

export interface DiagramData {
    id: string;
    name: string;
    nodes: AppNode[];
    edges: AppEdge[];
    lastModified: number;
}

export interface ExportData {
    version: number;
    type: 'single' | 'backup';
    data: DiagramData | DiagramData[];
    timestamp: number;
}

export const serializeDiagram = (diagram: DiagramData): string => {
    const exportData: ExportData = {
        version: CURRENT_VERSION,
        type: 'single',
        data: diagram,
        timestamp: Date.now(),
    };
    return JSON.stringify(exportData, null, 2);
};

export const serializeAllDiagrams = (diagrams: Record<string, DiagramData>): string => {
    const exportData: ExportData = {
        version: CURRENT_VERSION,
        type: 'backup',
        data: Object.values(diagrams),
        timestamp: Date.now(),
    };
    return JSON.stringify(exportData, null, 2);
};

export const validateAndParseImport = (jsonString: string): ExportData => {
    try {
        const parsed = JSON.parse(jsonString);

        if (!parsed.version || !parsed.type || !parsed.data) {
            throw new Error('Invalid file format: missing required fields');
        }

        // Future version migration logic would go here
        if (parsed.version > CURRENT_VERSION) {
            throw new Error(`File version ${parsed.version} is newer than supported version ${CURRENT_VERSION}`);
        }

        return parsed as ExportData;
    } catch (error) {
        throw new Error(`Failed to parse import data: ${(error as Error).message}`);
    }
};

export const downloadJson = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
