"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";

type Photo = { url: string; alt: string };

/** Brochure-style mosaic (one lead image + up to four supporting images) with a full-screen lightbox. */
export default function PropertyGallery({ images, title }: { images: Photo[]; title: string }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const count = images.length;
  const tiles = images.slice(0, 5);

  const show = useCallback((index: number) => setActive((index + count) % count), [count]);

  function openAt(index: number) {
    setActive(index);
    setOpen(true);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) document.body.style.overflow = "";
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") show(active + 1);
      if (e.key === "ArrowLeft") show(active - 1);
    }
    document.addEventListener("keydown", onKey);
    thumbsRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest", inline: "center" });
    return () => document.removeEventListener("keydown", onKey);
  }, [open, active, show]);

  const current = images[active];
  return (
    <>
      <div className={`gallery gallery-${Math.min(count, 5)}`}>
        {tiles.map((image, index) => (
          <button
            key={`${image.url}-${index}`}
            type="button"
            className="gallery-tile"
            onClick={() => openAt(index)}
            aria-label={`Open photo ${index + 1} of ${count}${image.alt ? `: ${image.alt}` : ""}`}
          >
            <Image
              src={image.url}
              alt=""
              fill
              priority={index === 0}
              sizes={index === 0 ? "(max-width: 900px) 100vw, 62vw" : "(max-width: 900px) 50vw, 20vw"}
            />
          </button>
        ))}
        {count > 1 && (
          <button type="button" className="btn btn-light btn-sm gallery-all" onClick={() => openAt(0)}>
            <Icon name="images" size={16} /> View all {count} photos
          </button>
        )}
      </div>

      <dialog
        ref={dialogRef}
        className="lightbox"
        aria-label={`${title} photo gallery`}
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
      >
        {open && current && (
          <div className="lightbox-inner">
            <div className="lightbox-bar">
              <p>
                <span className="num">
                  {active + 1} / {count}
                </span>
                <span className="lightbox-title">{title}</span>
              </p>
              <button type="button" className="icon-btn lightbox-btn" onClick={() => setOpen(false)} aria-label="Close gallery" autoFocus>
                <Icon name="close" size={22} />
              </button>
            </div>
            <div className="lightbox-stage">
              <Image key={current.url} src={current.url} alt={current.alt || `${title}, photo ${active + 1}`} fill sizes="100vw" />
              {count > 1 && (
                <>
                  <button type="button" className="icon-btn lightbox-btn lightbox-prev" onClick={() => show(active - 1)} aria-label="Previous photo">
                    <Icon name="chevron-left" size={26} />
                  </button>
                  <button type="button" className="icon-btn lightbox-btn lightbox-next" onClick={() => show(active + 1)} aria-label="Next photo">
                    <Icon name="chevron-right" size={26} />
                  </button>
                </>
              )}
            </div>
            {count > 1 && (
              <div className="lightbox-thumbs" ref={thumbsRef} aria-label="Photo thumbnails">
                {images.map((image, index) => (
                  <button
                    key={`${image.url}-thumb-${index}`}
                    type="button"
                    data-index={index}
                    aria-label={`Show photo ${index + 1}`}
                    aria-current={index === active}
                    onClick={() => setActive(index)}
                  >
                    <Image src={image.url} alt="" fill sizes="96px" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
