import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { renderWithProviders } from "@/test/render";
import { computeRisk } from "../lib/risk";
import { buildSnapshot } from "../lib/snapshot";
import { RiskRing } from "./risk-ring";
import { VitalDataTable } from "./vital-data-table";
import { VitalTile } from "./vital-tile";

vi.mock("next/link", () => ({ default: (props: React.ComponentProps<"a">) => <a {...props} /> }));

const now = Date.parse("2026-11-24T12:00:00Z");
const at = (d: number) => new Date(now - d * 86_400_000).toISOString();

describe("VitalTile", () => {
  it("exposes value, status and trend in its accessible name", () => {
    const readings = [
      ...Array.from({ length: 20 }, (_, i) => ({ type: "heart_rate" as const, value: 70, recordedAt: at(i + 8) })),
      { type: "heart_rate" as const, value: 135, recordedAt: at(1) },
    ];
    const hr = buildSnapshot(readings, { ageYears: 40, activeChronicConditions: 0 }, now).kinds.find((k) => k.kind === "heart_rate");
    if (!hr) throw new Error("missing kind");
    render(<VitalTile snapshot={hr} href="/x" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAccessibleName(/Heart rate 135 bpm, Critically high, trending up by 65/);
  });
});

describe("VitalDataTable", () => {
  it("lists readings newest first with paired values and status", () => {
    const t1 = Date.parse(at(2));
    const t2 = Date.parse(at(1));
    render(
      <VitalDataTable
        caption="Blood pressure readings"
        series={[
          { type: "bp_systolic", points: [{ t: t1, value: 118 }, { t: t2, value: 185 }] },
          { type: "bp_diastolic", points: [{ t: t1, value: 76 }, { t: t2, value: 95 }] },
        ]}
      />,
    );
    const table = screen.getByRole("table", { name: "Blood pressure readings" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("185");
    expect(rows[0]).toHaveTextContent("95");
    expect(rows[0]).toHaveTextContent("Critically high");
    expect(rows[1]).toHaveTextContent("In range");
    expect(screen.getByRole("region", { name: /scrollable/ })).toHaveAttribute("tabindex", "0");
  });
});

describe("SegmentedControl", () => {
  function Harness() {
    const [value, setValue] = useState<"a" | "b" | "c">("a");
    return (
      <SegmentedControl
        label="Range"
        value={value}
        onValueChange={setValue}
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B" },
          { value: "c", label: "C" },
        ]}
      />
    );
  }

  it("supports arrow keys and never deselects", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const a = screen.getByRole("radio", { name: "A" });
    await user.click(a);
    expect(a).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "B" })).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("radio", { name: "B" })).toHaveAttribute("aria-checked", "true");
  });
});

describe("RiskRing", () => {
  it("announces score, level and factors to screen readers", () => {
    const risk = computeRisk({ latest: { spo2: 91, heart_rate: 115 }, ageYears: 70, activeChronicConditions: 0 });
    renderWithProviders(<RiskRing risk={risk} />);
    expect(screen.getByText(/Risk score 6 of 20, Elevated\. Factors: SpO₂ plus 3, Heart rate plus 2, Age 65\+ plus 1/)).toBeInTheDocument();
  });
});
