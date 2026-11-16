import Script from "next/script";

// GA4 Measurement IDs look like "G-ABC123XYZ". Anything else (empty, a placeholder) disables tracking,
// and validating the format also keeps the value safe to place inside the inline script below.
const GA_ID_PATTERN = /^G-[A-Z0-9]+$/;

/**
 * Google Analytics 4 via the Google tag (gtag.js), loaded once from the root layout so it covers every page.
 *
 * Page views: `gtag('config')` sends the first page_view on the initial load. Client-side navigations are
 * recorded by GA4 Enhanced Measurement ("Page changes based on browser history events", on by default),
 * which listens to history.pushState. No manual page_view is sent on route changes, so nothing is counted twice.
 */
export default function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();
  if (!gaId || !GA_ID_PATTERN.test(gaId)) return null;

  return (
    <>
      <Script id="ga4-src" src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');`}
      </Script>
    </>
  );
}
