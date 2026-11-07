import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/site/legal-page";

export const metadata: Metadata = { title: "Terms of use" };

export default function Terms() {
  return (
    <LegalPage title="Terms of use" eyebrow="Legal information">
      <h2>Listings</h2>
      <p>Listing prices, availability and other details are provided by owners and agents. Confirm all information directly before making a purchase or rental decision. Demonstration listings shown in development are illustrative and not real properties.</p>
      <h2>Submissions</h2>
      <p>Property submissions are stored as pending review. They are not automatically published or represented as verified.</p>
      <h2>Questions</h2>
      <p>
        See the <Link href="/contact">contact page</Link> for enquiries.
      </p>
    </LegalPage>
  );
}
