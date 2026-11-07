import type { Metadata } from "next";
import Link from "next/link";
import InquiryForm from "@/components/forms/inquiry-form";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import { Icon } from "@/components/ui/icon";
import { getSiteSettings } from "@/lib/site-content";

export const metadata: Metadata = { title: "Contact us", description: "Send the Estate House team a message about buying, renting or listing a property." };

const TOPICS = [
  { icon: "search", title: "Looking for a property", text: "Tell us the area, budget and type of home you need.", href: "/properties", link: "Browse properties" },
  { icon: "building", title: "Listing a property", text: "Submit your property for review and we’ll be in touch.", href: "/sell", link: "List a property" },
  { icon: "users", title: "Working with an agent", text: "Find professionals who know your neighbourhood.", href: "/agents", link: "Find an agent" },
];

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const details = [
    settings.contactPhone && { icon: "phone", label: "Call us", value: settings.contactPhone, href: `tel:${settings.contactPhone}` },
    settings.contactEmail && { icon: "mail", label: "Email", value: settings.contactEmail, href: `mailto:${settings.contactEmail}` },
    settings.officeAddress && { icon: "pin", label: "Office", value: settings.officeAddress },
    settings.officeHours && { icon: "calendar", label: "Hours", value: settings.officeHours },
  ].filter(Boolean) as { icon: string; label: string; value: string; href?: string }[];
  return (
    <div className="container contact-page">
      <header className="page-head">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      </header>
      <div className="contact-layout">
        <div>
          <p className="eyebrow">Get in touch</p>
          <h1 className="contact-title">How can we help?</h1>
          <p className="lead">Send us a message and the right person on our team will respond by email. For a specific property, use the enquiry form on its listing page so your message reaches the team handling it.</p>
          {details.length > 0 && (
            <dl className="contact-details">
              {details.map((d) => (
                <div key={d.label}>
                  <dt>
                    <Icon name={d.icon} size={18} /> {d.label}
                  </dt>
                  <dd>{d.href ? <a href={d.href}>{d.value}</a> : d.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <ul className="contact-topics">
            {TOPICS.map((t) => (
              <li key={t.title}>
                <span className="value-icon">
                  <Icon name={t.icon} size={20} />
                </span>
                <div>
                  <h2>{t.title}</h2>
                  <p>{t.text}</p>
                  <Link href={t.href} className="text-link">
                    {t.link} <Icon name="arrow-right" size={15} />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="inquiry-card contact-card">
          <h2>Send a message</h2>
          <p className="inquiry-card-lead">Fields marked with an asterisk are required.</p>
          <InquiryForm defaultMessage="" submitLabel="Send message" />
        </div>
      </div>
    </div>
  );
}
