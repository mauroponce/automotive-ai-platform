import { buildVehicleImagePrompt } from "@/lib/prompt-orchestration/builder";

export function buildPilotBatchPrompt(instructions = "") {
  const result = buildVehicleImagePrompt({ vehicleType: "unknown", task: "mixed", shotType: "unknown", cropType: "full_vehicle", visibleWheels: "unknown", backgroundMode: "reference_showroom", hasReferenceBackground: true, plateVisibility: "unknown", plateAction: "preserve", outputGoal: "faithful_record", realismPriority: "high", fidelityPriority: "maximum", qualityIssues: ["none"], vehicleOccupancy: "balanced", analysisSource: "fallback", userInstructions: "Replace only the background using the reference showroom. Preserve the vehicle appearance, including every scratch, dent, paint defect, wheel, lamp, accessory, and license plate. Correct glass reflections only when the correction is isolated to glass and does not alter vehicle condition; otherwise preserve the original reflection. Preserve license plates unchanged; human review is mandatory." + (instructions ? ` Additional editing preferences (preservation rules still apply): ${instructions}` : "") });
  return result.prompt;
}
