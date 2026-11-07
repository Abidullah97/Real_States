import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/site/legal-page";

export const metadata: Metadata = { title: "Privacy notice" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy notice" eyebrow="Legal information">
      <h2>Information you submit</h2>
      <p>Forms may collect your name, email address, phone number and property details. When database services are configured, enquiry and listing data is stored so we can respond to your request and review submissions.</p>
      <h2>Cookies and accounts</h2>
      <p>Account sessions use authentication cookies. This site does not include analytics or advertising cookies. A consent manager should be added if optional tracking is introduced.</p>
      <h2>Contact</h2>
      <p>
        For privacy requests, use the <Link href="/contact">contact page</Link> once the site operator has published verified contact information.
      </p>
    </LegalPage>
  );
}
