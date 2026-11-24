import { type ReactNode, Suspense } from "react";
import { AccountMenu } from "@/components/shell/account-menu";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { CommandPalette } from "@/features/command-palette/components/command-palette";
import { requireClinician } from "@/features/auth/server/session";

async function Account() {
  const clinician = await requireClinician();
  return <AccountMenu name={clinician.full_name} detail={clinician.specialty} isGuest={clinician.is_guest} />;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <a
        href="#main"
        className="fixed top-2 left-2 z-50 -translate-y-16 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:translate-y-0"
      >
        Skip to content
      </a>
      <AppSidebar
        account={
          <Suspense fallback={<Skeleton className="h-11 w-full" />}>
            <Account />
          </Suspense>
        }
      />
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
        {children}
      </main>
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>
    </div>
  );
}
