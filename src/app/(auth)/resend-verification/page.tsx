import type { Metadata } from "next";
import AccountActionForm from "@/components/forms/account-action-form";

export const metadata: Metadata = { title: "Verify your email", robots: { index: false, follow: false } };

export default async function ResendVerification({ searchParams }: { searchParams: Promise<{ email?: string | string[] }> }) {
  const params = await searchParams;
  const email = Array.isArray(params.email) ? params.email[0] : params.email;
  return (
    <>
      <div className="auth-head">
        <p className="eyebrow">Account verification</p>
        <h1>Resend verification email</h1>
        <p className="lead">We’ll send a fresh verification link if your account still needs one.</p>
      </div>
      <AccountActionForm mode="resend" email={email} />
    </>
  );
}
