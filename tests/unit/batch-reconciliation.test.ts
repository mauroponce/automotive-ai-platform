import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ findUniqueOrThrow: vi.fn() }));
vi.mock("@/lib/db", () => ({ withRlsBypass: (operation: (tx: unknown) => unknown) => operation({ vehicleProcessingBatch: state }) }));
vi.mock("@/lib/dealership-batch/service", () => ({ batchInputUrls: vi.fn(), claimBatchSubmission: vi.fn(), recordBatchSubmission: vi.fn(), storeBatchItemResult: vi.fn(), markBatchItemFailed: vi.fn(), completeVehicleBatch: vi.fn() }));
import { reconcileVehicleBatchFromOpenAI } from "@/lib/dealership-batch/openai-batch";
import { storeBatchItemResult, markBatchItemFailed, completeVehicleBatch } from "@/lib/dealership-batch/service";
import type { BatchProvider } from "@/lib/dealership-batch/provider";

describe("partial terminal Batch reconciliation with a SIMULATED provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.findUniqueOrThrow.mockResolvedValue({ providerBatchId: "simulated-batch", status: "PROCESSING", items: ["ok", "error", "missing"].map((providerCustomId) => ({ providerCustomId })) });
  });
  const provider: BatchProvider = {
    kind: "simulated", submit: vi.fn(),
    async retrieve(id) { return { id, status: "expired", output_file_id: "outputs", error_file_id: "errors" }; },
    async output(id) {
      return id === "outputs" ? JSON.stringify({ custom_id: "ok", response: { status_code: 200, body: { data: [{ b64_json: Buffer.from("SIMULATED image bytes").toString("base64") }] } } }) : JSON.stringify({ custom_id: "error", error: { message: "SIMULATED individual failure" } });
    },
  };
  it("retains successful results from expired batches and accounts for failed and missing items", async () => {
    expect(await reconcileVehicleBatchFromOpenAI("batch", "simulated-batch", provider)).toBe(true);
    expect(storeBatchItemResult).toHaveBeenCalledWith(expect.objectContaining({ customId: "ok", simulated: true }));
    expect(markBatchItemFailed).toHaveBeenCalledWith("batch", "error", "SIMULATED individual failure", expect.objectContaining({ simulated: true }));
    expect(markBatchItemFailed).toHaveBeenCalledWith("batch", "missing", expect.stringContaining("result missing"));
    expect(completeVehicleBatch).toHaveBeenCalledWith("batch");
  });
  it("propagates storage failure so a billable result can be reconciled again", async () => {
    vi.mocked(storeBatchItemResult).mockRejectedValueOnce(new Error("Storage unavailable"));
    await expect(reconcileVehicleBatchFromOpenAI("batch", "simulated-batch", provider)).rejects.toThrow("Storage unavailable");
    expect(completeVehicleBatch).not.toHaveBeenCalled();
  });
  it("rejects a mismatched provider batch before accessing it", async () => {
    await expect(reconcileVehicleBatchFromOpenAI("batch", "foreign-batch", provider)).rejects.toThrow("mismatch");
  });
});
