import { PortalShell } from "@/components/portal-ui";
import { requirePortalPage } from "@/lib/authorization";
export default async function Layout({children}:{children:React.ReactNode}){await requirePortalPage();return <PortalShell>{children}</PortalShell>}
