import { describe, expect, it, vi } from "vitest";
import { createBatchSubmission } from "@/lib/dealership-batch/client-submission";

describe("browser batch retries with SIMULATED HTTP transport", () => {
  it("keeps the same idempotency key after a lost creation response", async () => {
    const keys: string[] = [];
    let attempts = 0;
    const transport = vi.fn<typeof fetch>(async (url, request) => {
      if (url === "/api/dealership/batches") {
        keys.push(JSON.parse(request!.body as string).idempotencyKey);
        if (++attempts === 1) throw new Error("SIMULATED response lost after server commit");
      }
      return Response.json({ data: { id: "same-persisted-batch" } });
    });
    const submit = createBatchSubmission({ vehicleLabel: "Synthetic fixture" }, transport);
    await expect(submit()).rejects.toThrow("response lost");
    await expect(submit()).resolves.toBe("same-persisted-batch");
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(1);
    expect(transport.mock.calls.at(-1)?.[0]).toBe("/api/dealership/batches/same-persisted-batch/start");
  });
  it("retries the same start operation without creating a second batch", async () => {
    let starts = 0;
    const transport = vi.fn<typeof fetch>(async (url) => {
      if (String(url).endsWith("/start") && ++starts === 1) throw new Error("SIMULATED start response lost");
      return Response.json({ data: { id: "persisted-batch" } });
    });
    const submit = createBatchSubmission({}, transport);
    await expect(submit()).rejects.toThrow("response lost");
    await expect(submit()).resolves.toBe("persisted-batch");
    expect(transport.mock.calls.filter(([url]) => url === "/api/dealership/batches")).toHaveLength(1);
    expect(starts).toBe(2);
  });
});
