"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getBrowserClient } from "@/lib/supabase/browser";
import { directoryKey, fetchDirectory } from "../lib/directory-query";
import { directoryParsers } from "../lib/search-params";
import type { DirectoryFilters } from "../schemas";

export const SEARCH_DEBOUNCE_MS = 150;

/** URL-backed filter state. History is replaced, not pushed, so Back leaves the page. */
export function useDirectoryFilters() {
  return useQueryStates(directoryParsers, { history: "replace", clearOnDefault: true });
}

export function useDirectory(filters: DirectoryFilters) {
  const q = useDebouncedValue(filters.q, SEARCH_DEBOUNCE_MS);
  const effective = { ...filters, q };
  return useQuery({
    queryKey: directoryKey(effective),
    queryFn: ({ signal }) => fetchDirectory(getBrowserClient(), effective, signal),
    // Keep showing the previous results while the next query runs: no flash of empty list.
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
