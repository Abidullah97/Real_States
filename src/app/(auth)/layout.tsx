import Image from "next/image";
import Link from "next/link";
import BrandLogo from "@/components/ui/brand-logo";
import { Icon } from "@/components/ui/icon";

const AUTH_IMAGE = "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1600&q=80";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <header className="auth-top">
          <BrandLogo />
          <Link href="/" className="text-link">
            <Icon name="arrow-left" size={15} /> Back to site
          </Link>
        </header>
        <main id="main" className="auth-main">
          {children}
        </main>
        <footer className="auth-footer">
          <span>© {new Date().getFullYear()} Estate House</span>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </footer>
      </div>
      <aside className="auth-visual" aria-hidden="true">
        <Image src={AUTH_IMAGE} alt="" fill priority sizes="50vw" />
        <div className="auth-visual-caption">
          <p className="eyebrow">Estate House</p>
          <p>Save the homes you love, follow your enquiries and manage your listings in one place.</p>
        </div>
      </aside>
    </div>
  );
}
