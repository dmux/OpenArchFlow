import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    env: {
        NEXT_PUBLIC_APP_VERSION: pkg.version,
    },
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "lh3.googleusercontent.com" },
            { protocol: "https", hostname: "*.googleusercontent.com" },
        ],
    },
};

export default nextConfig;
