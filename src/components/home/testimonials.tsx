import { initials } from "@/lib/format";
import type { TestimonialData } from "@/lib/site-content";

function Stars({ rating }: { rating: number }) {
  return (
    <p className="testimonial-stars" aria-label={`Rated ${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className={i < rating ? "is-on" : ""}>
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
        </svg>
      ))}
    </p>
  );
}

/** Administrator-published customer testimonials. Rendered only when at least one exists. */
export default function Testimonials({ items }: { items: TestimonialData[] }) {
  return (
    <ul className={`testimonial-grid testimonial-grid-${Math.min(items.length, 3)}`}>
      {items.map((t) => (
        <li key={t.id}>
          <figure className="testimonial">
            {t.rating ? <Stars rating={t.rating} /> : null}
            <blockquote>
              <p>“{t.quote}”</p>
            </blockquote>
            <figcaption>
              <span className="avatar" aria-hidden="true">
                {initials(t.name)}
              </span>
              <span>
                <strong>{t.name}</strong>
                {t.context && <span>{t.context}</span>}
              </span>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
