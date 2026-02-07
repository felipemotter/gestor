import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getSupabaseClient before importing the module under test
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    rpc: mockRpc,
  }),
}));

// Import after mock setup
const { checkAccountDiscrepancy } = await import("../balance-checker");

describe("checkAccountDiscrepancy", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("returns null when reconciled_until is null", async () => {
    const result = await checkAccountDiscrepancy({
      id: "acct-1",
      name: "Nubank",
      reconciled_until: null,
      reconciled_balance: 1000,
    });
    expect(result).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns null when reconciled_balance is null", async () => {
    const result = await checkAccountDiscrepancy({
      id: "acct-1",
      name: "Nubank",
      reconciled_until: "2025-01-31",
      reconciled_balance: null,
    });
    expect(result).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns null when RPC returns error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "fail" } });

    const result = await checkAccountDiscrepancy({
      id: "acct-1",
      name: "Nubank",
      reconciled_until: "2025-01-31",
      reconciled_balance: 1000,
    });
    expect(result).toBeNull();
  });

  it("returns null when difference is within tolerance (0.01)", async () => {
    mockRpc.mockResolvedValue({ data: 1000.005, error: null });

    const result = await checkAccountDiscrepancy({
      id: "acct-1",
      name: "Nubank",
      reconciled_until: "2025-01-31",
      reconciled_balance: 1000,
    });
    expect(result).toBeNull();
  });

  it("returns discrepancy when difference exceeds tolerance", async () => {
    mockRpc.mockResolvedValue({ data: 1050, error: null });

    const result = await checkAccountDiscrepancy({
      id: "acct-1",
      name: "Nubank",
      reconciled_until: "2025-01-31",
      reconciled_balance: 1000,
    });

    expect(result).not.toBeNull();
    expect(result!.accountId).toBe("acct-1");
    expect(result!.accountName).toBe("Nubank");
    expect(result!.reconciledUntil).toBe("2025-01-31");
    expect(result!.reconciledBalance).toBe(1000);
    expect(result!.calculatedBalance).toBe(1050);
    expect(result!.difference).toBe(50);
  });

  it("calls RPC with correct parameters", async () => {
    mockRpc.mockResolvedValue({ data: 1000, error: null });

    await checkAccountDiscrepancy({
      id: "acct-123",
      name: "Test",
      reconciled_until: "2025-06-15",
      reconciled_balance: 1000,
    });

    expect(mockRpc).toHaveBeenCalledWith("account_balance_at", {
      account_uuid: "acct-123",
      at_date: "2025-06-15",
    });
  });

  it("returns null when RPC returns null data", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await checkAccountDiscrepancy({
      id: "acct-1",
      name: "Nubank",
      reconciled_until: "2025-01-31",
      reconciled_balance: 1000,
    });
    expect(result).toBeNull();
  });

  it("handles negative discrepancy", async () => {
    mockRpc.mockResolvedValue({ data: 950, error: null });

    const result = await checkAccountDiscrepancy({
      id: "acct-1",
      name: "Nubank",
      reconciled_until: "2025-01-31",
      reconciled_balance: 1000,
    });

    expect(result).not.toBeNull();
    expect(result!.difference).toBe(-50);
  });
});
