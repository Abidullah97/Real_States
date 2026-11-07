import type { Metadata } from "next";
import AccountActionForm from "@/components/forms/account-action-form";

export const metadata: Metadata = { title: "Verify email", robots: { index: false, follow: false } };

export default async function VerifyEmail({ searchParams }: { searchParams: Promise<{ email?: string | string[]; token?: string | string[] }> }) {
  const p = await searchParams;
  const email = Array.isArray(p.email) ? p.email[0] : p.email;
  const token = Array.isArray(p.token) ? p.token[0] : p.token;
  return (
    <>
      <div className="auth-head">
        <p className="eyebrow">Account verification</p>
        <h1>Confirm your email</h1>
        <p className="lead">{email ? <>Confirm <strong>{email}</strong> to activate your account.</> : "Confirm your email address to activate your account."}</p>
      </div>
      <AccountActionForm mode="verify" email={email} token={token} />
    </>
  );
}
