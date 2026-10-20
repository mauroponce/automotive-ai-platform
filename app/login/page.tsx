import Link from "next/link";
import { GoogleLoginButton } from "@/components/google-login-button";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const configured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const { error } = await searchParams;

  return <main className="shell auth-shell"><div className="card auth-card"><div className="brand">auto<i>frame</i> AI</div><p className="eyebrow">CUSTOMER PORTAL</p><h1>Sign in</h1><p className="muted">Use the Google account connected to your dealership.</p>{error && <p className="status fail">We could not sign in with that Google account. Start a trial first if this is a new account.</p>}{configured ? <GoogleLoginButton label="Sign in with Google" /> : <p className="status fail">Google sign-in is not configured.</p>}<p className="auth-footer">New to AutoFrame? <Link href="/register">Start your 14-day trial</Link></p></div></main>;
}
