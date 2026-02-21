import { ProviderDefinition, ServiceCategory, IconComponent } from '../types';
import { GENERIC_SERVICES } from './services';
import { getGenericIcon } from './icons';

export const genericProvider: ProviderDefinition = {
    id: 'generic',
    name: 'Generic Elements',
    description: 'Common diagram tools and clients',
    services: GENERIC_SERVICES,
    getIcon: getGenericIcon,
};
