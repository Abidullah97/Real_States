import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import InquiryForm from "@/components/forms/inquiry-form";
import PropertyCard from "@/components/property/property-card";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import EmptyState from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { initials, pluralize } from "@/lib/format";
import { getAgentProfile } from "@/lib/property-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const agent = await getAgentProfile((await params).id);
  if (!agent) return { title: "Agent not found" };
  return { title: `${agent.name}${agent.agency ? `, ${agent.agency}` : ""}`, description: agent.bio?.slice(0, 150) || `Properties listed by ${agent.name} on Estate House.` };
}

export default async function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const agent = await getAgentProfile((await params).id);
  if (!agent) notFound();

  return (
    <div className="container agent-profile">
      <header className="page-head">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Agents", href: "/agents" }, { label: agent.name }]} />
      </header>

      <div className="agent-profile-layout">
        <div>
          <section className="agent-hero card card-pad" aria-labelledby="agent-name">
            <span className="avatar agent-hero-avatar">{agent.image ? <Image src={agent.image} alt="" width={96} height={96} /> : initials(agent.name)}</span>
            <div className="agent-hero-text">
              <div className="agent-hero-title">
                <h1 id="agent-name">{agent.name}</h1>
                {agent.verified && (
                  <span className="badge badge-accent">
                    <Icon name="shield" size={14} /> Verified agent
                  </span>
                )}
              </div>
              <p className="agent-hero-agency">{agent.agency || "Independent agent"}</p>
              <dl className="agent-hero-facts">
                <div>
                  <dt>Active listings</dt>
                  <dd className="num">{agent.listings}</dd>
                </div>
                {agent.cities.length > 0 && (
                  <div>
                    <dt>Areas covered</dt>
                    <dd>{agent.cities.join(", ")}</dd>
                  </div>
                )}
                {agent.specialties.length > 0 && (
                  <div>
                    <dt>Specialises in</dt>
                    <dd>{agent.specialties.join(", ")}</dd>
                  </div>
                )}
              </dl>
            </div>
          </section>

          {agent.bio && (
            <section className="detail-section" aria-labelledby="about-agent">
              <h2 id="about-agent">About {agent.name.split(" ")[0]}</h2>
              <p className="prose">{agent.bio}</p>
            </section>
          )}

          <section className="detail-section" aria-labelledby="agent-listings">
            <h2 id="agent-listings">{agent.listings ? `${pluralize(agent.listings, "listing")} by ${agent.name.split(" ")[0]}` : "Listings"}</h2>
            {agent.listingsItems.length ? (
              <div className="property-grid agent-listing-grid">
                {agent.listingsItems.map((p) => (
                  <PropertyCard key={p.slug} property={p} />
                ))}
              </div>
            ) : (
              <EmptyState headingLevel={3} icon="building" title="No published listings right now" description="New listings from this agent will appear here." action={<Link href="/properties" className="btn btn-secondary">Browse all properties</Link>} />
            )}
          </section>
        </div>

        <aside className="detail-aside" aria-labelledby="contact-agent">
          <div className="inquiry-card">
            <h2 id="contact-agent">Contact {agent.name.split(" ")[0]}</h2>
            <p className="inquiry-card-lead">Send a message and the Estate House team will pass it on promptly.</p>
            {agent.phone && (
              <a href={`tel:${agent.phone}`} className="btn btn-secondary btn-block agent-call">
                <Icon name="phone" size={17} /> Call {agent.phone}
              </a>
            )}
            <InquiryForm defaultMessage={`Hello ${agent.name.split(" ")[0]}, I’d like help finding a property.`} submitLabel="Send message" />
          </div>
        </aside>
      </div>
    </div>
  );
}
