import type { PlateDetection } from "@/lib/plate-lab/models";

/** Browser-only plate detection deliberately has no server-side fallback. */
export async function detectBasicEditPlates(_: Buffer): Promise<{ detections: PlateDetection[]; warnings: string[] }> {
  return { detections: [], warnings: ["Browser-only plate detection is not available to server workflows."] };
}
