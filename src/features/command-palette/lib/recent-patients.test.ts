import { beforeEach, describe, expect, it } from "vitest";
import { readRecentPatients, rememberPatient } from "./recent-patients";

describe("recent patients", () => {
  beforeEach(() => localStorage.clear());

  it("keeps most recent first, de-duplicated and capped", () => {
    for (let i = 0; i < 8; i++) rememberPatient({ id: String(i), name: `P${i}`, mrn: `M${i}` });
    rememberPatient({ id: "3", name: "P3", mrn: "M3" });
    const ids = readRecentPatients().map((p) => p.id);
    expect(ids).toEqual(["3", "7", "6", "5", "4", "2"]);
  });

  it("ignores corrupted storage", () => {
    localStorage.setItem("vitalis:recent-patients", "{not json");
    expect(readRecentPatients()).toEqual([]);
    localStorage.setItem("vitalis:recent-patients", JSON.stringify([{ id: 1 }]));
    expect(readRecentPatients()).toEqual([]);
  });
});
