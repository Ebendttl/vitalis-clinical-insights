import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./use-debounced-value";

describe("useDebouncedValue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("only emits the last value once input settles", () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 150), { initialProps: { v: "a" } });
    rerender({ v: "an" });
    rerender({ v: "ann" });
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe("a");
    act(() => vi.advanceTimersByTime(60));
    expect(result.current).toBe("ann");
  });
});
