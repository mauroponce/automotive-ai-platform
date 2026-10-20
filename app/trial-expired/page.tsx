import Link from "next/link";

export default function TrialExpired() {
  return <main className="shell auth-shell"><div className="card auth-card"><div className="brand">auto<i>frame</i> AI</div><p className="eyebrow">TRIAL ENDED</p><h1>Your 14-day trial has ended</h1><p className="muted">Your workspace is preserved, but portal access is paused. Contact AutoFrame to continue using the platform.</p><Link className="button auth-link-button" href="/">Return to AutoFrame</Link></div></main>;
}
