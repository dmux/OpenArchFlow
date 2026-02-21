import { ProviderDefinition, ServiceCategory, IconComponent } from '../types';
import { AWS_SERVICES } from './services';
import { getAwsIcon } from './icons';

export const awsProvider: ProviderDefinition = {
    id: 'aws',
    name: 'AWS',
    description: 'Amazon Web Services',
    services: AWS_SERVICES,
    getIcon: getAwsIcon,
};
