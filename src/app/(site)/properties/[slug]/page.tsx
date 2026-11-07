import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import FavoriteButton from "@/components/property/favorite-button";
import InquiryForm from "@/components/forms/inquiry-form";
import PropertyGallery from "@/components/property/property-gallery";
import PropertyMap from "@/components/property/property-map";
import ShareButton from "@/components/property/share-button";
import PropertyCard, { PriceTag } from "@/components/property/property-card";
import { PropertyFacts, SpecificationRow } from "@/components/property/property-specifications";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import SectionHeading from "@/components/ui/section-heading";
import { Icon } from "@/components/ui/icon";
import { initials } from "@/lib/format";
import { getPropertyDetails, getSimilarProperties } from "@/lib/property-data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPropertyDetails(slug);
  if (!p) return { title: "Property not found" };
  return {
    title: `${p.title}, ${p.location}`,
    description: `${p.priceLabel} · ${p.kind} ${p.status.toLowerCase()} in ${p.location}. ${p.description?.slice(0, 110) || ""}`.trim(),
    openGraph: { images: p.image ? [p.image] : [] },
  };
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getPropertyDetails(slug);
  if (!p) notFound();
  const images = p.images?.length ? p.images : [{ url: p.image, alt: `${p.title}` }];
  const similar = await getSimilarProperties(p);
  const listingsHref = `/properties?status=${p.listingType === "RENT" ? "rent" : "sale"}`;

  return (
    <>
      <div className="container detail-page">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: p.listingType === "RENT" ? "For rent" : "For sale", href: listingsHref },
            { label: p.city, href: `/properties?location=${encodeURIComponent(p.city)}` },
            { label: p.title },
          ]}
        />

        <header className="detail-head">
          <div className="detail-head-main">
            <div className="detail-badges">
              <span className="badge badge-accent">{p.status}</span>
              <span className="badge badge-neutral">{p.kind}</span>
              {p.featured && <span className="badge badge-neutral">Featured</span>}
            </div>
            <h1>{p.title}</h1>
            <p className="detail-location">
              <Icon name="pin" size={17} />
              {p.location}
            </p>
          </div>
          <div className="detail-head-side">
            <PriceTag label={p.priceLabel} className="detail-price" />
            {p.reference && <p className="detail-ref num">Ref. {p.reference}</p>}
            <div className="detail-actions">
              <ShareButton title={p.title} />
              <FavoriteButton slug={p.slug} title={p.title} variant="outline" />
            </div>
          </div>
        </header>

        <PropertyGallery images={images} title={p.title} />

        {p.isDemo && (
          <p className="alert alert-neutral demo-notice">
            <Icon name="info" size={18} />
            This is a demonstration listing shown because the database is not connected. It is not a real property.
          </p>
        )}

        <div className="detail-layout">
          <div className="detail-main">
            <SpecificationRow property={p} />

            {p.description && (
              <section className="detail-section" aria-labelledby="overview">
                <h2 id="overview">Overview</h2>
                <p className="prose">{p.description}</p>
              </section>
            )}

            {p.features && p.features.length > 0 && (
              <section className="detail-section" aria-labelledby="features">
                <h2 id="features">Features and amenities</h2>
                <ul className="feature-list">
                  {p.features.map((f) => (
                    <li key={f}>
                      <Icon name="check" size={18} />
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="detail-section" aria-labelledby="details">
              <h2 id="details">Property details</h2>
              <PropertyFacts property={p} />
            </section>

            <section className="detail-section" aria-labelledby="location">
              <h2 id="location">Location</h2>
              <PropertyMap latitude={p.latitude} longitude={p.longitude} area={p.location} />
              <p className="form-note">The map shows the general area. The exact address is shared by the owner or agent when appropriate.</p>
            </section>

            {p.agent && (
              <section className="detail-section" aria-labelledby="agent">
                <h2 id="agent">Listed by</h2>
                <div className="detail-agent">
                  <span className="avatar avatar-lg">{p.agent.image ? <Image src={p.agent.image} alt="" width={64} height={64} /> : initials(p.agent.name)}</span>
                  <div>
                    <p className="detail-agent-name">
                      {p.agent.profileId ? <Link href={`/agents/${p.agent.profileId}`}>{p.agent.name}</Link> : p.agent.name}
                      {p.agent.verified && (
                        <span className="badge badge-accent">
                          <Icon name="shield" size={14} /> Verified agent
                        </span>
                      )}
                    </p>
                    {p.agent.agency && <p className="detail-agent-agency">{p.agent.agency}</p>}
                  </div>
                  {p.agent.phone && (
                    <a href={`tel:${p.agent.phone}`} className="btn btn-secondary">
                      <Icon name="phone" size={16} /> {p.agent.phone}
                    </a>
                  )}
                </div>
              </section>
            )}
          </div>

          <aside className="detail-aside" id="enquire" aria-labelledby="enquire-title">
            <div className="inquiry-card">
              <div className="inquiry-card-head">
                <PriceTag label={p.priceLabel} />
                <p>
                  {p.kind} · {p.location}
                </p>
              </div>
              <h2 id="enquire-title">Enquire about this property</h2>
              <p className="inquiry-card-lead">
                {p.agent ? `Your message goes to ${p.agent.name}.` : "Your message goes to the Estate House team handling this listing."}
              </p>
              <InquiryForm propertySlug={p.slug} />
              <p className="form-note">We use your details only to respond to this enquiry. See our <Link href="/privacy">privacy notice</Link>.</p>
            </div>
          </aside>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="section section-surface" aria-labelledby="similar-title">
          <div className="container">
            <SectionHeading
              id="similar-title"
              eyebrow="You may also like"
              title="Similar properties"
              action={
                <Link href={`/properties?location=${encodeURIComponent(p.city)}`} className="btn btn-secondary">
                  More in {p.city} <Icon name="arrow-right" size={16} />
                </Link>
              }
            />
            <div className="property-grid">
              {similar.map((s) => (
                <PropertyCard key={s.slug} property={s} />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="mobile-contact-bar">
        <PriceTag label={p.priceLabel} />
        <a href="#enquire" className="btn">
          <Icon name="message" size={17} /> Enquire
        </a>
      </div>
    </>
  );
}
