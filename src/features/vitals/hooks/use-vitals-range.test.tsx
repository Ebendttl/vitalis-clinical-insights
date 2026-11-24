import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { presetRange } from "../lib/ranges";

const { fetchVitalsMonth } = vi.hoisted(() => ({
  fetchVitalsMonth: vi.fn(async (...args: unknown[]) => {
    const month = typeof args[2] === "string" ? args[2] : "2026-01";
    return [
      {
        id: Number(month.replace("-", "")),
        patientId: "p1",
        type: "heart_rate" as const,
        value: 70,
        unit: "bpm",
        recordedAt: `${month}-15T08:00:00.000Z`,
        source: "clinic" as const,
      },
    ];
  }),
}));

vi.mock("@/lib/supabase/browser", () => ({ getBrowserClient: () => ({}) }));
vi.mock("../lib/month-query", async (orig) => ({
  ...(await orig<typeof import("../lib/month-query")>()),
  fetchVitalsMonth,
}));

import { useVitalsRange } from "./use-vitals-range";

describe("useVitalsRange", () => {
  it("never refetches months already cached when switching ranges", async () => {
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const now = new Date("2026-11-24T12:00:00Z");
    vi.setSystemTime(now);

    const { result, rerender } = renderHook(({ preset }) => useVitalsRange("p1", presetRange(preset, now)), {
      wrapper,
      initialProps: { preset: "12m" as "12m" | "3m" | "6m" },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const monthsFetched = new Set(fetchVitalsMonth.mock.calls.map((c) => c[2]).filter(Boolean));
    expect(monthsFetched.size).toBe(13);
    const callsAfter12m = fetchVitalsMonth.mock.calls.length;

    rerender({ preset: "3m" });
    rerender({ preset: "6m" });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // 3m and 6m are subsets of 12m; only the current month could refresh, and it's still fresh.
    expect(fetchVitalsMonth.mock.calls.length).toBe(callsAfter12m);
    expect(result.current.readings.length).toBeGreaterThan(0);
    vi.useRealTimers();
  });
});
