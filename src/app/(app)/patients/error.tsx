"use client";

import { RouteError } from "@/components/feedback/route-error";

export default function PatientsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} title="The patient directory couldn't load" />;
}
