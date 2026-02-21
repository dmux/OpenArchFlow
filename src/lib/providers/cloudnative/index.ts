import { ProviderDefinition, ServiceCategory, IconComponent } from '../types';
import { CLOUDNATIVE_SERVICES } from './services';
import { getCloudNativeIcon } from './icons';

export const cloudNativeProvider: ProviderDefinition = {
    id: 'cloudnative',
    name: 'Cloud Native',
    description: 'Open source and cloud-native tools',
    services: CLOUDNATIVE_SERVICES,
    getIcon: getCloudNativeIcon,
};
