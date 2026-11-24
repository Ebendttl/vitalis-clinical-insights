"use client";

import { ArrowRightIcon, MailCheckIcon, UserRoundIcon } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type SignInState, sendMagicLink, signInAsGuest } from "../server/actions";

const initial: SignInState = { status: "idle" };

export function SignInForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [state, formAction, pending] = useActionState(sendMagicLink, initial);
  const [guestState, guestAction, guestPending] = useActionState(signInAsGuest, initial);

  if (state.status === "sent") {
    return (
      <div role="status" className="animate-fade-in space-y-3 rounded-lg bg-accent p-5 text-accent-foreground">
        <MailCheckIcon className="size-6" aria-hidden />
        <p className="font-medium">Check your inbox</p>
        <p className="text-sm">
          We sent a sign-in link to <strong>{state.email}</strong>. It expires in one hour.
        </p>
      </div>
    );
  }

  const error = state.status === "error" ? state.message : guestState.status === "error" ? guestState.message : linkError ? "That link has expired or was already used. Request a new one." : null;

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-3" noValidate>
        <input type="hidden" name="next" value={next ?? "/patients"} />
        <label htmlFor="email" className="block text-sm font-medium">
          Work email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@clinic.org"
          defaultValue={state.email}
          aria-invalid={state.status === "error" || undefined}
          aria-describedby={error ? "sign-in-error" : undefined}
          className="h-10"
        />
        {error && (
          <p id="sign-in-error" role="alert" className="text-sm text-critical">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Sending link…" : "Email me a sign-in link"}
          {!pending && <ArrowRightIcon />}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <form action={guestAction}>
        <Button type="submit" variant="outline" size="lg" className="w-full" disabled={guestPending}>
          <UserRoundIcon />
          {guestPending ? "Preparing demo…" : "Explore as a guest clinician"}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">Guests get a private panel of 30 synthetic patients.</p>
      </form>
    </div>
  );
}
