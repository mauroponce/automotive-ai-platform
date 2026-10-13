import { buildVehicleImagePrompt } from "@/lib/prompt-orchestration/builder";
import { fallbackGenerationContext } from "@/lib/prompt-orchestration/context";
export const AUTOMOTIVE_SHOWROOM_V1=buildVehicleImagePrompt(fallbackGenerationContext).prompt;
export { buildVehicleImagePrompt, fallbackGenerationContext };
