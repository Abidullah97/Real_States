import type { ReactNode } from "react";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import { Icon } from "@/components/ui/icon";

export default function LegalPage({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <div className="container-narrow legal-page">
      <header className="page-head">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: title }]} />
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </header>
      <p className="alert alert-warning">
        <Icon name="alert" size={18} />
        This page is a draft and not legal advice. It must be reviewed and replaced by the site operator before launch.
      </p>
      <div className="legal-body">{children}</div>
    </div>
  );
}
