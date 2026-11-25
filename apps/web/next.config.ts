import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // @earshot/ui ships TypeScript source rather than a build output. One less
  // build step, and the app's own compiler is the single source of truth for
  // how the components are transpiled.
  transpilePackages: ['@earshot/ui'],
};

export default config;
