import Link from "next/link";
import BrandLogo from "@/components/ui/brand-logo";
import { Icon } from "@/components/ui/icon";
import type { LocationSummary } from "@/lib/property-data";
import type { SiteSettingsData } from "@/lib/site-content";

export default function SiteFooter({ locations, settings }: { locations: LocationSummary[]; settings: SiteSettingsData }) {
  const year = new Date().getFullYear();
  // Social profiles and contact details are only shown when the operator has configured them.
  const socialLinks = [
    { label: "Instagram", icon: "instagram", href: settings.instagramUrl },
    { label: "Facebook", icon: "facebook", href: settings.facebookUrl },
    { label: "LinkedIn", icon: "linkedin", href: settings.linkedinUrl },
  ].filter((s): s is { label: string; icon: string; href: string } => !!s.href && /^https:\/\//.test(s.href));
  const hasContact = settings.contactEmail || settings.contactPhone || settings.officeAddress;
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <BrandLogo tone="light" brand={settings} />
            <p>A premium property marketplace for buying, renting and listing homes across Pakistan.</p>
            {hasContact && (
              <ul className="footer-contact">
                {settings.contactPhone && (
                  <li>
                    <Icon name="phone" size={16} /> <a href={`tel:${settings.contactPhone}`}>{settings.contactPhone}</a>
                  </li>
                )}
                {settings.contactEmail && (
                  <li>
                    <Icon name="mail" size={16} /> <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
                  </li>
                )}
                {settings.officeAddress && (
                  <li>
                    <Icon name="pin" size={16} /> <span>{settings.officeAddress}</span>
                  </li>
                )}
              </ul>
            )}
            {socialLinks.length > 0 && (
              <ul className="footer-social" aria-label="Social media">
                {socialLinks.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                      <Icon name={s.icon} size={18} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <nav className="footer-col" aria-labelledby="footer-properties">
            <h2 id="footer-properties">Properties</h2>
            <ul>
              <li><Link href="/properties?status=sale">Homes for sale</Link></li>
              <li><Link href="/properties?status=rent">Homes for rent</Link></li>
              <li><Link href="/properties?sort=newest">Newest listings</Link></li>
              <li><Link href="/sell">List a property</Link></li>
            </ul>
          </nav>
          {locations.length > 0 && (
            <nav className="footer-col" aria-labelledby="footer-locations">
              <h2 id="footer-locations">Locations</h2>
              <ul>
                {locations.map((l) => (
                  <li key={l.city}>
                    <Link href={`/properties?location=${encodeURIComponent(l.city)}`}>Property in {l.city}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <nav className="footer-col" aria-labelledby="footer-company">
            <h2 id="footer-company">Company</h2>
            <ul>
              <li><Link href="/about">About Estate House</Link></li>
              <li><Link href="/agents">Find an agent</Link></li>
              <li><Link href="/contact">Contact us</Link></li>
              <li><Link href="/signin">Sign in</Link></li>
            </ul>
          </nav>
          <nav className="footer-col" aria-labelledby="footer-legal">
            <h2 id="footer-legal">Legal</h2>
            <ul>
              <li><Link href="/privacy">Privacy notice</Link></li>
              <li><Link href="/terms">Terms of use</Link></li>
            </ul>
          </nav>
        </div>
        <div className="footer-bottom">
          <p>© {year} Estate House. All rights reserved.</p>
          <p>Listing details are provided by owners and agents and should be confirmed before any transaction.</p>
        </div>
      </div>
    </footer>
  );
}
