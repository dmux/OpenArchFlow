import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'OpenArchFlow - AI-Powered AWS Architecture Diagram Generator',
        short_name: 'OpenArchFlow',
        description: 'Transform natural language into professional AWS cloud architecture diagrams. Free, open-source, privacy-first PWA with AI-powered generation.',
        start_url: '/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        orientation: 'any',
        icons: [
            {
                src: '/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any maskable',
            },
            {
                src: '/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
            }
        ],
        screenshots: [
            {
                src: '/screenshots/desktop.png',
                sizes: '1280x720',
                type: 'image/png',
                form_factor: 'wide',
            }
        ],
        categories: ['productivity', 'developer tools', 'utilities'],
    }
}
