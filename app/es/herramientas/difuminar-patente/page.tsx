import Link from "next/link";
import { PlateWizard } from "@/components/free-tools/plate-editor";
export default function PlateBlurTool() { return <main className="mf-page"><header className="tool-header"><Link href="/">Motorframe</Link><Link href="/portal/batches/new" prefetch={false}>Advanced editing</Link></header><PlateWizard/></main>; }
