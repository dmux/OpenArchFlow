import { ProviderDefinition, ServiceCategory, IconComponent } from '../types';
import { AZURE_SERVICES } from './services';
import { getAzureIcon } from './icons';

export const azureProvider: ProviderDefinition = {
    id: 'azure',
    name: 'Microsoft Azure',
    description: 'Microsoft Azure Cloud Services',
    services: AZURE_SERVICES,
    getIcon: getAzureIcon,
};
