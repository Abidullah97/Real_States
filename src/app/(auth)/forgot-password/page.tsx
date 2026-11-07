import type { Metadata } from "next";
import AccountActionForm from "@/components/forms/account-action-form";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };

export default function ForgotPassword() {
  return (
    <>
      <div className="auth-head">
        <p className="eyebrow">Account recovery</p>
        <h1>Reset your password</h1>
        <p className="lead">Enter the email address on your account. If it exists, we’ll send a link to choose a new password.</p>
      </div>
      <AccountActionForm mode="forgot" />
    </>
  );
}
