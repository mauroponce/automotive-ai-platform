import { EmptyState, PageHeader } from "@/components/portal-ui";
export default function History(){return <><PageHeader eyebrow="History" title="Processing history" description="Jobs and their retention dates will appear here."/><EmptyState title="No processing history" description="Completed and interrupted jobs will be listed after you create your first batch."/></>}
