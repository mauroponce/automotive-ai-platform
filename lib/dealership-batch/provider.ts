import OpenAI, { toFile } from "openai";

export type ProviderBatch = { id: string; status: string; output_file_id?: string | null; error_file_id?: string | null };
export interface BatchProvider {
  readonly kind: "openai" | "simulated";
  submit(lines: string, batchId: string): Promise<{ id: string; inputFileId: string }>;
  retrieve(id: string): Promise<ProviderBatch>;
  output(id: string): Promise<string>;
}

// Tests inject a simulated provider directly. There is no environment-selectable fake provider.
export function openAIBatchProvider(): BatchProvider {
  if (process.env.APP_DEMO_MODE !== "false" || process.env.OPENAI_PAID_PROCESSING_ENABLED !== "true") {
    throw new Error("Paid OpenAI processing requires explicit server authorization.");
  }
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  const api = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, organization: process.env.OPENAI_ORGANIZATION, maxRetries: 0 });
  return {
    kind: "openai",
    async submit(lines, batchId) {
      await api.models.retrieve("gpt-image-2.5-sunburst");
      const input = await api.files.create({ purpose: "batch", file: await toFile(Buffer.from(lines), "vehicle-edits.jsonl", { type: "application/jsonl" }) }, { idempotencyKey: `vehicle-batch-input-${batchId}` });
      const batch = await api.batches.create({ input_file_id: input.id, endpoint: "/v1/images/edits", completion_window: "24h", metadata: { vehicle_batch_id: batchId } }, { idempotencyKey: `vehicle-batch-${batchId}` });
      return { id: batch.id, inputFileId: input.id };
    },
    retrieve: (id) => api.batches.retrieve(id),
    async output(id) { return (await api.files.content(id)).text(); },
  };
}
