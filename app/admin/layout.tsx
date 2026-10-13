import { AdminShell } from "@/components/admin-ui";
import { requireSuperAdminPage } from "@/lib/authorization";
export default async function Layout({children}:{children:React.ReactNode}){await requireSuperAdminPage();return <AdminShell>{children}</AdminShell>}
