# 0001 — State management: RSC for reads, TanStack Query for client server-state, URL for view state

- **Status:** Accepted
- **Date:** 2026-11-24

## Context

Vitalis has three kinds of state:

1. **Server data rendered once per navigation** (patient profile, diagnoses, labs).
2. **Server data the client keeps updating** (directory search, vitals across ranges, live readings).
3. **View state people want to share** (search query, filters, sort, vitals range, compare mode).

A single global store (Redux, Zustand) would duplicate server data, need manual invalidation and make server rendering harder.

## Decision

- **React Server Components** fetch read-mostly data with the request-scoped Supabase client, so RLS applies. They're wrapped in `<Suspense>` so the static shell streams first (Next 16 `cacheComponents`).
- **TanStack Query** owns client server-state. The directory's first page is prefetched on the server with the *same* query function and key and handed over through `HydrationBoundary`, so there's no client waterfall on first paint.
- **Vitals are cached per calendar month** (`['vitals', patientId, 'YYYY-MM']`). A 3/6/12-month view is the union of its months. Past months use `staleTime: Infinity`, so switching ranges never refetches. A unit test and a Playwright test both prove this.
- **Realtime writes into the cache** (`setQueryData`) rather than triggering refetches, so only components subscribed to those keys re-render.
- **URL state through `nuqs`** for filters, ranges and compare mode. One parser definition serves both the server loader and the client hook, so bookmarks and the live UI can't drift.

## Consequences

- No global store, and no stale copies of server data.
- Cache keys are a public contract between features, so they live in `features/vitals/lib/query-keys.ts`.
- Optimistic UI uses React 19's `useOptimistic` for single mutations (diagnosis status), not TanStack mutations, because the source of truth is a server-rendered prop.
