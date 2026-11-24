import { describe, expect, it } from "vitest";
import { DirectoryFilters } from "../schemas";
import { dobBounds, normalizeFilters, sanitizeSearch } from "./directory-query";

describe("sanitizeSearch", () => {
  it("strips PostgREST control characters but keeps names and MRNs", () => {
    expect(sanitizeSearch("O'Brien")).toBe("O'Brien");
    expect(sanitizeSearch("VTL-104")).toBe("VTL-104");
    expect(sanitizeSearch("ann),id.eq.(x")).toBe("annid.eq.x");
    expect(sanitizeSearch("  José   Núñez ")).toBe("José Núñez");
    expect(sanitizeSearch("%_*")).toBe("");
  });
});

describe("dobBounds", () => {
  const now = new Date("2026-11-24T00:00:00Z");
  it("maps age bands to inclusive date-of-birth ranges", () => {
    expect(dobBounds("65+", now)).toEqual({ max: "1961-11-24" });
    expect(dobBounds("18-39", now)).toEqual({ min: "1986-11-25", max: "2008-11-24" });
    expect(dobBounds("40-64", now)).toEqual({ min: "1961-11-25", max: "1986-11-24" });
  });
});

describe("normalizeFilters", () => {
  it("makes equivalent filters produce equal keys", () => {
    const a = normalizeFilters(DirectoryFilters.parse({ q: " ann ", risk: ["critical", "low"] }));
    const b = normalizeFilters(DirectoryFilters.parse({ q: "ann", risk: ["low", "critical"] }));
    expect(a).toEqual(b);
  });
});
