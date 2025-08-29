import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // OPTION 1: Maximum flexibility - allows ANY external image
    // This is the simplest solution but disables Next.js image optimization
    unoptimized: true,
    
    // OPTION 2: If you want to keep optimization but be more flexible, use:
    // remotePatterns: [
    //   {
    //     protocol: 'https',
    //     hostname: '**',
    //   },
    //   {
    //     protocol: 'http', 
    //     hostname: '**',
    //   }
    // ],
    
    // OPTION 3: For production, you might want to be more restrictive:
    // remotePatterns: [
    //   {
    //     protocol: 'https',
    //     hostname: 'example.com',
    //   },
    //   // Add specific domains you trust here
    // ],
  }
};

export default nextConfig;
