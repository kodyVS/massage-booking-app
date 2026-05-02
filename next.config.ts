import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["100.75.11.59", "127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
  // Mongoose's native bindings + dynamic require should not be bundled by
  // the Server Components compiler — keep them external.
  serverExternalPackages: ["mongoose", "@mapbox/node-pre-gyp"],
};

export default nextConfig;
