import type { GenerationSettings } from "@/lib/models";
export type EditInput={prompt:string;vehicle:Buffer;showroom:Buffer;settings:GenerationSettings;idempotencyKey:string};
export type ProviderResult={image:Buffer;contentType:string;usage?:{inputTokens?:number;outputTokens?:number};requestId?:string};
export interface ImageProvider { edit(input: EditInput): Promise<ProviderResult>; }
