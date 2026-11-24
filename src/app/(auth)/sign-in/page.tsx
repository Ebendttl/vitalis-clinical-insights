import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { SignInShowcase } from "@/features/auth/components/sign-in-showcase";

export const metadata: Metadata = { title: "Sign in" };

async function SignInFormWithParams({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  return <SignInForm next={next} linkError={params.error === "link"} />;
}

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="flex flex-col justify-between gap-10 px-6 py-8 sm:px-12 lg:py-12">
        <Logo />
        <div className="mx-auto w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground">Sign in to review your patients&rsquo; vitals, diagnoses and labs.</p>
          </div>
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <SignInFormWithParams searchParams={searchParams} />
          </Suspense>
        </div>
        <p className="text-xs text-muted-foreground">
          Vitalis is a portfolio demonstration. All patients are synthetic. Nothing here is medical advice.
        </p>
      </section>
      <SignInShowcase />
    </main>
  );
}
