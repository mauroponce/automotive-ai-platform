import { requireSuperAdminPage } from "@/lib/authorization";
export default async function LabLayout({children}:{children:React.ReactNode}){await requireSuperAdminPage();return children}
