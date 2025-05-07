// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*kybpjqzcagfnulzzlumk.supabase.co', // Make sure this matches your Supabase project URL
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  reactStrictMode: true,
 
};

const { i18n } = require('./next-i18next.config');
module.exports = {
  i18n,
  // ...other config
};

module.exports = nextConfig; // Use CommonJS export


