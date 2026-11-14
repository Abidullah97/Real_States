"use client";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Field, FormAlert, SubmitButton, type FormMessage } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { shrinkImage } from "@/lib/shrink-image";

const MAX_PHOTOS = 5;
const MAX_BYTES = 10 * 1024 * 1024;

export default function SellForm({ categories }: { categories: string[] }) {
  const [message, setMessage] = useState<FormMessage>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [previews, setPreviews] = useState<{ url: string; name: string }[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [listingType, setListingType] = useState<"SALE" | "RENT">("SALE");
  const [descriptionLength, setDescriptionLength] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  function updatePhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files || [])];
    let error = "";
    if (files.length > MAX_PHOTOS) error = `Choose up to ${MAX_PHOTOS} photos. You selected ${files.length}.`;
    else if (files.some((f) => f.size > MAX_BYTES)) error = "Each photo must be 10 MB or smaller.";
    e.target.setCustomValidity(error);
    setPhotoError(error);
    setPreviews(files.slice(0, MAX_PHOTOS).map((f) => ({ url: URL.createObjectURL(f), name: f.name })));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (photoError) {
      fileRef.current?.focus();
      return;
    }
    setBusy(true);
    setMessage(null);
    const form = e.currentTarget;
    try {
      const body = new FormData(form);
      const photos = body.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
      body.delete("images");
      // Keep the whole request well under Vercel's 4.5 MB body limit.
      const perPhoto = Math.min(1.5 * 1024 * 1024, Math.floor((3.6 * 1024 * 1024) / Math.max(1, photos.length)));
      for (const photo of photos) body.append("images", await shrinkImage(photo, { maxBytes: perPhoto, maxDimension: 2000 }));
      const response = await fetch("/api/submissions", { method: "POST", body });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not submit your listing.");
      setMessage({ tone: "success", text: json.message });
      setDone(true);
      form.reset();
      setPreviews([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Could not submit your listing." });
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div className="card card-pad sell-done">
        <span className="dialog-icon">
          <Icon name="check-circle" size={24} />
        </span>
        <h2>Submission received</h2>
        <FormAlert message={message} />
        <p className="lead">We review every submission before it can be published. If anything needs clarifying, we’ll contact you using the details you provided.</p>
        <div className="form-actions">
          <button type="button" className="btn" onClick={() => { setDone(false); setMessage(null); }}>
            Submit another property
          </button>
        </div>
      </div>
    );

  return (
    <form className="form sell-form card card-pad" onSubmit={submit}>
      <section className="form-section" aria-labelledby="sell-contact">
        <h2 id="sell-contact" className="form-section-title">Your contact details</h2>
        <p>We use these to confirm the listing with you. They are not published.</p>
        <div className="form-grid">
          <Field label="Full name">
            <input className="input" name="name" required minLength={2} maxLength={100} autoComplete="name" />
          </Field>
          <Field label="Phone">
            <input className="input" name="phone" type="tel" required minLength={7} maxLength={30} autoComplete="tel" placeholder="+92 300 0000000" />
          </Field>
          <Field label="Email address" className="span-full">
            <input className="input" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="name@example.com" />
          </Field>
        </div>
      </section>

      <section className="form-section" aria-labelledby="sell-property">
        <h2 id="sell-property" className="form-section-title">About the property</h2>
        <p>Accurate details help buyers and renters find your listing.</p>
        <fieldset className="segmented">
          <legend>I want to</legend>
          {(["SALE", "RENT"] as const).map((t) => (
            <label key={t}>
              <input type="radio" name="listingType" value={t} checked={listingType === t} onChange={() => setListingType(t)} />
              <span>{t === "SALE" ? "Sell" : "Rent out"}</span>
            </label>
          ))}
        </fieldset>
        <div className="form-grid">
          <Field label="Property type">
            <select className="select" name="propertyType" required defaultValue={categories[0]}>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="City">
            <input className="input" name="city" required minLength={2} maxLength={100} autoComplete="address-level2" placeholder="e.g. Lahore" />
          </Field>
          <Field label="Street or neighbourhood" className="span-full" hint="Only the neighbourhood is shown publicly once the listing is approved.">
            <input className="input" name="address" required minLength={4} maxLength={300} placeholder="e.g. DHA Phase 6" />
          </Field>
          <Field label="Bedrooms">
            <input className="input" name="bedrooms" type="number" inputMode="numeric" min={0} max={30} defaultValue={3} required />
          </Field>
          <div className="field-pair">
            <Field label="Area">
              <input className="input" name="area" type="number" inputMode="decimal" min={1} max={1000000} required />
            </Field>
            <Field label="Unit">
              <select className="select" name="areaUnit" defaultValue="sq ft">
                <option>sq ft</option>
                <option>sq m</option>
              </select>
            </Field>
          </div>
        </div>
      </section>

      <section className="form-section" aria-labelledby="sell-price">
        <h2 id="sell-price" className="form-section-title">Price</h2>
        <p>{listingType === "RENT" ? "Enter the monthly rent you are asking for." : "Enter the asking price for the property."}</p>
        <div className="form-grid">
          <Field label={listingType === "RENT" ? "Monthly rent" : "Asking price"}>
            <input className="input" name="price" type="number" inputMode="numeric" min={1} max={1000000000000} required />
          </Field>
          <Field label="Currency">
            <select className="select" name="currency" defaultValue="PKR">
              <option>PKR</option>
              <option>USD</option>
              <option>GBP</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="form-section" aria-labelledby="sell-media">
        <h2 id="sell-media" className="form-section-title">Photos and description</h2>
        <p>Good photographs and a clear description make the biggest difference.</p>
        <Field label="Property photos" optional hint={`Up to ${MAX_PHOTOS} JPEG, PNG or WebP images, 10 MB each.`}>
          <input ref={fileRef} className="input" name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={updatePhotos} />
        </Field>
        {photoError && (
          <p className="field-error" role="alert">
            <Icon name="alert" size={14} /> {photoError}
          </p>
        )}
        {previews.length > 0 && (
          <ul className="photo-previews" aria-label="Selected photos">
            {previews.map((p) => (
              <li key={p.url}>
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                <img src={p.url} alt={`Selected photo ${p.name}`} />
              </li>
            ))}
          </ul>
        )}
        <Field label="Description" hint={<span className="num">{descriptionLength} / 4000 characters · minimum 20</span>}>
          <textarea
            className="textarea"
            name="description"
            minLength={20}
            maxLength={4000}
            required
            rows={6}
            placeholder="Describe the layout, condition, notable features and the surrounding area."
            onChange={(e) => setDescriptionLength(e.currentTarget.value.length)}
          />
        </Field>
      </section>

      <FormAlert message={message} />
      <div className="sell-submit">
        <p className="form-note">Photos are stored securely and only attached to a public listing after review. Please don’t include personal documents.</p>
        <SubmitButton busy={busy} busyLabel="Submitting…" className="btn-lg">
          Submit for review
        </SubmitButton>
      </div>
    </form>
  );
}
