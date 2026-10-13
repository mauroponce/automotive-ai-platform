import type { GenerationSettings } from "@/lib/models";
import type { GenerationContext } from "@/lib/prompt-orchestration/types";
export type EditInput={prompt:string;context:GenerationContext;vehicle:Buffer;showroom?:Buffer;settings:GenerationSettings;idempotencyKey:string};
export type ProviderResult={image:Buffer;contentType:string;usage?:{inputTokens?:number;outputTokens?:number};requestId?:string};
export interface ImageProvider { edit(input: EditInput): Promise<ProviderResult>; }
