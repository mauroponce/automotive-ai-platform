import OpenAI, { toFile } from "openai";
import { batchInputUrls, markBatchItemFailed, recordBatchSubmission, storeBatchItemResult, completeVehicleBatch } from "./service";

type BatchOutput = { custom_id: string; response?: { request_id?: string; status_code: number; body?: { data?: Array<{ b64_json?: string }>; usage?: { input_tokens?: number; output_tokens?: number; input_tokens_details?: { image_tokens?: number; text_tokens?: number } } } }; error?: { message?: string } };
export class ProviderBatchTerminalError extends Error {}
function client() { if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured."); return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, organization: process.env.OPENAI_ORGANIZATION }); }

export async function submitVehicleBatchToOpenAI(batchId: string) {
  const prepared = await batchInputUrls(batchId); if (prepared.batch.providerBatchId) return prepared.batch.providerBatchId;
  const lines = prepared.items.map((item) => JSON.stringify({ custom_id: item.providerCustomId, method: "POST", url: "/v1/images/edits", body: { model: "gpt-image-2.5-sunburst", image: [{ image_url: item.sourceUrl }, { image_url: prepared.backgroundUrl }], prompt: item.promptSnapshot, size: "1600x1200", quality: "high", output_format: "png", background: "opaque" } })).join("\n");
  const api = client(); const inputFile = await api.files.create({ purpose: "batch", file: await toFile(Buffer.from(lines), "vehicle-edits.jsonl", { type: "application/jsonl" }) }, { idempotencyKey: `vehicle-batch-input-${batchId}` });
  const batch = await api.batches.create({ input_file_id: inputFile.id, endpoint: "/v1/images/edits", completion_window: "24h", metadata: { vehicle_batch_id: batchId } }, { idempotencyKey: `vehicle-batch-${batchId}` });
  await recordBatchSubmission(batchId, batch.id, inputFile.id); return batch.id;
}

export async function reconcileVehicleBatchFromOpenAI(batchId: string, providerBatchId: string) {
  const api = client(); const batch = await api.batches.retrieve(providerBatchId);
  if (batch.status === "failed" || batch.status === "expired" || batch.status === "cancelled") throw new ProviderBatchTerminalError(`OpenAI Batch ${batch.status}.`);
  if (batch.status !== "completed" || !batch.output_file_id) return false;
  const output = await api.files.content(batch.output_file_id); const lines = (await output.text()).split("\n").filter(Boolean).map((line) => JSON.parse(line) as BatchOutput);
  for (const line of lines) {
    const image = line.response?.body?.data?.[0]?.b64_json;
    if (!image || line.response?.status_code !== 200) await markBatchItemFailed(batchId, line.custom_id, line.error?.message ?? "OpenAI returned no image output.");
    else { const usage = line.response.body?.usage; await storeBatchItemResult({ batchId, customId: line.custom_id, output: Buffer.from(image, "base64"), contentType: "image/png", usage: { inputTokens: usage?.input_tokens, outputTokens: usage?.output_tokens, inputTokensDetails: { imageTokens: usage?.input_tokens_details?.image_tokens, textTokens: usage?.input_tokens_details?.text_tokens } }, requestId: line.response.request_id }); }
  }
  await completeVehicleBatch(batchId); return true;
}
