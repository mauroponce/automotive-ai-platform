import { redirect } from "next/navigation";
import { GoogleLoginButton } from "@/components/google-login-button";
import { OrganizationRegistrationForm } from "@/components/organization-registration-form";
import { currentPrincipal } from "@/lib/authorization";

export default async function Register() {
  const configured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const user = await currentPrincipal();
  if (user?.memberships.length) redirect("/auth/continue");

  return <main className="shell auth-shell"><div className="card auth-card"><div className="brand">auto<i>frame</i> AI</div><p className="eyebrow">14-DAY TRIAL</p><h1>Create your dealership workspace</h1><p className="muted">Sign up with Google, then tell us the name of your dealership. No password or credit card is required.</p>{user?.email ? <OrganizationRegistrationForm email={user.email} /> : configured ? <GoogleLoginButton callbackUrl="/register" label="Sign up with Google" intent="registration" /> : <p className="status fail">Google sign-up is not configured.</p>}</div></main>;
}
