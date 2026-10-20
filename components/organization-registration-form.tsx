"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function OrganizationRegistrationForm({ email }: { email: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationName: form.get("organizationName") }),
    });
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    if (!response.ok) {
      setError(payload?.error?.message ?? "Unable to create your dealership workspace.");
      setSubmitting(false);
      return;
    }
    router.push("/portal");
    router.refresh();
  };

  return <form onSubmit={submit}><label className="field">Dealership name<input required name="organizationName" minLength={2} maxLength={120} autoComplete="organization" /></label><p className="muted">Your account: {email}</p><button className="button" disabled={submitting} type="submit">{submitting ? "Creating workspace…" : "Start 14-day trial"}</button>{error && <p className="status fail">{error}</p>}</form>;
}
