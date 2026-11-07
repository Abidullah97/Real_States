"use client";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";

/** Uses the native share sheet where available, otherwise copies the page link. */
export default function ShareButton({ title }: { title: string }) {
  const notify = useToast();
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      notify("Link copied to your clipboard.");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      notify("Couldn’t share this page. Copy the address from your browser instead.", "error");
    }
  }
  return (
    <button type="button" className="btn btn-secondary share-button" onClick={share}>
      <Icon name="share" size={17} /> Share
    </button>
  );
}
