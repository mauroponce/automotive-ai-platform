import { BatchReview } from "@/components/dealership-batch/batch-review";
import { PageHeader } from "@/components/portal-ui";
export default function History(){return <><PageHeader eyebrow="Dealership pilot" title="Batch review history" description="Preview every unverified provider result and approve only faithful vehicle photos."/><BatchReview/></>}
