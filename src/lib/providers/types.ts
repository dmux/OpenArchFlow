import React from 'react';
import { LucideIcon } from 'lucide-react';

export type ProviderId = 'aws' | 'azure' | 'gcp' | 'cloudnative' | 'generic' | 'integration';

export type IconComponent = React.ComponentType<any> | LucideIcon | React.ElementType;

export interface ServiceItem {
    name: string;
    description: string;
    service: string;
    type?: string;     // e.g., 'compute', 'database', 'client'
    subtype?: string;  // further categorization
}

export interface ServiceCategory {
    category: string;
    items: ServiceItem[];
}

export interface ProviderDefinition {
    id: ProviderId;
    name: string;
    description: string;
    services: ServiceCategory[];
    getIcon: (service: string, type: string, subtype?: string) => IconComponent;
}
