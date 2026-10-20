"use client";

import { signIn } from "next-auth/react";

export function GoogleLoginButton({
  callbackUrl = "/auth/continue",
  label = "Continue with Google",
  intent = "login",
}: {
  callbackUrl?: string;
  label?: string;
  intent?: "login" | "registration";
}) {
  const authenticate = async () => {
    const response = await fetch("/api/auth/intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ intent }),
    });
    if (response.ok) await signIn("google", { callbackUrl });
  };

  return <button className="button" type="button" onClick={() => void authenticate()}>{label}</button>;
}
