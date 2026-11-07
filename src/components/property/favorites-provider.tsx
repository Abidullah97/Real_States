"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

type FavoritesValue = {
  saved: Set<string>;
  loaded: boolean;
  pending: Set<string>;
  toggle: (slug: string, title?: string) => Promise<boolean | null>;
};

const FavoritesContext = createContext<FavoritesValue | null>(null);

/** Loads the signed-in visitor's saved homes once and shares them with every favourite button. */
export function FavoritesProvider({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();
  const notify = useToast();

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    fetch("/api/favorites")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.slugs) return;
        setSaved(new Set<string>(d.slugs));
        setLoaded(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const toggle = useCallback(
    async (slug: string, title?: string) => {
      const isSaved = saved.has(slug);
      setPending((p) => new Set(p).add(slug));
      try {
        const response = await fetch(`/api/favorites/${encodeURIComponent(slug)}`, { method: isSaved ? "DELETE" : "POST" });
        if (response.status === 401) {
          notify("Sign in to save homes to your account.", "info");
          router.push(`/signin?callbackUrl=${encodeURIComponent(pathname || "/")}`);
          return null;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Saved homes are unavailable right now.");
        const next = !!data.saved;
        setLoaded(true);
        setSaved((s) => {
          const copy = new Set(s);
          if (next) copy.add(slug);
          else copy.delete(slug);
          return copy;
        });
        notify(next ? `${title || "Home"} saved to your account.` : `${title || "Home"} removed from saved homes.`);
        return next;
      } catch (e) {
        notify(e instanceof Error ? e.message : "Saved homes are unavailable right now.", "error");
        return null;
      } finally {
        setPending((p) => {
          const copy = new Set(p);
          copy.delete(slug);
          return copy;
        });
      }
    },
    [saved, notify, router, pathname],
  );

  return <FavoritesContext.Provider value={{ saved, loaded, pending, toggle }}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
