import type { Metadata } from "next";
import AuthForm from "@/components/forms/auth-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ callbackUrl?: string | string[] }> }) {
  const raw = (await searchParams).callbackUrl;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const callbackUrl = value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
  return (
    <>
      <div className="auth-head">
        <p className="eyebrow">Welcome back</p>
        <h1>Sign in to your account</h1>
        <p className="lead">Access your saved homes, enquiries and listings.</p>
      </div>
      <AuthForm mode="signin" callbackUrl={callbackUrl} />
    </>
  );
}
