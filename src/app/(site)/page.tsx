import Image from "next/image";
import Link from "next/link";
import AgentCard from "@/components/agent/agent-card";
import CategoryGrid from "@/components/home/category-grid";
import LocationShowcase from "@/components/home/location-showcase";
import Testimonials from "@/components/home/testimonials";
import PropertyCard from "@/components/property/property-card";
import PropertySearch from "@/components/property/property-search";
import EmptyState from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import SectionHeading from "@/components/ui/section-heading";
import { pluralize } from "@/lib/format";
import { getCategoryNames } from "@/lib/categories";
import { getAgents, getFeaturedProperties, getLocationSummaries, searchProperties } from "@/lib/property-data";
import { getCategorySummaries, getPublishedTestimonials, getSiteSettings } from "@/lib/site-content";

export const dynamic = "force-dynamic";

const HERO_IMAGE = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80";
const EDITORIAL_IMAGE = "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1400&q=80";

const VALUES = [
  { icon: "search", title: "Focused search", text: "Filter by location, type, price and bedrooms to reach the right shortlist quickly." },
  { icon: "file", title: "Transparent listings", text: "Every listing shows its price, specifications and reference number in the same clear format." },
  { icon: "shield", title: "Reviewed before publishing", text: "Owner submissions are checked by our team before they appear in search results." },
  { icon: "message", title: "Direct contact", text: "Enquiries go straight to the agent or team responsible for the property." },
];

const STEPS = [
  { icon: "compass", title: "Discover properties", text: "Search by city, budget and property type, or start with our featured selection." },
  { icon: "images", title: "Explore the details", text: "Review photographs, specifications, features and the approximate location." },
  { icon: "message", title: "Contact the agent", text: "Send an enquiry from the listing and arrange a viewing at a time that suits you." },
];

