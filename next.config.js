// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*kybpjqzcagfnulzzlumk.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@radix-ui/react-*', '@fullcalendar/*'],
    webpackBuildWorker: true,
  },
  webpack: (config, { dev, isServer }) => {
    // Only run in production build
    if (!dev) {
      // Remove comments and console logs in production
      config.optimization.minimizer.forEach((minimizer) => {
        if (minimizer.constructor.name === 'TerserPlugin') {
          minimizer.options.terserOptions = {
            ...minimizer.options.terserOptions,
            compress: {
              ...minimizer.options.terserOptions.compress,
              drop_console: true,
            },
            output: {
              ...minimizer.options.terserOptions.output,
              comments: false,
            },
          };
        }
      });
    }

    if (config.cache && !dev) {
      config.cache = Object.freeze({
        type: 'memory',
      });
    }
    return config;
  },
  cacheHandler: require.resolve('./cache-handler.js'),
  cacheMaxMemorySize: 100,
};

const { i18n } = require('./next-i18next.config');
module.exports = {
  i18n,
  // ...other config
};

module.exports = nextConfig; // Use CommonJS export


