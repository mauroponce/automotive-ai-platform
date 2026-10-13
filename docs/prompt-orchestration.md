# Prompt orchestration

`lib/prompt-orchestration` builds provider prompts from a typed generation context instead of a fixed text template. It composes independent role, task, vehicle, shot, composition, background, plate, quality, and final-validation blocks.

The current worker should persist the exact context and final prompt with every attempt before dispatching OpenAI. Vision analysis is intentionally not active yet: callers use `analysisSource: "fallback"`, `"user"`, or `"vision"` to make the origin explicit. A future vision analyzer can populate the same schema without changing prompt composition.

For example, a motorcycle side shot produces fork, suspension, handlebar, tank, seat, and exhaust preservation rules; a car front-three-quarter shot emphasizes the front fascia and perspective. Plate blur always instructs the model to change only the existing plate region.
