import { PlateBlurEditor } from "@/components/basic-edit/plate-blur-editor";
import { PageHeader } from "@/components/portal-ui";
export default function NewProcessing(){return <><PageHeader eyebrow="Basic V1" title="Blur a license plate" description="Process one vehicle image locally. Confirm every plate before creating a downloadable result."/><PlateBlurEditor/></>}
