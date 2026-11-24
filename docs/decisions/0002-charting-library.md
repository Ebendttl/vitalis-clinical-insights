# 0002 — Charting: visx over Recharts

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

Charts need reference bands, critical thresholds, out-of-range markers, a previous-period overlay, keyboard exploration and a data-table alternative. The signature patient header shows five sparklines, and the directory page has a 200 KB JavaScript budget.

## Options

| | Recharts | visx |
|---|---|---|
| Speed to first chart | Fast (declarative components) | Slower (primitives) |
| Server rendering | Needs the client; `ResponsiveContainer` measures after mount (layout shift) | Pure SVG maths, so it renders in Server Components |
| Bundle | Monolithic, roughly 100 KB+ gzipped | Tree-shaken per package (`scale`, `shape`, `axis`) |
| Custom interaction / a11y | Works around built-in tooltip and legend behaviour | We own every element |

## Decision

**visx.** The deciding factor is that sparklines render on the server as plain SVG and cost no client JavaScript. The full charts are client components with a fixed height (no CLS), a keyboard cursor that announces readings through a polite live region, and a "Table" view showing the same series as a real `<table>`.

## Consequences

More code to own (`vital-chart.tsx` is about 250 lines), and every behaviour is deliberate and testable.