export default async function HomePage() {
  const settings = await getSiteSettings();
  const limit = settings.featuredLimit;
  const [featured, result, latest, locations, categories, testimonials, agents, cityOptions, types] = await Promise.all([
    getFeaturedProperties(limit),
    searchProperties({ pageSize: limit }),
    searchProperties({ sort: "latest", pageSize: 3 }),
    getLocationSummaries(4),
    getCategorySummaries(),
    getPublishedTestimonials(3),
    getAgents(3),
    getLocationSummaries(20, { images: false }),
    getCategoryNames(),
  ]);
  // Featured listings in the admin-defined order, topped up with recent listings so the grid has complete rows.
  const ordered = [...featured, ...result.items.filter((p) => !featured.some((f) => f.slug === p.slug))].slice(0, limit);
  const showcase = ordered.slice(0, ordered.length >= 3 ? ordered.length - (ordered.length % 3) : ordered.length);
  const heroImage = settings.heroImageUrl || HERO_IMAGE;

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-frame">
          <Image className="hero-image" src={heroImage} alt={settings.heroImageUrl ? "" : "Contemporary two-storey house at dusk with warm light in the living spaces"} fill priority sizes="100vw" />
          <div className="hero-shade" aria-hidden="true" />
          <div className="hero-inner">
            <div className="container">
              <div className="hero-content">
                <p className="eyebrow hero-eyebrow">Premium homes across Pakistan</p>
                <h1 id="hero-title">
                  {settings.heroHeading || (
                    <>
                      Find a place that <em>feels like home.</em>
                    </>
                  )}
                </h1>
                <p className="hero-lead">{settings.heroDescription || "Buy, rent or list exceptional properties with clear information, reviewed listings and direct access to trusted agents."}</p>
                {result.total > 0 && !result.demo && (
                  <p className="hero-stat">
                    <span className="num">{pluralize(result.total, "property", "properties")}</span> currently listed
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="container">
          <div className="hero-search-wrap">
            <PropertySearch cities={cityOptions.map((c) => c.city)} types={types} />
          </div>
        </div>
      </section>

      {settings.showFeatured && (
      <section className="section" aria-labelledby="featured-title">
        <div className="container">
          <SectionHeading
            id="featured-title"
            eyebrow="Featured properties"
            title="Exceptional homes, selected for you"
            description="A curated selection of houses, villas and apartments with clear pricing and specifications."
            action={
              <Link href="/properties" className="btn btn-secondary">
                View all properties <Icon name="arrow-right" size={16} />
              </Link>
            }
          />
          {showcase.length ? (
            <div className="property-grid">
              {showcase.map((p, i) => (
                <PropertyCard key={p.slug} property={p} priority={i < 3} />
              ))}
            </div>
          ) : (
            <EmptyState title="New listings are on the way" description="Published properties will appear here as soon as they are approved." action={<Link href="/sell" className="btn">List a property</Link>} />
          )}
          {result.demo && (
            <p className="alert alert-neutral demo-notice">
              <Icon name="info" size={18} />
              The database is not connected, so illustrative demonstration listings are shown. Details and availability are not real.
            </p>
          )}
        </div>
      </section>
      )}

      {settings.showLocations && locations.length > 0 && (
        <section className="section section-surface" aria-labelledby="locations-title">
          <div className="container">
            <SectionHeading id="locations-title" eyebrow="Popular locations" title="Explore the most sought-after areas" description="Browse current listings city by city. Counts reflect published properties." />
            <LocationShowcase locations={locations} />
          </div>
        </section>
      )}

      {settings.showCategories && categories.length > 0 && (
        <section className="section" aria-labelledby="categories-title">
          <div className="container">
            <SectionHeading id="categories-title" eyebrow="Property categories" title="Find the right kind of home" align="center" />
            <CategoryGrid categories={categories} />
          </div>
        </section>
      )}

      <section className="section section-navy" aria-labelledby="why-title">
        <div className="container editorial-split">
          <div className="editorial-media">
            <Image src={EDITORIAL_IMAGE} alt="Timber-clad entrance of a contemporary house lit at dusk" fill sizes="(max-width: 900px) 100vw, 50vw" />
          </div>
          <div className="editorial-copy">
            <p className="eyebrow">Why choose Estate House</p>
            <h2 id="why-title">A calmer, clearer way to find property.</h2>
            <p className="lead">Property decisions deserve reliable information. We organise every listing the same way, so you can compare homes with confidence and spend your time on the ones that matter.</p>
            <ul className="value-list">
              {VALUES.map((v) => (
                <li key={v.title}>
                  <span className="value-icon">
                    <Icon name={v.icon} size={20} />
                  </span>
                  <div>
                    <h3>{v.title}</h3>
                    <p>{v.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {settings.showLatest && latest.items.length > 0 && (
        <section className="section" aria-labelledby="latest-title">
          <div className="container">
            <SectionHeading
              id="latest-title"
              eyebrow="Latest listings"
              title="Newly added to the market"
              action={
                <Link href="/properties?sort=newest" className="btn btn-secondary">
                  See all new listings <Icon name="arrow-right" size={16} />
                </Link>
              }
            />
            <div className="property-grid">
              {latest.items.map((p) => (
                <PropertyCard key={p.slug} property={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section section-deep" aria-labelledby="steps-title">
        <div className="container">
          <SectionHeading id="steps-title" eyebrow="How it works" title="From first search to first visit" align="center" />
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="step">
                <span className="step-number num">{String(i + 1).padStart(2, "0")}</span>
                <span className="step-icon">
                  <Icon name={s.icon} size={22} />
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {settings.showTestimonials && testimonials.length > 0 && (
        <section className="section" aria-labelledby="testimonials-title">
          <div className="container">
            <SectionHeading id="testimonials-title" eyebrow="Client stories" title="What our clients say" align="center" />
            <Testimonials items={testimonials} />
          </div>
        </section>
      )}

      {settings.showAgents && agents.length > 0 && (
        <section className={`section ${settings.showTestimonials && testimonials.length ? "section-surface" : ""}`} aria-labelledby="agents-title">
          <div className="container">
            <SectionHeading
              id="agents-title"
              eyebrow="Trusted agents"
              title="Agents who know the neighbourhood"
              action={
                <Link href="/agents" className="btn btn-secondary">
                  All agents <Icon name="arrow-right" size={16} />
                </Link>
              }
            />
            <div className="agent-grid">
              {agents.map((a) => (
                <AgentCard key={a.id} agent={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="cta-band" aria-labelledby="cta-title">
        <div className="cta-inner">
          <div>
            <p className="eyebrow">Ready when you are</p>
            <h2 id="cta-title">Find your next property today.</h2>
            <p>
              Browse every published listing, or <Link href="/sell">submit your own property</Link> for review.
            </p>
          </div>
          <Link href="/properties" className="btn btn-lg btn-gold">
            Browse properties <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
