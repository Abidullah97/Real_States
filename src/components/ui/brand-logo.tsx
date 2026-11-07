import Link from "next/link";

/** Geometric arch-and-threshold mark with the Estate House wordmark. */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path d="M9 24V14.5a7 7 0 0 1 14 0V24" fill="none" stroke="var(--brand-mark-ink, #f8f9fb)" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 24v-7.5a3 3 0 0 1 6 0V24" fill="none" stroke="var(--brand-mark-accent, #c49a55)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export type Branding = { logoUrl?: string | null; siteName?: string | null };

/** Uses the uploaded logo and site name from Site settings when set, otherwise the built-in mark. */
export default function BrandLogo({ href = "/", tone = "dark", className = "", brand }: { href?: string; tone?: "dark" | "light"; className?: string; brand?: Branding }) {
  const name = brand?.siteName?.trim() || "Estate House";
  const [first, ...rest] = name.split(" ");
  return (
    <Link href={href} className={`brand brand-${tone} ${className}`} aria-label={`${name} home`}>
      {brand?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- operator-supplied logo URL from any https host
        <img src={brand.logoUrl} alt="" className="brand-logo-img" />
      ) : (
        <BrandMark />
      )}
      <span className="brand-word">
        {first}
        {rest.length > 0 && <span>{rest.join(" ")}</span>}
      </span>
    </Link>
  );
}
