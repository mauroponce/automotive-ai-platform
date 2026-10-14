import { buildVehicleImagePrompt } from "@/lib/prompt-orchestration/builder";

export function buildPilotBatchPrompt() {
  const result = buildVehicleImagePrompt({ vehicleType: "unknown", task: "mixed", shotType: "unknown", cropType: "full_vehicle", visibleWheels: "unknown", backgroundMode: "reference_showroom", hasReferenceBackground: true, plateVisibility: "unknown", plateAction: "preserve", outputGoal: "faithful_record", realismPriority: "high", fidelityPriority: "maximum", qualityIssues: ["none"], vehicleOccupancy: "balanced", analysisSource: "fallback", userInstructions: "Replace only the masked background using the reference showroom. Preserve all vehicle pixels, including every scratch, dent, paint defect, wheel, lamp, accessory, and license plate. Correct glass reflections only when the correction is isolated to glass and does not alter vehicle condition; otherwise preserve the original reflection. Plate treatment is applied deterministically after generation." });
  return result.prompt;
}
