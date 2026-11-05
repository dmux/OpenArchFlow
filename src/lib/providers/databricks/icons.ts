import { IconComponent } from '../types';
import { Box, Cpu, Database, FileCode, FolderOpen, Layers, Server, Table2, Workflow, Zap, Warehouse, BookOpen } from 'lucide-react';
import { SiDatabricks, SiMlflow } from 'react-icons/si';

export const getDatabricksIcon = (service: string, type: string, subtype?: string): IconComponent => {
    const normalizedService = service?.toLowerCase().replace(/\s+/g, '') || '';

    const serviceMap: Record<string, IconComponent> = {
        'databricks': SiDatabricks,
        'databricks-workspace': SiDatabricks,
        'databricks-cluster': Server,
        'databricks-sql-warehouse': Warehouse,
        'databricks-job': Workflow,
        'databricks-notebook': BookOpen,
        'databricks-pipeline': Zap,
        'databricks-autoloader': FileCode,
        'databricks-catalog': Layers,
        'databricks-schema': Database,
        'databricks-table': Table2,
        'databricks-volume': FolderOpen,
        'databricks-mlflow': SiMlflow,
        'databricks-model-serving': Cpu,
    };

    return serviceMap[normalizedService] ?? Box;
};
