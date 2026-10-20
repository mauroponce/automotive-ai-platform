export const TRIAL_DURATION_DAYS = 14;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

export function trialEndsAt(startedAt: Date) {
  return new Date(startedAt.getTime() + TRIAL_DURATION_DAYS * MILLISECONDS_PER_DAY);
}

export function isTrialActive(endsAt: Date, now = new Date()) {
  return now.getTime() < endsAt.getTime();
}
