import type { Metadata } from "next";
import Link from "next/link";
import AgentCard from "@/components/agent/agent-card";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import EmptyState from "@/components/ui/empty-state";
import { pluralize } from "@/lib/format";
import { getAgents } from "@/lib/property-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Find an agent", description: "Property professionals who list homes on Estate House." };

export default async function AgentsPage() {
  const agents = await getAgents();
  return (
    <div className="container agents-page">
      <header className="page-head">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Agents" }]} />
        <p className="eyebrow">Local expertise</p>
        <h1>Find an agent who knows the area</h1>
        <p className="lead">
          {agents.length
            ? `${pluralize(agents.length, "agent")} currently list properties on Estate House. Verified agents have had their details confirmed by our team.`
            : "Agent profiles appear here once they have been set up by an administrator."}
        </p>
      </header>
      {agents.length ? (
        <div className="agent-grid">
          {agents.map((a) => (
            <AgentCard key={a.id} agent={a} headingLevel={2} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="users"
          title="Our agent directory is being prepared"
          description="In the meantime, our team can help with any property question."
          action={
            <Link href="/contact" className="btn">
              Contact the team
            </Link>
          }
        />
      )}
    </div>
  );
}
