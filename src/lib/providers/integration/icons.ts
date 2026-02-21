import { IconComponent } from '../types';
import { ShoppingCart, Webhook, Box } from 'lucide-react';
import { SiStripe, SiPaypal, SiApplepay, SiGooglepay, SiShopify, SiSlack, SiDiscord, SiTwilio, SiSendgrid } from 'react-icons/si';

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
        'slack': SiSlack,
        'discord': SiDiscord,
        'twilio': SiTwilio,
        'sendgrid': SiSendgrid,
    };

    if (serviceMap[normalizedService]) {
        return serviceMap[normalizedService];
    }

    return Box;
};
