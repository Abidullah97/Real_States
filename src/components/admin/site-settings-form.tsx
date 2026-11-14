"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Field, FormAlert, SubmitButton, submitJson, type FormMessage } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { shrinkImage } from "@/lib/shrink-image";
import type { SiteSettingsData } from "@/lib/site-content";

const TABS = [
  { id: "general", label: "General" },
  { id: "homepage", label: "Homepage" },
  { id: "seo", label: "SEO" },
  { id: "contact", label: "Contact" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const HTTPS = "Use a full link starting with https://";
const TOGGLES: { name: keyof SiteSettingsData; label: string; hint: string }[] = [
  { name: "showFeatured", label: "Featured properties", hint: "Featured listings grid below the hero." },
  { name: "showLocations", label: "Popular locations", hint: "City cards with live listing counts." },
  { name: "showCategories", label: "Property categories", hint: "Category tiles with counts." },
  { name: "showLatest", label: "Latest listings", hint: "Most recently published listings." },
  { name: "showTestimonials", label: "Testimonials", hint: "Only shown when at least one is published." },
  { name: "showAgents", label: "Agents", hint: "Only shown when approved agents exist." },
];

/** Image URL field with an upload button that stores the file and fills in the URL. */
function ImageField({ name, label, kind, value, hint, onChange }: { name: string; label: string; kind: "logo" | "favicon" | "hero" | "og"; value: string; hint: ReactNode; onChange: (v: string) => void }) {
  const [status, setStatus] = useState<FormMessage>(null);
  async function upload(file?: File) {
    if (!file) return;
    setStatus({ tone: "info", text: "Uploading…" });
    const body = new FormData();
    body.set("kind", kind);
    body.set("file", await shrinkImage(file));
    try {
      const r = await fetch("/api/admin/settings/upload", { method: "POST", body });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      onChange(j.url);
      setStatus({ tone: "success", text: j.message });
    } catch (e) {
      setStatus({ tone: "error", text: e instanceof Error ? e.message : "Upload failed." });
    }
  }
  return (
    <div className="image-field">
      <Field label={label} optional hint={hint}>
        <input className="input" name={name} type="text" inputMode="url" pattern="(https://|/uploads/).*" title={`${HTTPS}, or upload an image`} maxLength={500} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" />
      </Field>
      <div className="image-field-row">
        {value && /^(https:\/\/|\/uploads\/)/.test(value) && (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary configured URL
          <img src={value} alt="" className={`image-field-preview image-field-${kind}`} />
        )}
        <label className="btn btn-secondary btn-sm">
          <Icon name="upload" size={15} /> Upload
          <input type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        {value && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange("")}>
            Clear
          </button>
        )}
      </div>
      <FormAlert message={status} />
    </div>
  );
}

