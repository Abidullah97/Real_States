"use client";
import { useState, type FormEvent } from "react";
import { Field, FormAlert, SubmitButton, submitJson, type FormMessage } from "@/components/ui/form";

export type PropertyRow = {
  id: string;
  slug: string;
  reference: string;
  title: string;
  description: string;
  status: string;
  listingType: string;
  propertyType: string;
  price: string | number;
  currency: string;
  area: string | number;
  areaUnit: string;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  featured: boolean;
  featuredOrder?: number;
  featuredUntil?: Date | string | null;
  rejectionReason?: string | null;
  address: string | null;
  agentId?: string | null;
  createdAt?: Date | string;
  updatedAt: Date | string;
  owner?: { name: string | null; email: string } | null;
  agent?: { name: string | null; email: string } | null;
  features: { name: string }[];
  images: { id: string; url: string; alt: string; position: number }[];
  location: { country?: string; province?: string | null; city: string; area?: string | null; locality: string | null; latitude: number | null; longitude: number | null };
};

export type FormOptions = { categories: string[]; agents: { id: string; name: string }[] };

const dateInput = (v?: Date | string | null) => (v ? new Date(v).toISOString().slice(0, 10) : "");

/** Create/edit form for a listing, grouped into the sections an editor works through. */
export default function PropertyForm({ item, onSaved, isAdmin, options }: { item?: PropertyRow; onSaved: (message: string) => void; isAdmin: boolean; options: FormOptions }) {
  const [message, setMessage] = useState<FormMessage>(null);
  const [busy, setBusy] = useState(false);
  const categories = item && !options.categories.includes(item.propertyType) ? [item.propertyType, ...options.categories] : options.categories;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const d = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    const body: Record<string, unknown> = {
      ...d,
      features: String(d.features || "")
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x.length >= 2),
    };
    if (isAdmin) {
      body.featured = d.featured === "on";
      body.agentId = d.agentId || null;
      body.featuredUntil = d.featuredUntil || null;
    } else {
      delete body.agentId;
      delete body.featuredUntil;
      delete body.featuredOrder;
    }
    if (!item) body.status = isAdmin ? d.status || "DRAFT" : submitter?.value === "PENDING" ? "PENDING" : "DRAFT";
    try {
      const json = await submitJson(item ? `/api/admin/properties/${item.id}` : "/api/admin/properties", item ? "PATCH" : "POST", body);
      if (!item) form.reset();
      onSaved(json.message || "Saved.");
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Could not save property." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form property-form" onSubmit={submit}>
      {item?.status === "REJECTED" && item.rejectionReason && (
        <div className="alert alert-error">
          <strong>Rejected:</strong> {item.rejectionReason}
        </div>
      )}
      <section className="form-section">
        <h3 className="form-section-title">Basics</h3>
        <div className="form-grid">
          <Field label="Title" className="span-full" hint="5–140 characters. Shown as the listing headline.">
            <input className="input" name="title" required minLength={5} maxLength={140} defaultValue={item?.title} />
          </Field>
          <Field label="Listing type">
            <select className="select" name="listingType" defaultValue={item?.listingType || "SALE"}>
              <option value="SALE">For sale</option>
              <option value="RENT">For rent</option>
            </select>
          </Field>
          <Field label="Category">
            <select className="select" name="propertyType" defaultValue={item?.propertyType || categories[0]} required>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Description" className="span-full" hint="At least 30 characters.">
            <textarea className="textarea" name="description" required minLength={30} maxLength={8000} rows={6} defaultValue={item?.description} />
          </Field>
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">Price and size</h3>
        <div className="form-grid form-grid-3">
          <Field label="Price">
            <input className="input" name="price" type="number" inputMode="decimal" min={1} step="0.01" required defaultValue={item?.price} />
          </Field>
          <Field label="Currency" hint="Three-letter code, e.g. PKR">
            <input className="input" name="currency" pattern="[A-Z]{3}" title="Use a three-letter upper case code such as PKR." maxLength={3} defaultValue={item?.currency || "PKR"} required />
          </Field>
          <div className="field-pair">
            <Field label="Area">
              <input className="input" name="area" type="number" inputMode="decimal" min={0.01} step="0.01" required defaultValue={item?.area} />
            </Field>
            <Field label="Unit">
              <select className="select" name="areaUnit" defaultValue={item?.areaUnit || "sq ft"}>
                <option>sq ft</option>
                <option>sq m</option>
                <option>marla</option>
                <option>kanal</option>
              </select>
            </Field>
          </div>
          <Field label="Bedrooms">
            <input className="input" name="bedrooms" type="number" min={0} max={50} defaultValue={item?.bedrooms ?? 0} />
          </Field>
          <Field label="Bathrooms">
            <input className="input" name="bathrooms" type="number" min={0} max={50} defaultValue={item?.bathrooms ?? 0} />
          </Field>
          <Field label="Parking spaces">
            <input className="input" name="parking" type="number" min={0} max={50} defaultValue={item?.parking ?? 0} />
          </Field>
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">Location</h3>
        <div className="form-grid">
          <Field label="Country">
            <input className="input" name="country" required minLength={2} maxLength={60} defaultValue={item?.location.country || "Pakistan"} />
          </Field>
          <Field label="Province" optional>
            <input className="input" name="province" maxLength={80} defaultValue={item?.location.province || ""} placeholder="e.g. Punjab" />
          </Field>
          <Field label="City">
            <input className="input" name="city" required minLength={2} maxLength={100} defaultValue={item?.location.city} />
          </Field>
          <Field label="Area" optional hint="e.g. DHA, Gulberg">
            <input className="input" name="locationArea" maxLength={100} defaultValue={item?.location.area || ""} />
          </Field>
          <Field label="Neighbourhood" optional hint="e.g. Phase 6, Block C">
            <input className="input" name="locality" maxLength={100} defaultValue={item?.location.locality || ""} />
          </Field>
          <Field label="Street address" optional hint="Kept private; only the neighbourhood and city are public.">
            <input className="input" name="address" maxLength={300} defaultValue={item?.address || ""} />
          </Field>
          <Field label="Latitude" optional hint="Approximate, used for the map.">
            <input className="input" name="latitude" type="number" min={-90} max={90} step="any" defaultValue={item?.location.latitude ?? ""} />
          </Field>
          <Field label="Longitude" optional>
            <input className="input" name="longitude" type="number" min={-180} max={180} step="any" defaultValue={item?.location.longitude ?? ""} />
          </Field>
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">Amenities</h3>
        <Field label="Features and amenities" optional hint="Separate with commas, e.g. Private garden, Solar panels, Covered parking.">
          <input className="input" name="features" maxLength={1500} defaultValue={item?.features.map((f) => f.name).join(", ") || ""} />
        </Field>
      </section>

      {isAdmin && (
        <section className="form-section">
          <h3 className="form-section-title">Agent and publishing</h3>
          <div className="form-grid">
            <Field label="Assigned agent" optional hint="Shown on the listing as the contact.">
              <select className="select" name="agentId" defaultValue={item?.agentId || ""}>
                <option value="">No agent</option>
                {options.agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            {!item && (
              <Field label="Initial status">
                <select className="select" name="status" defaultValue="DRAFT">
                  <option value="DRAFT">Save as draft</option>
                  <option value="PUBLISHED">Publish immediately</option>
                </select>
              </Field>
            )}
          </div>
          <label className="checkbox">
            <input type="checkbox" name="featured" defaultChecked={item?.featured || false} />
            <span>
              Feature this listing
              <small>Featured listings appear first on the homepage and in search results.</small>
            </span>
          </label>
          <div className="form-grid">
            <Field label="Featured order" hint="Lower numbers appear first.">
              <input className="input" name="featuredOrder" type="number" min={0} max={10000} defaultValue={item?.featuredOrder ?? 0} />
            </Field>
            <Field label="Featured until" optional hint="Leave blank to keep it featured until removed.">
              <input className="input" name="featuredUntil" type="date" defaultValue={dateInput(item?.featuredUntil)} />
            </Field>
          </div>
        </section>
      )}

      <FormAlert message={message} />
      <div className="form-actions form-actions-sticky">
        <SubmitButton busy={busy} busyLabel="Saving…">
          {item ? "Save changes" : isAdmin ? "Create listing" : "Save as draft"}
        </SubmitButton>
        {!isAdmin && !item && (
          <button type="submit" name="intent" value="PENDING" className="btn btn-gold" disabled={busy}>
            Save & submit for review
          </button>
        )}
      </div>
    </form>
  );
}
