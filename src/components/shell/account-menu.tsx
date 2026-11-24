"use client";

import { ChevronsUpDownIcon, LogOutIcon, ScrollTextIcon } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/features/auth/server/actions";
import { initials } from "@/lib/format";

export function AccountMenu({ name, detail, isGuest }: { name: string; detail: string; isGuest: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left hover:bg-muted collapsed:justify-center">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-xs font-semibold text-background" aria-hidden>
          {initials(name)}
        </span>
        <span className="min-w-0 flex-1 collapsed:sr-only">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">{isGuest ? "Guest session" : detail}</span>
        </span>
        <ChevronsUpDownIcon className="size-4 text-muted-foreground collapsed:hidden" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel>Signed in as {name}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/activity">
            <ScrollTextIcon /> My audit trail
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
