import { withRlsBypass } from "@/lib/db";
import { claimBatchSubmission, batchInputUrls, markBatchItemFailed, recordBatchSubmission, storeBatchItemResult, completeVehicleBatch } from "./service";
import { openAIBatchProvider, type BatchProvider } from "./provider";

type BatchOutput = { custom_id: string; response?: { request_id?: string; status_code: number; body?: { data?: Array<{ b64_json?: string }>; usage?: { input_tokens?: number; output_tokens?: number; input_tokens_details?: { image_tokens?: number; text_tokens?: number } } } }; error?: { message?: string } };

export async function submitVehicleBatchToOpenAI(batchId: string, provider?: BatchProvider) {
  const prepared = await batchInputUrls(batchId);
  if (prepared.batch.providerBatchId) return prepared.batch.providerBatchId;
  if (!prepared.batch.entitlementReservedAt || prepared.batch.status !== "QUEUED") throw new Error("An authorized queued batch is required.");
  const lines = prepared.items.map((item) => JSON.stringify({ custom_id: item.providerCustomId, method: "POST", url: "/v1/images/edits", body: { model: "gpt-image-2.5-sunburst", images: [{ image_url: item.sourceUrl }, { image_url: prepared.backgroundUrl }], prompt: item.promptSnapshot, n: 1, size: "1600x1200", quality: "high", output_format: "png", background: "opaque" } })).join("\n");
  const api = provider ?? openAIBatchProvider();
  await claimBatchSubmission(batchId);
  const batch = await api.submit(lines, batchId);
  await recordBatchSubmission(batchId, batch.id, batch.inputFileId);
  return batch.id;
}

export async function reconcileVehicleBatchFromOpenAI(batchId: string, providerBatchId: string, provider?: BatchProvider) {
  const stored = await withRlsBypass((tx) => tx.vehicleProcessingBatch.findUniqueOrThrow({ where: { id: batchId }, include: { items: true } }));
  if (stored.providerBatchId !== providerBatchId) throw new Error("Provider batch mismatch.");
  if (stored.status === "COMPLETED") return true;
  const api = provider ?? openAIBatchProvider();
  const batch = await api.retrieve(providerBatchId);
  const terminal = ["completed", "failed", "expired", "cancelled"].includes(batch.status);
  if (!terminal) return false;
  const expected = new Set(stored.items.map((item) => item.providerCustomId));
  const seen = new Set<string>();
  // Failed/expired batches may still have successful, billable individual results.
  for (const fileId of [batch.output_file_id, batch.error_file_id]) {
    if (!fileId) continue;
    for (const raw of (await api.output(fileId)).split("\n").filter(Boolean)) {
      const line = JSON.parse(raw) as BatchOutput;
      if (!expected.has(line.custom_id) || seen.has(line.custom_id)) continue;
      seen.add(line.custom_id);
      const image = line.response?.body?.data?.[0]?.b64_json;
      if (!image || line.response?.status_code !== 200) {
        await markBatchItemFailed(batchId, line.custom_id, line.error?.message ?? "Provider returned no image output.");
        continue;
      }
      const usage = line.response.body?.usage;
      await storeBatchItemResult({ batchId, customId: line.custom_id, output: Buffer.from(image, "base64"), contentType: "image/png", usage: { inputTokens: usage?.input_tokens, outputTokens: usage?.output_tokens, inputTokensDetails: { imageTokens: usage?.input_tokens_details?.image_tokens, textTokens: usage?.input_tokens_details?.text_tokens } }, requestId: line.response.request_id, simulated: api.kind === "simulated" });
    }
  }
  for (const id of expected) if (!seen.has(id)) await markBatchItemFailed(batchId, id, `Provider batch ${batch.status}: result missing.`);
  await completeVehicleBatch(batchId);
  return true;
}
