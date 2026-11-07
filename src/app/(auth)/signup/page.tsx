import type { Metadata } from "next";
import AuthForm from "@/components/forms/auth-form";

export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: false } };

export default function SignUp() {
  return (
    <>
      <div className="auth-head">
        <p className="eyebrow">Create an account</p>
        <h1>Start your property search</h1>
        <p className="lead">Save homes, follow up on enquiries and submit listings for review.</p>
      </div>
      <AuthForm mode="signup" />
    </>
  );
}
