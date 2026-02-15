import type { Metadata } from "next";

export function generateStructuredData() {
    return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'OpenArchFlow',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Web Browser',
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
        },
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '5',
            ratingCount: '1',
        },
        description: 'AI-Powered AWS Architecture Diagram Generator - Transform natural language into professional cloud architecture diagrams. Free, open-source, privacy-first PWA.',
        screenshot: 'https://openarchflow.cloud/docs/screenshot.png',
        author: {
            '@type': 'Person',
            name: 'Rafael Sales',
        },
        publisher: {
            '@type': 'Organization',
            name: 'OpenArchFlow',
        },
        softwareVersion: '0.1.0',
        datePublished: '2026-02-13',
        keywords: 'AWS, architecture diagram, cloud architecture, AI diagram tool, DevOps, serverless, infrastructure as code',
    }
}

export function generateWebSiteStructuredData() {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'OpenArchFlow',
        url: 'https://openarchflow.cloud',
        description: 'AI-Powered AWS Architecture Diagram Generator',
        potentialAction: {
            '@type': 'SearchAction',
            target: 'https://openarchflow.cloud/?q={search_term_string}',
            'query-input': 'required name=search_term_string',
        },
    }
}

export function generateOrganizationStructuredData() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'OpenArchFlow',
        url: 'https://openarchflow.cloud',
        logo: 'https://openarchflow.cloud/icon-512x512.png',
        sameAs: [
            'https://github.com/dmux/OpenArchFlow',
        ],
    }
}
