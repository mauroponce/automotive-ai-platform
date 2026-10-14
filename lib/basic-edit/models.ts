import { z } from "zod";
import { normalizedBoxSchema } from "@/lib/plate-lab/models";

export const basicBlurRequestSchema = z.object({ boxes: z.array(normalizedBoxSchema).min(1).max(8) });
