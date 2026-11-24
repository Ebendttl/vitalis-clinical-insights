import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { DirectoryToolbar } from "./directory-toolbar";

describe("DirectoryToolbar", () => {
  it("syncs search and risk filters to the URL", async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    renderWithProviders(<DirectoryToolbar conditions={["Asthma"]} />, { onUrlUpdate });

    await user.type(screen.getByRole("searchbox", { name: /search patients/i }), "ann");
    await user.click(screen.getByRole("button", { name: /High/ }));

    const last = onUrlUpdate.mock.calls.at(-1)?.[0] as { searchParams: URLSearchParams };
    expect(last.searchParams.get("q")).toBe("ann");
    expect(last.searchParams.get("risk")).toBe("critical");
    expect(screen.getByRole("button", { name: /Clear/ })).toBeVisible();
  });

  it("focuses search with the / shortcut", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DirectoryToolbar conditions={[]} />);
    await user.keyboard("/");
    expect(screen.getByRole("searchbox", { name: /search patients/i })).toHaveFocus();
  });
});
