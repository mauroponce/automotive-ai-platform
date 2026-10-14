"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { GoogleLoginButton } from "@/components/google-login-button";

export default function Login() {
  const configured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(null);
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", { email: form.get("email"), password: form.get("password"), redirect: false });
    if (!result?.ok) { setError("Invalid email or password."); return; }
    window.location.assign("/portal");
  };
  return <main className="shell" style={{ maxWidth: 480 }}><div className="card"><div className="brand">auto<i>frame</i> AI</div><h1>Sign in</h1><p style={{ color: "var(--muted)" }}>Use your AutoFrame AI account.</p><form onSubmit={submit}><label className="field">Email<input required name="email" type="email" autoComplete="email" /></label><label className="field">Password<input required name="password" type="password" autoComplete="current-password" /></label><button className="button" type="submit">Sign in</button>{error && <p className="status fail">{error}</p>}</form>{configured && <GoogleLoginButton />}<p><a href="/recover">Need help signing in?</a></p></div></main>;
}
