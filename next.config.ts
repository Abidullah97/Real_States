import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy: limits where scripts, images and frames may load from, as a second line of
// defence against XSS. Inline scripts/styles are needed by Next.js hydration; 'unsafe-eval' only in dev
// (React Refresh). Images: own origin (incl. /uploads), Unsplash and Cloudinary. Frames: Google Maps embeds.
// Google Analytics 4: gtag.js loads from googletagmanager.com and sends hits to google-analytics.com hosts.
const gaScriptHosts = "https://*.googletagmanager.com";
const gaConnectHosts = "https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com";
const gaImgHosts = "https://*.google-analytics.com https://*.googletagmanager.com";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${gaScriptHosts}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://images.unsplash.com https://res.cloudinary.com https://*.supabase.co ${gaImgHosts}`,
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""} ${gaConnectHosts}`,
  "frame-src https://www.google.com https://maps.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" },{protocol:"https",hostname:"res.cloudinary.com"},{protocol:"https",hostname:"*.supabase.co",pathname:"/storage/v1/object/public/**"}] },
  async headers() { return [{ source: "/(.*)", headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Content-Security-Policy", value: csp },
    // HSTS only in production, where the site is served over HTTPS.
    ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
  ] }]; }
};
export default nextConfig;
