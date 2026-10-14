import { DealershipBatchCreator } from "@/components/dealership-batch/batch-creator";
import { PageHeader } from "@/components/portal-ui";
export default function NewVehicleBatchPage() { return <><PageHeader eyebrow="Dealership pilot" title="Process a vehicle photo batch" description="Upload up to 15 photos, select one consistent showroom, and review every unverified result before delivery."/><DealershipBatchCreator/></>; }
