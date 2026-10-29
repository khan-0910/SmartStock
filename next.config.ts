import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Content-Security-Policy is set per request (with a nonce) in src/proxy.ts.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Camera is only needed by this origin's scan page; everything else is off.
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()",
  },
  // HSTS only in production (it would pin localhost to HTTPS in development).
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Hide the floating Next.js dev badge (it covered page content).
  devIndicators: false,
  // Pin the root so a stray lockfile in a parent folder is not picked up.
  turbopack: { root: __dirname },
  images: {
    // Photos are fetched and optimised (AVIF/WebP) by our own server, so the
    // browser only ever loads images from this origin.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
