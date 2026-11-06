import { ProviderDefinition } from '../types';
import { DATABRICKS_SERVICES } from './services';
import { getDatabricksIcon } from './icons';

export const databricksProvider: ProviderDefinition = {
    id: 'databricks',
    name: 'Databricks',
    description: 'Databricks lakehouse components: compute, jobs, Unity Catalog and ML',
    services: DATABRICKS_SERVICES,
    getIcon: getDatabricksIcon,
};
