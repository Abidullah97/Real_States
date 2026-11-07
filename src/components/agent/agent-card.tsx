import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { initials } from "@/lib/format";
import type { AgentSummary } from "@/lib/property-data";

/** Understated agent profile card. Portraits are only shown when the account has a real image. */
export default function AgentCard({ agent, headingLevel = 3 }: { agent: AgentSummary; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="agent-card">
      <div className="agent-card-head">
        <span className="avatar avatar-lg">
          {agent.image ? <Image src={agent.image} alt="" width={64} height={64} /> : initials(agent.name)}
        </span>
        <div>
          <Heading className="agent-card-name">
            <Link href={`/agents/${agent.id}`} className="stretched-link">
              {agent.name}
            </Link>
          </Heading>
          {agent.agency && <p className="agent-card-agency">{agent.agency}</p>}
        </div>
      </div>
      {agent.verified && (
        <span className="badge badge-accent agent-card-verified">
          <Icon name="shield" size={14} /> Verified agent
        </span>
      )}
      {agent.bio && <p className="agent-card-bio">{agent.bio}</p>}
      <dl className="agent-card-facts">
        <div>
          <dt>Active listings</dt>
          <dd className="num">{agent.listings}</dd>
        </div>
        {agent.cities.length > 0 && (
          <div>
            <dt>Areas</dt>
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
      <div className="agent-card-actions">
        {agent.phone && (
          <a href={`tel:${agent.phone}`} className="btn btn-secondary btn-sm">
            <Icon name="phone" size={16} /> {agent.phone}
          </a>
        )}
        <span className="text-link agent-card-more" aria-hidden="true">
          View profile <Icon name="arrow-right" size={15} />
        </span>
      </div>
    </article>
  );
}
