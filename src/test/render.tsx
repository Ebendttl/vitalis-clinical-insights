import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";
import { Tooltip } from "radix-ui";
import type { ReactElement, ReactNode } from "react";

type AdapterOptions = NonNullable<Parameters<typeof withNuqsTestingAdapter>[0]>;
type Options = Pick<AdapterOptions, "onUrlUpdate"> & { searchParams?: string };

/** Renders with the same providers the app uses (query cache, URL state, tooltips). */
export function renderWithProviders(ui: ReactElement, { searchParams = "", onUrlUpdate }: Options = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Nuqs = withNuqsTestingAdapter({ searchParams, onUrlUpdate, hasMemory: true });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Nuqs>
        <Tooltip.Provider>{children}</Tooltip.Provider>
      </Nuqs>
    </QueryClientProvider>
  );
  return render(ui, { wrapper: Wrapper });
}
