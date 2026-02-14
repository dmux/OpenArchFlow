export default [
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        languageOptions: {
            parser: await import('@typescript-eslint/parser').then(m => m.default),
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
    },
    {
        ignores: [
            '.next/**',
            'node_modules/**',
            'out/**',
            'dist/**',
            '.git/**',
            '*.config.js',
            '*.config.mjs',
            '*.config.ts',
            'tsconfig.tsbuildinfo',
        ],
    },
];
