import { IconComponent } from '../types';
import { ShoppingCart, Webhook, Box } from 'lucide-react';
import { SiStripe, SiPaypal, SiApplepay, SiGooglepay, SiShopify, SiDiscord } from 'react-icons/si';

export const getIntegrationIcon = (service: string, type: string, subtype?: string): IconComponent => {
    const normalizedService = service?.toLowerCase().replace(/\s+/g, '') || '';

    const serviceMap: Record<string, IconComponent> = {
        'stripe': SiStripe,
        'paypal': SiPaypal,
        'applepay': SiApplepay,
        'googlepay': SiGooglepay,
        'shopify': SiShopify,
        'checkout': ShoppingCart,
        'webhook': Webhook,
        'discord': SiDiscord,
    };

    if (serviceMap[normalizedService]) {
        return serviceMap[normalizedService];
    }

    return Box;
};