export default function SiteSettingsForm({ settings }: { settings: SiteSettingsData }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("general");
  const [message, setMessage] = useState<FormMessage>(null);
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState({ logoUrl: settings.logoUrl || "", faviconUrl: settings.faviconUrl || "", heroImageUrl: settings.heroImageUrl || "", ogImageUrl: settings.ogImageUrl || "" });
  const setImage = (key: keyof typeof images) => (v: string) => setImages((s) => ({ ...s, [key]: v }));
  const formRef = useRef<HTMLFormElement>(null);

  // An invalid field on a hidden tab would silently block saving, so reveal the tab that contains it.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const onInvalid = (e: Event) => {
      const panel = (e.target as HTMLElement).closest<HTMLElement>("[role=tabpanel]");
      const id = panel?.id.replace("panel-", "") as Tab | undefined;
      if (id && panel?.hidden) setTab(id);
    };
    form.addEventListener("invalid", onInvalid, true);
    return () => form.removeEventListener("invalid", onInvalid, true);
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    for (const [k, v] of form.entries()) body[k] = v;
    for (const t of TOGGLES) body[t.name] = form.get(t.name) === "on";
    body.featuredLimit = Number(form.get("featuredLimit"));
    try {
      const j = await submitJson("/api/admin/settings", "PATCH", body);
      setMessage({ tone: "success", text: j.message });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Settings could not be saved." });
    } finally {
      setBusy(false);
    }
  }

  // All tabs stay mounted (hidden) so one save submits every setting.
  const section = (id: Tab, children: ReactNode) => (
    <section className="settings-section" hidden={tab !== id} aria-labelledby={`tab-${id}`} role="tabpanel" id={`panel-${id}`}>
      {children}
    </section>
  );

  return (
    <form ref={formRef} className="form settings-form" onSubmit={submit}>
      <div className="status-tabs" role="tablist" aria-label="Settings sections">
        {TABS.map((t) => (
          <button key={t.id} id={`tab-${t.id}`} type="button" role="tab" aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {section(
        "general",
        <div className="form-grid">
          <Field label="Website name" optional hint="Used in page titles and the footer. Defaults to “Estate House”.">
            <input className="input" name="siteName" maxLength={80} defaultValue={settings.siteName || ""} />
          </Field>
          <Field label="Website address" optional hint="Your public URL, e.g. https://estatehouse.pk">
            <input className="input" name="websiteUrl" type="url" pattern="https://.*" title={HTTPS} maxLength={300} defaultValue={settings.websiteUrl || ""} />
          </Field>
          <ImageField name="logoUrl" label="Logo" kind="logo" value={images.logoUrl} onChange={setImage("logoUrl")} hint="Replaces the default mark in the header and footer. A wide PNG or WebP works best." />
          <ImageField name="faviconUrl" label="Favicon" kind="favicon" value={images.faviconUrl} onChange={setImage("faviconUrl")} hint="Square PNG, at least 64×64 pixels." />
        </div>,
      )}

      {section(
        "homepage",
        <>
          <div className="form-grid">
            <Field label="Hero heading" optional className="span-full" hint="Leave blank for the default “Find a place that feels like home.”">
              <input className="input" name="heroHeading" maxLength={120} defaultValue={settings.heroHeading || ""} />
            </Field>
            <Field label="Hero description" optional className="span-full">
              <textarea className="textarea" name="heroDescription" maxLength={300} rows={3} defaultValue={settings.heroDescription || ""} />
            </Field>
            <ImageField name="heroImageUrl" label="Hero background image" kind="hero" value={images.heroImageUrl} onChange={setImage("heroImageUrl")} hint="Must be hosted on Cloudinary or Unsplash. Landscape, at least 2000px wide." />
            <Field label="Featured listings shown" hint="Between 3 and 12.">
              <input className="input" name="featuredLimit" type="number" min={3} max={12} required defaultValue={settings.featuredLimit} />
            </Field>
          </div>
          <fieldset className="toggle-list">
            <legend className="form-section-title">Homepage sections</legend>
            {TOGGLES.map((t) => (
              <label key={t.name} className="checkbox">
                <input type="checkbox" name={t.name} defaultChecked={settings[t.name] as boolean} />
                <span>
                  {t.label}
                  <small>{t.hint}</small>
                </span>
              </label>
            ))}
          </fieldset>
        </>,
      )}

      {section(
        "seo",
        <div className="form-grid">
          <Field label="Website title" optional className="span-full" hint="Default browser and search title, up to 70 characters.">
            <input className="input" name="seoTitle" maxLength={70} defaultValue={settings.seoTitle || ""} />
          </Field>
          <Field label="Meta description" optional className="span-full" hint="Shown by search engines, up to 170 characters.">
            <textarea className="textarea" name="seoDescription" maxLength={170} rows={3} defaultValue={settings.seoDescription || ""} />
          </Field>
          <Field label="Default keywords" optional className="span-full" hint="Comma separated.">
            <input className="input" name="seoKeywords" maxLength={250} defaultValue={settings.seoKeywords || ""} />
          </Field>
          <ImageField name="ogImageUrl" label="Social sharing image" kind="og" value={images.ogImageUrl} onChange={setImage("ogImageUrl")} hint="Shown when links are shared. 1200×630, hosted on Cloudinary or Unsplash." />
        </div>,
      )}

      {section(
        "contact",
        <>
          <div className="form-grid">
            <Field label="Public email" optional>
              <input className="input" name="contactEmail" type="email" maxLength={254} defaultValue={settings.contactEmail || ""} />
            </Field>
            <Field label="Phone number" optional>
              <input className="input" name="contactPhone" type="tel" maxLength={40} defaultValue={settings.contactPhone || ""} />
            </Field>
            <Field label="Business address" optional className="span-full">
              <input className="input" name="officeAddress" maxLength={300} defaultValue={settings.officeAddress || ""} />
            </Field>
            <Field label="Office hours" optional>
              <input className="input" name="officeHours" maxLength={120} defaultValue={settings.officeHours || ""} />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Instagram" optional>
              <input className="input" name="instagramUrl" type="url" pattern="https://.*" title={HTTPS} maxLength={300} defaultValue={settings.instagramUrl || ""} />
            </Field>
            <Field label="Facebook" optional>
              <input className="input" name="facebookUrl" type="url" pattern="https://.*" title={HTTPS} maxLength={300} defaultValue={settings.facebookUrl || ""} />
            </Field>
            <Field label="LinkedIn" optional>
              <input className="input" name="linkedinUrl" type="url" pattern="https://.*" title={HTTPS} maxLength={300} defaultValue={settings.linkedinUrl || ""} />
            </Field>
          </div>
        </>,
      )}

      <FormAlert message={message} />
      <div className="form-actions form-actions-bar">
        <SubmitButton busy={busy} busyLabel="Saving…">
          Save all settings
        </SubmitButton>
        <p className="form-note">Settings are public information. Never put passwords or API keys here.</p>
      </div>
    </form>
  );
}
