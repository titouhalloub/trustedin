/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
  domains: ["images.unsplash.com", "cdn.pixabay.com", "res.cloudinary.com", "picsum.photos", "placekitten.com", "dummyimage.com"],
},

};

console.log("✅ next.config.cjs loaded — images.remotePatterns:", process.env.NODE_ENV);
console.log("✅ next.config.cjs loaded with Unsplash enabled!");


module.exports = nextConfig;
