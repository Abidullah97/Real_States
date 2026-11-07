import type { Metadata } from "next";
import Link from "next/link";
import SellForm from "@/components/forms/sell-form";
import { getCategoryNames } from "@/lib/categories";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "List your property", description: "Submit a property for sale or rent. Every submission is reviewed before it is published." };

const STEPS = [
  { icon: "file", title: "Share the details", text: "Tell us about the property, the price and how to reach you." },
  { icon: "shield", title: "We review it", text: "Our team checks every submission before anything is published." },
  { icon: "home", title: "Your listing goes live", text: "Approved listings appear in search with your photos and details." },
];

export default async function SellPage() {
  const categories = await getCategoryNames();
  return (
    <div className="container sell-page">
      <header className="page-head">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "List a property" }]} />
        <p className="eyebrow">Sell or rent out</p>
        <h1>List your property with Estate House</h1>
        <p className="lead">Submit your property for review. We check each submission before it can appear publicly, so buyers and renters can rely on what they see.</p>
      </header>
      <div className="sell-layout">
        <SellForm categories={categories} />
        <aside className="sell-aside">
          <div className="card card-pad">
            <h2 className="sell-aside-title">What happens next</h2>
            <ol className="mini-steps">
              {STEPS.map((s) => (
                <li key={s.title}>
                  <span>
                    <Icon name={s.icon} size={18} />
                  </span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="card card-pad sell-aside-note">
            <h2 className="sell-aside-title">Already have an account?</h2>
            <p>Sign in before submitting and your submission will appear in your dashboard so you can follow its status.</p>
            <Link href="/signin?callbackUrl=%2Fsell" className="text-link">
              Sign in <Icon name="arrow-right" size={15} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
