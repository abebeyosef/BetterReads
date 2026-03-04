import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "books.google.com",
      },
      {
        protocol: "http",
        hostname: "books.google.com",
      },
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      // Supabase Storage (avatars)
      {
        protocol: "https",
        hostname: "fzbqvopmlizieegapixf.supabase.co",
      },
    ],
  },
};

export default nextConfig;
