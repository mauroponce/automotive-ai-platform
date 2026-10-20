import { redirect } from "next/navigation";
import { currentPrincipal } from "@/lib/authorization";
import { isTrialActive } from "@/lib/trial";

export default async function ContinueAfterAuthentication() {
  const user = await currentPrincipal();
  if (!user) redirect("/login");
  if (user.platformRole === "SUPER_ADMIN") redirect("/admin");
  if (!user.memberships.length) redirect("/register");
  if (!user.memberships.some(({ organization }) => isTrialActive(organization.trialEndsAt))) redirect("/trial-expired");
  redirect("/portal");
}
