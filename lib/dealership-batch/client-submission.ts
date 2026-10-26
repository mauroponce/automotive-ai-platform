// Keep one operation identity across uncertain browser responses. The server still
// enforces organization authorization, economic allowance and queue idempotency.
export function createBatchSubmission(payload: Record<string, unknown>, transport: typeof fetch = fetch) {
  const body = JSON.stringify({ ...payload, idempotencyKey: crypto.randomUUID() });
  let batchId: string | undefined;
  const checked = async (response: Response) => {
    const value = await response.json() as { data?: { id: string }; error?: { message?: string } };
    if (!response.ok) throw new Error(value.error?.message ?? "The batch request could not be completed.");
    return value;
  };
  return async () => {
    if (!batchId) {
      const created = await checked(await transport("/api/dealership/batches", { method: "POST", headers: { "content-type": "application/json" }, body }));
      if (!created.data?.id) throw new Error("The batch response did not include an identifier.");
      batchId = created.data.id;
    }
    await checked(await transport(`/api/dealership/batches/${batchId}/start`, { method: "POST" }));
    return batchId;
  };
}
