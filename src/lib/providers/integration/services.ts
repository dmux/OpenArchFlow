import { ServiceCategory } from '../types';

export const INTEGRATION_SERVICES: ServiceCategory[] = [
    {
        category: "Integrations & Payments",
        items: [
            { name: "Stripe", service: "stripe", type: "integration", description: "Financial infrastructure platform for the internet." },
            { name: "PayPal", service: "paypal", type: "integration", description: "Online payments system." },
            { name: "Apple Pay", service: "applepay", type: "integration", description: "Mobile payment and digital wallet service." },
            { name: "Google Pay", service: "googlepay", type: "integration", description: "Online payment system developed by Google." },
            { name: "Shopify", service: "shopify", type: "integration", description: "E-commerce platform for online stores." },
            { name: "Checkout", service: "checkout", type: "integration", description: "E-commerce checkout process or gateway." },
            { name: "Webhook", service: "webhook", type: "integration", description: "User-defined HTTP callbacks or webhooks." },
            { name: "Slack", service: "slack", type: "integration", description: "Messaging program designed specifically for the office." },
            { name: "Discord", service: "discord", type: "integration", description: "Voice, video and text communication service." },
            { name: "Twilio", service: "twilio", type: "integration", description: "Customer engagement platform used to build direct, personalized relationships." },
            { name: "SendGrid", service: "sendgrid", type: "integration", description: "Cloud-based customer communication platform." },
        ]
    }
];
