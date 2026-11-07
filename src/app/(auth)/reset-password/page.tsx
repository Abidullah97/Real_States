import type { Metadata } from "next";
import AccountActionForm from "@/components/forms/account-action-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ email?: string | string[]; token?: string | string[] }> }) {
  const p = await searchParams;
  const email = Array.isArray(p.email) ? p.email[0] : p.email;
  const token = Array.isArray(p.token) ? p.token[0] : p.token;
  return (
    <>
      <div className="auth-head">
        <p className="eyebrow">Account recovery</p>
        <h1>Choose a new password</h1>
        <p className="lead">Use at least 12 characters, including upper and lower case letters and a number.</p>
      </div>
      <AccountActionForm mode="reset" email={email} token={token} />
    </>
  );
}
