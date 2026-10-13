export const IMAGE_MODELS = ["gpt-image-2.5-sunburst", "gpt-image-2.5-flare", "gpt-image-2"] as const;
export type ImageModel = (typeof IMAGE_MODELS)[number];
export type GenerationSettings = { model: ImageModel; quality: "high" | "medium"; size: "1600x1200"; outputFormat: "png"; background: "opaque" };
export const DEFAULT_SETTINGS: GenerationSettings = { model: "gpt-image-2.5-sunburst", quality: "high", size: "1600x1200", outputFormat: "png", background: "opaque" };
export function validateSettings(input: Partial<GenerationSettings>): GenerationSettings { const settings={...DEFAULT_SETTINGS,...input}; if (!IMAGE_MODELS.includes(settings.model)) throw new Error("The selected model is not enabled."); if (settings.size!=="1600x1200") throw new Error("This output profile requires 1600x1200."); return settings; }
