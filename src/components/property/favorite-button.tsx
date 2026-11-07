"use client";
import { useRouter } from "next/navigation";
import { useFavorites } from "@/components/property/favorites-provider";
import { Icon } from "@/components/ui/icon";

export default function FavoriteButton({
  slug,
  title,
  initial = false,
  refreshOnChange = false,
  variant = "overlay",
}: {
  slug: string;
  title?: string;
  initial?: boolean;
  refreshOnChange?: boolean;
  variant?: "overlay" | "outline";
}) {
  const favorites = useFavorites();
  const router = useRouter();
  const saved = favorites ? (favorites.loaded ? favorites.saved.has(slug) : initial) : initial;
  const busy = favorites?.pending.has(slug) ?? false;

  async function toggle() {
    if (!favorites || busy) return;
    const result = await favorites.toggle(slug, title);
    if (result !== null && refreshOnChange) router.refresh();
  }

  const label = saved ? `Remove ${title || "this home"} from saved homes` : `Save ${title || "this home"}`;
  return (
    <button
      type="button"
      className={`favorite-button favorite-${variant} ${saved ? "is-saved" : ""}`}
      onClick={toggle}
      aria-label={label}
      aria-pressed={saved}
      disabled={busy}
      title={saved ? "Saved" : "Save"}
    >
      <Icon name="heart" size={18} strokeWidth={1.8} />
      {variant === "outline" && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
