import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "About", description: "Estate House is a property marketplace built to make finding a home clear and considered." };

const PRINCIPLES = [
  { title: "Clarity first", text: "Every listing presents price, size, rooms and location in the same format, so homes are easy to compare." },
  { title: "Reviewed before published", text: "Owner submissions are checked by our team before they can appear in search results." },
  { title: "Direct conversations", text: "Enquiries go straight to the team or agent responsible for the property, without extra steps." },
];

export default function AboutPage() {
  return (
    <>
      <div className="container">
        <header className="page-head">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} />
          <p className="eyebrow">About Estate House</p>
          <h1>A more considered way to find a home</h1>
          <p className="lead">Estate House is a property marketplace for buying, renting and listing homes in Pakistan. We focus on clear information and a calm, well-organised search.</p>
        </header>
        <div className="about-hero">
          <Image src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80" alt="Bright living room with a sofa, low table and large windows" fill sizes="(max-width: 1320px) 100vw, 1240px" priority />
        </div>
      </div>
      <section className="section">
        <div className="container about-grid">
          <div>
            <p className="eyebrow">What we believe</p>
            <h2 className="about-title">The right home is about more than an address.</h2>
          </div>
          <div className="about-copy">
            <p className="lead">It’s where everyday life takes shape. Finding it should feel straightforward: honest details, good photographs and an easy way to ask questions.</p>
            <ul className="principles">
              {PRINCIPLES.map((p) => (
                <li key={p.title}>
                  <Icon name="check" size={18} />
                  <div>
                    <h3>{p.title}</h3>
                    <p>{p.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="form-actions">
              <Link href="/properties" className="btn">
                Browse properties
              </Link>
              <Link href="/contact" className="btn btn-secondary">
                Contact the team
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
