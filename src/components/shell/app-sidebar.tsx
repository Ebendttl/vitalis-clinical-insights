"use client";

import { MenuIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

export const OPEN_PALETTE_EVENT = "vitalis:open-palette";

function toggleCollapsed() {
  const root = document.documentElement;
  const next = root.dataset.sidebar === "collapsed" ? "expanded" : "collapsed";
  root.dataset.sidebar = next;
  try {
    localStorage.setItem("vitalis:sidebar", next);
  } catch {
    // Private mode: collapse still works for this page view.
  }
}

function NavLinks({ onNavigate, collapsible }: { onNavigate?: () => void; collapsible: boolean }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const link = (
          <Link
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors duration-(--duration-fast) hover:bg-muted hover:text-foreground",
              active && "bg-card text-foreground shadow-(--shadow-card)",
              collapsible && "collapsed:justify-center collapsed:px-0",
            )}
          >
            <Icon className={cn("size-4 shrink-0", active && "text-primary")} aria-hidden />
            <span className={cn(collapsible && "collapsed:sr-only")}>{label}</span>
          </Link>
        );
        return <li key={href}>{collapsible ? <Tooltip content={label} side="right" className="hidden collapsed:block">{link}</Tooltip> : link}</li>;
      })}
    </ul>
  );
}

function SearchButton({ collapsible }: { collapsible: boolean }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
      className={cn(
        "flex h-9 w-full items-center gap-2 rounded-md border border-input/60 bg-card px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
        collapsible && "collapsed:justify-center collapsed:px-0",
      )}
      aria-keyshortcuts="Control+K Meta+K"
    >
      <SearchIcon className="size-4 shrink-0" aria-hidden />
      <span className={cn("flex-1 text-left", collapsible && "collapsed:sr-only")}>Search</span>
      <kbd className={cn("rounded border bg-muted px-1.5 text-xs", collapsible && "collapsed:hidden")}>⌘K</kbd>
    </button>
  );
}

/**
 * Desktop: a sticky, collapsible rail (state lives on <html data-sidebar>, set
 * before paint). Mobile: a top bar with a drawer containing the same navigation.
 */
export function AppSidebar({ account }: { account: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <aside
        aria-label="Primary"
        className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-4 border-r bg-sidebar px-3 py-4 transition-[width] duration-(--duration-base) ease-(--ease-out-soft) lg:flex collapsed:w-16"
      >
        <div className="flex h-9 items-center justify-between collapsed:justify-center">
          <Link href="/patients" className="rounded-md" aria-label="Vitalis home">
            <Logo className="collapsed:hidden" />
            <LogoMark className="hidden collapsed:block" />
          </Link>
        </div>
        <SearchButton collapsible />
        <nav aria-label="Main" className="flex-1">
          <NavLinks collapsible />
        </nav>
        <div className="flex flex-col gap-2 border-t pt-3">
          <div className="flex items-center justify-between gap-1 collapsed:flex-col">
            <ThemeToggle />
            <Button variant="ghost" size="icon-sm" onClick={toggleCollapsed} aria-label="Toggle sidebar">
              <PanelLeftCloseIcon className="collapsed:hidden" aria-hidden />
              <PanelLeftOpenIcon className="hidden collapsed:block" aria-hidden />
            </Button>
          </div>
          {account}
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur lg:hidden">
        <Button variant="ghost" size="icon-sm" onClick={() => setDrawerOpen(true)} aria-label="Open navigation">
          <MenuIcon aria-hidden />
        </Button>
        <Link href="/patients" aria-label="Vitalis home" className="rounded-md">
          <Logo />
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Search"
            onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
          >
            <SearchIcon aria-hidden />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="top-0 left-0 h-dvh w-72 max-w-[85vw] translate-x-0 rounded-none rounded-r-xl p-4">
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <div className="flex h-full flex-col gap-4">
            <Logo />
            <nav aria-label="Main" className="flex-1">
              <NavLinks collapsible={false} onNavigate={() => setDrawerOpen(false)} />
            </nav>
            <div className="border-t pt-3">{account}</div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
