import React from 'react';
import { IconComponent } from '../types';
import { Box } from 'lucide-react';

/**
 * Icons from the community "databricks-architecture-icons" set (MIT, unofficial).
 * Files live in public/icons/databricks, see the README there for attribution.
 */
const ICON_DIR = '/icons/databricks';

const ICON_FILES: Record<string, string> = {
    'databricks': 'databricks',
    'databricks-workspace': 'workspace',
    'databricks-cluster': 'compute-clusters',
    'databricks-sql-warehouse': 'sql-warehouse',
    'databricks-job': 'lakeflow-jobs',
    'databricks-notebook': 'notebooks',
    'databricks-pipeline': 'spark-declarative-pipelines',
    'databricks-autoloader': 'auto-loader',
    'databricks-catalog': 'unity-catalog',
    'databricks-schema': 'unity-catalog-semantics',
    'databricks-table': 'delta-lake',
    'databricks-volume': 'lakehouse-storage',
    'databricks-mlflow': 'mlflow',
    'databricks-model-serving': 'model-serving',
};

const iconCache = new Map<string, IconComponent>();

function makeImageIcon(file: string, name: string): IconComponent {
    const Icon = (props: { className?: string; style?: React.CSSProperties; size?: number | string }) => {
        const { className, style, size } = props;
        return React.createElement('img', {
            src: `${ICON_DIR}/${file}.svg`,
            alt: '',
            'aria-hidden': true,
            draggable: false,
            className,
            style: size ? { width: size, height: size, ...style } : style,
        });
    };
    Icon.displayName = `DatabricksIcon(${name})`;
    return Icon;
}

export const getDatabricksIcon = (service: string, type: string, subtype?: string): IconComponent => {
    const key = service?.toLowerCase().replace(/\s+/g, '') || '';
    const file = ICON_FILES[key];
    if (!file) return Box;
    let icon = iconCache.get(key);
    if (!icon) {
        icon = makeImageIcon(file, key);
        iconCache.set(key, icon);
    }
    return icon;
};
