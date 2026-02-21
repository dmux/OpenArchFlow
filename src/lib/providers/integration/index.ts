import { ProviderDefinition } from '../types';
import { INTEGRATION_SERVICES } from './services';
import { getIntegrationIcon } from './icons';

export const integrationProvider: ProviderDefinition = {
    id: 'integration',
    name: 'Integrations',
    description: 'Third-party Integrations and Payment platforms',
    services: INTEGRATION_SERVICES,
    getIcon: getIntegrationIcon,
};
