import { ProviderDefinition, ProviderId, IconComponent } from '../providers/types';
import { awsProvider } from '../providers/aws';
import { azureProvider } from '../providers/azure';
import { cloudNativeProvider } from '../providers/cloudnative';
import { genericProvider } from '../providers/generic';
import { integrationProvider } from '../providers/integration';
import { Box } from 'lucide-react';

const providers: Record<ProviderId, ProviderDefinition> = {
    aws: awsProvider,
    azure: azureProvider,
    cloudnative: cloudNativeProvider,
    generic: genericProvider,
    integration: integrationProvider,
    gcp: {} as any, // Stub for GCP to satisfy ProviderId for now
};

export const getProvider = (id: ProviderId): ProviderDefinition => {
    return providers[id] || providers.generic;
};

export const getAllProviders = (): ProviderDefinition[] => {
    return [awsProvider, azureProvider, cloudNativeProvider, integrationProvider, genericProvider];
};

export const getServiceIcon = (providerId: string, service: string, type: string, subtype?: string): IconComponent => {
    const provider = getProvider((providerId as ProviderId) || 'aws');
    if (provider.getIcon) {
        return provider.getIcon(service, type, subtype);
    }
    return Box;
};

export const getServiceDescription = (providerId: string, service: string, subtype?: string): string => {
    if (!service) return '';
    const normalize = (str: string) => str.toLowerCase().replace(/[\s-]/g, '');
    const normalizedService = normalize(service);

    // If provider is specified and valid, search there first
    const provider = getProvider((providerId as ProviderId) || 'aws');

    if (provider && provider.services) {
        for (const category of provider.services) {
            for (const item of category.items) {
                const itemServiceNormalized = normalize(item.service);
                const itemNameNormalized = normalize(item.name);

                if (itemServiceNormalized === normalizedService || itemNameNormalized === normalizedService) {
                    if (subtype && (item as any).subtype) {
                        if (normalize((item as any).subtype) === normalize(subtype)) {
                            return item.description;
                        }
                    } else if (!subtype || !(item as any).subtype || normalize(subtype) === normalize((item as any).subtype) || subtype === 'aws-compute' || subtype.startsWith('aws-')) {
                        return item.description;
                    }
                }
            }
        }
    }

    // Fallback: search across all providers if not found directly
    for (const p of Object.values(providers)) {
        if (!p.services) continue;
        for (const category of p.services) {
            for (const item of category.items) {
                const itemServiceNormalized = normalize(item.service);
                const itemNameNormalized = normalize(item.name);

                if (itemServiceNormalized === normalizedService || itemNameNormalized === normalizedService) {
                    return item.description;
                }
            }
        }
    }

    return '';
};
