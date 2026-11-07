import type { ReactNode } from "react";

export default function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "start",
  id,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: "start" | "center";
  id?: string;
}) {
  return (
    <div className={`section-heading ${align === "center" ? "section-heading-center" : ""}`}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id={id}>{title}</h2>
        {description && <p className="lead">{description}</p>}
      </div>
      {action}
    </div>
  );
}
