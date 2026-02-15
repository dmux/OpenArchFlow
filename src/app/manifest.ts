import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'OpenArchFlow - AI-Powered AWS Architecture Diagram Generator',
        short_name: 'OpenArchFlow',
        description: 'Transform natural language into professional AWS cloud architecture diagrams. Free, open-source, privacy-first PWA with AI-powered generation.',
        start_url: 'https://openarchflow.cloud/',
        display: 'standalone',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        orientation: 'any',
        icons: [
            {
                src: '/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'maskable',
            },
        ],
        categories: ['productivity', 'developer tools', 'utilities'],
    }
}
