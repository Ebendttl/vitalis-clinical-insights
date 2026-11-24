"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ActivityIcon,
  AlertTriangleIcon,
  FlaskConicalIcon,
  HeartPulseIcon,
  HistoryIcon,
  LogOutIcon,
  MoonIcon,
  SparklesIcon,
  StethoscopeIcon,
  UserRoundIcon,
  UsersRoundIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { OPEN_PALETTE_EVENT } from "@/components/shell/app-sidebar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { signOut } from "@/features/auth/server/actions";
import { RiskBadge } from "@/features/patients/components/risk-badge";
import { fetchDirectory } from "@/features/patients/lib/directory-query";
import { DirectoryFilters } from "@/features/patients/schemas";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getBrowserClient } from "@/lib/supabase/browser";
import { type RecentPatient, readRecentPatients } from "../lib/recent-patients";

export const OPEN_SUMMARY_EVENT = "vitalis:open-summary";
const PATIENT_ROUTE = /^\/patients\/([0-9a-f-]{36})/;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const q = useDebouncedValue(search.trim(), 120);
  const currentPatientId = PATIENT_ROUTE.exec(pathname)?.[1];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch("");
  };
  // Re-read on every open; the palette only renders client-side once opened.
  const recent: RecentPatient[] = useMemo(() => (open ? readRecentPatients() : []), [open]);

  const results = useQuery({
    queryKey: ["palette", q],
    queryFn: ({ signal }) => fetchDirectory(getBrowserClient(), DirectoryFilters.parse({ q, sort: "name" }), signal, 8),
    enabled: open && q.length > 0,
    staleTime: 30_000,
  });

  const run = (fn: () => void) => {
    setOpen(false);
    setSearch("");
    fn();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="max-w-xl overflow-hidden p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">Search patients or run an action. Use arrow keys to move, Enter to select.</DialogDescription>
        {/* Server-side search for patients, so cmdk's own fuzzy filter is off. */}
        <Command shouldFilter={false} loop>
          <CommandInput value={search} onValueChange={setSearch} placeholder="Search patients or type a command…" />
          <CommandList>
            <CommandEmpty>{results.isFetching ? "Searching…" : "No matches."}</CommandEmpty>

            {q.length > 0 && results.data && results.data.patients.length > 0 && (
              <CommandGroup heading={`Patients · ${results.data.total}`}>
                {results.data.patients.map((p) => (
                  <CommandItem key={p.id} value={`patient-${p.id}`} onSelect={() => run(() => router.push(`/patients/${p.id}`))}>
                    <UserRoundIcon aria-hidden />
                    <span className="flex-1 truncate">{p.full_name}</span>
                    <span className="num text-xs text-muted-foreground">{p.mrn}</span>
                    <RiskBadge level={p.risk_level} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {q.length === 0 && recent.length > 0 && (
              <CommandGroup heading="Recently viewed">
                {recent.map((p) => (
                  <CommandItem key={p.id} value={`recent-${p.id}`} onSelect={() => run(() => router.push(`/patients/${p.id}`))}>
                    <HistoryIcon aria-hidden />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="num text-xs text-muted-foreground">{p.mrn}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {q.length === 0 && currentPatientId && (
              <CommandGroup heading="This patient">
                <CommandItem value="patient-vitals" onSelect={() => run(() => router.push(`/patients/${currentPatientId}/vitals`))}>
                  <HeartPulseIcon aria-hidden /> Vitals analytics
                </CommandItem>
                <CommandItem value="patient-dx" onSelect={() => run(() => router.push(`/patients/${currentPatientId}/diagnoses`))}>
                  <StethoscopeIcon aria-hidden /> Diagnoses
                </CommandItem>
                <CommandItem value="patient-labs" onSelect={() => run(() => router.push(`/patients/${currentPatientId}/labs`))}>
                  <FlaskConicalIcon aria-hidden /> Lab results
                </CommandItem>
                <CommandItem
                  value="patient-summary"
                  onSelect={() =>
                    run(() => {
                      router.push(`/patients/${currentPatientId}`);
                      window.dispatchEvent(new Event(OPEN_SUMMARY_EVENT));
                    })
                  }
                >
                  <SparklesIcon aria-hidden /> Generate AI summary
                </CommandItem>
              </CommandGroup>
            )}

            {q.length === 0 && (
              <CommandGroup heading="Go to">
                <CommandItem value="go-patients" onSelect={() => run(() => router.push("/patients"))}>
                  <UsersRoundIcon aria-hidden /> All patients
                </CommandItem>
                <CommandItem value="go-critical" onSelect={() => run(() => router.push("/patients?risk=critical"))}>
                  <AlertTriangleIcon aria-hidden /> High-risk patients
                </CommandItem>
                <CommandItem value="go-activity" onSelect={() => run(() => router.push("/activity"))}>
                  <ActivityIcon aria-hidden /> My audit trail
                </CommandItem>
                <CommandItem value="toggle-theme" onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}>
                  <MoonIcon aria-hidden /> Toggle dark mode
                </CommandItem>
                <CommandItem value="sign-out" onSelect={() => run(() => void signOut())}>
                  <LogOutIcon aria-hidden /> Sign out
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
          <div className="flex items-center gap-3 border-t px-4 py-2 text-xs text-muted-foreground" aria-hidden>
            <span>
              <kbd className="rounded border bg-muted px-1">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="rounded border bg-muted px-1">↵</kbd> open
            </span>
            <span>
              <kbd className="rounded border bg-muted px-1">esc</kbd> close
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
