import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

export default function EmptyState({
  icon = "home",
  title,
  description,
  action,
  headingLevel = 2,
  className = "",
}: {
  icon?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className={`empty-state ${className}`}>
      <span className="empty-state-icon">
        <Icon name={icon} size={24} />
      </span>
      <Heading>{title}</Heading>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
