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
  // Any other configurations you have should go here.
  // They generally work the same way as they would in a .ts file.
  // For example, if you needed server actions enabled (though often default now):
  // experimental: {
  //   serverActions: true,
  // },
};

module.exports = nextConfig; // Use CommonJS export


