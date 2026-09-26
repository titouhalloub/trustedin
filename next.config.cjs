/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.pixabay.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'placekitten.com' },
      { protocol: 'https', hostname: 'dummyimage.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'qgcarphlabblhyembnbd.supabase.co' },
    ],
  },

};

console.log("✅ next.config.cjs loaded — images.remotePatterns:", process.env.NODE_ENV);
console.log("✅ next.config.cjs loaded with Unsplash enabled!");


module.exports = nextConfig;
